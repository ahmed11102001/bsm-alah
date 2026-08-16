import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import prisma from "@/lib/prisma";
import { processInteractiveButtonClick } from "@/lib/interactive-menu";

describe("Integration: Interactive Menu Button Processing (Real DB)", () => {
  let userId: string;
  let contactId: string;
  let waAccountId: string;
  let phoneNumberId: string;
  let ruleId: string;
  let nextRuleId: string;

  const BUTTON_A = { buttonId: "btn_a", text: "الأسعار", nextStepId: null as string | null };
  const BUTTON_B = { buttonId: "btn_b", text: "المنتجات", nextStepId: null as string | null };

  async function createWaitingInteraction(buttons = [BUTTON_A, BUTTON_B]) {
    const interaction = await prisma.automationInteraction.create({
      data: {
        userId,
        contactId,
        whatsappAccountId: waAccountId,
        phoneNumberId,
        automationRuleId: ruleId,
        buttonSnapshot: buttons as any,
        state: "WAITING",
      },
    });
    return interaction;
  }

  beforeEach(async () => {
    phoneNumberId = `pn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const user = await prisma.user.create({
      data: { email: `test-${Date.now()}-${Math.random()}@test.com`, password: "hash", name: "Test User" },
    });
    userId = user.id;

    const waAccount = await prisma.whatsAppAccount.create({
      data: {
        userId,
        phoneNumberId,
        wabaId: `waba-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        accessToken: "encrypted_token",
      },
    });
    waAccountId = waAccount.id;

    const contact = await prisma.contact.create({
      data: { userId, phone: "201000000001", name: "Test Contact" },
    });
    contactId = contact.id;

    const rule = await prisma.automationRule.create({
      data: {
        userId,
        name: "Welcome Menu",
        triggerType: "FIRST_MESSAGE",
        replyType: "INTERACTIVE_MENU",
        interactiveConfig: { body: "اختار الخدمة", buttons: [BUTTON_A, BUTTON_B] } as any,
      },
    });
    ruleId = rule.id;

    const nextRule = await prisma.automationRule.create({
      data: {
        userId,
        name: "Pricing Step",
        triggerType: "KEYWORD",
        triggerValue: "pricing",
        replyType: "TEXT",
        replyContent: "الأسعار كالتالي...",
      },
    });
    nextRuleId = nextRule.id;
  }, 30000);

  afterEach(async () => {
    await prisma.automationInteraction.deleteMany({ where: { userId } });
    await prisma.automationRule.deleteMany({ where: { userId } });
    await prisma.contact.deleteMany({ where: { userId } });
    await prisma.whatsAppAccount.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }, 30000);

  it("claims the interaction and executes the next step exactly once on concurrent duplicate button clicks", async () => {
    await createWaitingInteraction([{ ...BUTTON_A, nextStepId: nextRuleId }, BUTTON_B]);

    const executeNextStep = vi.fn().mockResolvedValue({ ok: true });
    const eventId = `evt-${Date.now()}`;

    const params = {
      contactId,
      userId,
      phoneNumberId,
      buttonId: "btn_a",
      eventId,
      from: "201000000001",
    };

    // Two "simultaneous" webhook deliveries for the SAME Meta event id (Meta retry scenario)
    const [res1, res2] = await Promise.all([
      processInteractiveButtonClick(params, { executeNextStep }),
      processInteractiveButtonClick(params, { executeNextStep }),
    ]);

    // Exactly one of the two should have actually claimed + executed
    const outcomes = [res1.outcome, res2.outcome];
    expect(executeNextStep).toHaveBeenCalledTimes(1);
    expect(outcomes.filter((o) => o === "completed" || o === "claimed")).toHaveLength(1);

    const interaction = await prisma.automationInteraction.findFirst({ where: { userId, contactId } });
    expect(interaction?.state).toBe("COMPLETED");
  });

  it("ignores a genuine duplicate Meta webhook event (same eventId, sequential delivery)", async () => {
    await createWaitingInteraction([{ ...BUTTON_A, nextStepId: null }, BUTTON_B]);

    const executeNextStep = vi.fn().mockResolvedValue({ ok: true });
    const eventId = `evt-dup-${Date.now()}`;
    const params = { contactId, userId, phoneNumberId, buttonId: "btn_a", eventId, from: "201000000001" };

    const first = await processInteractiveButtonClick(params, { executeNextStep });
    const second = await processInteractiveButtonClick(params, { executeNextStep });

    expect(first.outcome).toBe("completed");
    expect(second.outcome).toBe("duplicate");
    expect(executeNextStep).toHaveBeenCalledTimes(0); // no nextStepId on this button
  });

  it("marks a button not present in the snapshot as stale and takes no action", async () => {
    await createWaitingInteraction([BUTTON_A]); // only btn_a in snapshot

    const executeNextStep = vi.fn().mockResolvedValue({ ok: true });
    const result = await processInteractiveButtonClick(
      { contactId, userId, phoneNumberId, buttonId: "btn_ghost", eventId: `evt-${Date.now()}`, from: "201000000001" },
      { executeNextStep },
    );

    expect(result.outcome).toBe("stale_button");
    expect(executeNextStep).not.toHaveBeenCalled();

    const interaction = await prisma.automationInteraction.findFirst({ where: { userId, contactId } });
    expect(interaction?.state).toBe("STALE");
  });

  it("ignores a button click when the interaction was already SUPERSEDED (customer typed text instead)", async () => {
    const interaction = await createWaitingInteraction();
    await prisma.automationInteraction.update({ where: { id: interaction.id }, data: { state: "SUPERSEDED" } });

    const executeNextStep = vi.fn().mockResolvedValue({ ok: true });
    const result = await processInteractiveButtonClick(
      { contactId, userId, phoneNumberId, buttonId: "btn_a", eventId: `evt-${Date.now()}`, from: "201000000001" },
      { executeNextStep },
    );

    expect(result.outcome).toBe("no_waiting");
    expect(executeNextStep).not.toHaveBeenCalled();

    const stillSuperseded = await prisma.automationInteraction.findUnique({ where: { id: interaction.id } });
    expect(stillSuperseded?.state).toBe("SUPERSEDED");
  });

  it("marks the interaction FAILED and calls notifyFailure when the next step no longer exists", async () => {
    await createWaitingInteraction([{ ...BUTTON_A, nextStepId: "does-not-exist" }, BUTTON_B]);

    const executeNextStep = vi.fn().mockResolvedValue({ ok: true });
    const notifyFailure = vi.fn().mockResolvedValue(undefined);

    const result = await processInteractiveButtonClick(
      { contactId, userId, phoneNumberId, buttonId: "btn_a", eventId: `evt-${Date.now()}`, from: "201000000001" },
      { executeNextStep, notifyFailure },
    );

    expect(result.outcome).toBe("failed");
    expect(executeNextStep).not.toHaveBeenCalled();
    expect(notifyFailure).toHaveBeenCalledTimes(1);

    const interaction = await prisma.automationInteraction.findFirst({ where: { userId, contactId } });
    expect(interaction?.state).toBe("FAILED");
  });

  it("marks the interaction FAILED and calls notifyFailure when next-step execution throws", async () => {
    await createWaitingInteraction([{ ...BUTTON_A, nextStepId: nextRuleId }, BUTTON_B]);

    const executeNextStep = vi.fn().mockRejectedValue(new Error("WhatsApp send failed"));
    const notifyFailure = vi.fn().mockResolvedValue(undefined);

    const result = await processInteractiveButtonClick(
      { contactId, userId, phoneNumberId, buttonId: "btn_a", eventId: `evt-${Date.now()}`, from: "201000000001" },
      { executeNextStep, notifyFailure },
    );

    expect(result.outcome).toBe("failed");
    expect(notifyFailure).toHaveBeenCalledWith(expect.any(Object), expect.stringContaining("WhatsApp send failed"));

    const interaction = await prisma.automationInteraction.findFirst({ where: { userId, contactId } });
    expect(interaction?.state).toBe("FAILED");
  });

  it("does not execute a button click for another tenant's phoneNumberId (multi-tenant isolation)", async () => {
    await createWaitingInteraction([{ ...BUTTON_A, nextStepId: nextRuleId }, BUTTON_B]);

    const executeNextStep = vi.fn().mockResolvedValue({ ok: true });
    const result = await processInteractiveButtonClick(
      {
        contactId,
        userId,
        phoneNumberId: "some-other-tenant-phone-id",
        buttonId: "btn_a",
        eventId: `evt-${Date.now()}`,
        from: "201000000001",
      },
      { executeNextStep },
    );

    expect(result.outcome).toBe("tenant_mismatch");
    expect(executeNextStep).not.toHaveBeenCalled();
  });

  it("calls notifyButtonSelected only when notifyOnSelect is true on the matched button", async () => {
    await createWaitingInteraction([
      { ...BUTTON_A, nextStepId: null, notifyOnSelect: true } as any,
      { ...BUTTON_B, nextStepId: null, notifyOnSelect: false } as any,
    ]);

    const executeNextStep = vi.fn().mockResolvedValue({ ok: true });
    const notifyButtonSelected = vi.fn().mockResolvedValue(undefined);

    await processInteractiveButtonClick(
      { contactId, userId, phoneNumberId, buttonId: "btn_a", eventId: `evt-${Date.now()}`, from: "201000000001" },
      { executeNextStep, notifyButtonSelected },
    );

    expect(notifyButtonSelected).toHaveBeenCalledTimes(1);
  });
});