// src/lib/interactive-menu.ts
// Interactive Menu button interaction — atomic claim, edge cases, notifications hook

import prisma from "@/lib/prisma";
import { ReplyType } from "@/types/enums";

export interface InteractiveButtonSnapshot {
  buttonId: string;
  text: string;
  nextStepId?: string | null;
  notifyOnSelect?: boolean;
}

export type ButtonInteractionOutcome =
  | "duplicate"
  | "no_waiting"
  | "tenant_mismatch"
  | "stale_button"
  | "claimed"
  | "claim_lost"
  | "completed"
  | "failed";

export interface ProcessButtonParams {
  contactId: string;
  userId: string;
  phoneNumberId: string;
  buttonId: string;
  eventId: string;
  from: string;
}

export interface ButtonInteractionContext {
  interactionId: string;
  automationRuleId: string;
  automationName: string;
  contactName: string;
  contactId: string;
  button: InteractiveButtonSnapshot;
}

export interface ProcessButtonDeps {
  executeNextStep: (stepId: string) => Promise<{ ok: boolean; error?: string }>;
  notifyButtonSelected?: (ctx: ButtonInteractionContext) => Promise<void>;
  /** Called when the next step is missing/disabled or execution fails — surfaces the FAILED state to the admin. */
  notifyFailure?: (ctx: ButtonInteractionContext, reason: string) => Promise<void>;
}

function parseSnapshot(raw: unknown): InteractiveButtonSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw as InteractiveButtonSnapshot[];
}

/** Mark all WAITING interactions for a contact as SUPERSEDED (e.g. customer sent text). */
export async function supersedeWaitingInteractions(contactId: string, userId: string): Promise<void> {
  await prisma.automationInteraction.updateMany({
    where: { contactId, userId, state: "WAITING" },
    data: { state: "SUPERSEDED" },
  }).catch((e) => console.error("[INTERACTIVE-MENU] Failed to supersede WAITING interactions:", e));
}

/**
 * Process an interactive button click with atomic claim.
 * Side effects (notification, next step) only run after a successful claim.
 */
export async function processInteractiveButtonClick(
  params: ProcessButtonParams,
  deps: ProcessButtonDeps,
): Promise<{ handled: boolean; outcome: ButtonInteractionOutcome }> {
  const { contactId, userId, phoneNumberId, buttonId, eventId, from } = params;

  // Duplicate webhook — same Meta event id already recorded
  const duplicate = await prisma.automationInteraction.findUnique({
    where: { processedEventId: eventId },
    select: { id: true },
  });
  if (duplicate) {
    console.log(`[INTERACTIVE-MENU] Duplicate event ${eventId} ignored`);
    return { handled: true, outcome: "duplicate" };
  }

  const candidate = await prisma.automationInteraction.findFirst({
    where: { contactId, userId, state: "WAITING" },
    orderBy: { createdAt: "desc" },
    include: {
      contact: { select: { id: true, name: true, phone: true } },
      automationRule: { select: { id: true, name: true, userId: true } },
    },
  });

  if (!candidate) {
    console.log(`[INTERACTIVE-MENU] Stale button — no WAITING interaction for ${from} (buttonId: ${buttonId})`);
    return { handled: true, outcome: "no_waiting" };
  }

  // Multi-tenant: interaction must belong to this WhatsApp account line
  if (candidate.phoneNumberId !== phoneNumberId) {
    console.warn(
      `[INTERACTIVE-MENU] Tenant mismatch — interaction ${candidate.id} phoneNumberId=${candidate.phoneNumberId} vs webhook ${phoneNumberId}`,
    );
    return { handled: true, outcome: "tenant_mismatch" };
  }

  if (candidate.automationRule.userId !== userId) {
    console.warn(`[INTERACTIVE-MENU] Tenant mismatch — rule userId for interaction ${candidate.id}`);
    return { handled: true, outcome: "tenant_mismatch" };
  }

  const snapshot = parseSnapshot(candidate.buttonSnapshot);
  const matchedButton = snapshot.find((b) => b.buttonId === buttonId);

  if (!matchedButton) {
    const staleClaim = await prisma.automationInteraction.updateMany({
      where: { id: candidate.id, state: "WAITING" },
      data: {
        state: "STALE",
        selectedButtonId: buttonId,
        processedEventId: eventId,
        completedAt: new Date(),
      },
    });
    if (staleClaim.count === 0) {
      console.log(`[INTERACTIVE-MENU] Stale button claim lost (race) — buttonId: ${buttonId}`);
      return { handled: true, outcome: "claim_lost" };
    }
    console.log(
      `[INTERACTIVE-MENU] Stale button — buttonId ${buttonId} not in snapshot for interaction ${candidate.id}`,
    );
    return { handled: true, outcome: "stale_button" };
  }

  // Atomic claim: WAITING → PROCESSING
  const claim = await prisma.automationInteraction.updateMany({
    where: { id: candidate.id, state: "WAITING" },
    data: {
      state: "PROCESSING",
      selectedButtonId: buttonId,
      processedEventId: eventId,
    },
  });

  if (claim.count === 0) {
    console.log(
      `[INTERACTIVE-MENU] Claim failed — interaction ${candidate.id} already processed/superseded (buttonId: ${buttonId})`,
    );
    return { handled: true, outcome: "claim_lost" };
  }

  const contactName = candidate.contact.name ?? candidate.contact.phone ?? from;
  console.log(
    `[INTERACTIVE-MENU] Customer selected "${matchedButton.text}" (${buttonId}) — interaction ${candidate.id} claimed`,
  );

  const ctx: ButtonInteractionContext = {
    interactionId: candidate.id,
    automationRuleId: candidate.automationRuleId,
    automationName: candidate.automationRule.name,
    contactName,
    contactId: candidate.contact.id,
    button: matchedButton,
  };

  // Notification only after successful claim + valid button
  if (matchedButton.notifyOnSelect === true && deps.notifyButtonSelected) {
    try {
      await deps.notifyButtonSelected(ctx);
      console.log(`[INTERACTIVE-MENU] Notification sent for button "${matchedButton.text}"`);
    } catch (err) {
      console.error(`[INTERACTIVE-MENU] Notification failed for interaction ${candidate.id}:`, err);
    }
  } else {
    console.log(
      `[INTERACTIVE-MENU] Notification skipped — notifyOnSelect=${Boolean(matchedButton.notifyOnSelect)}`,
    );
  }

  if (matchedButton.nextStepId) {
    const stepExists = await prisma.automationRule.findFirst({
      where: { id: matchedButton.nextStepId, userId, isEnabled: true },
      select: { id: true },
    });

    if (!stepExists) {
      const reason = `Next step ${matchedButton.nextStepId} missing/disabled`;
      console.warn(`[INTERACTIVE-MENU] ${reason} for user ${userId} — marking FAILED`);
      await prisma.automationInteraction.update({
        where: { id: candidate.id },
        data: { state: "FAILED", completedAt: new Date() },
      });
      if (deps.notifyFailure) {
        try {
          await deps.notifyFailure(ctx, reason);
        } catch (err) {
          console.error(`[INTERACTIVE-MENU] Failure notification error for interaction ${candidate.id}:`, err);
        }
      }
      return { handled: true, outcome: "failed" };
    }

    try {
      const result = await deps.executeNextStep(matchedButton.nextStepId);
      if (!result.ok) {
        const reason = result.error ?? "unknown error";
        console.error(`[INTERACTIVE-MENU] Next step ${matchedButton.nextStepId} failed:`, reason);
        await prisma.automationInteraction.update({
          where: { id: candidate.id },
          data: { state: "FAILED", completedAt: new Date() },
        });
        if (deps.notifyFailure) {
          try {
            await deps.notifyFailure(ctx, reason);
          } catch (err) {
            console.error(`[INTERACTIVE-MENU] Failure notification error for interaction ${candidate.id}:`, err);
          }
        }
        return { handled: true, outcome: "failed" };
      }
    } catch (stepErr) {
      const reason = stepErr instanceof Error ? stepErr.message : String(stepErr);
      console.error(`[INTERACTIVE-MENU] Next step ${matchedButton.nextStepId} threw:`, reason);
      await prisma.automationInteraction.update({
        where: { id: candidate.id },
        data: { state: "FAILED", completedAt: new Date() },
      });
      if (deps.notifyFailure) {
        try {
          await deps.notifyFailure(ctx, reason);
        } catch (err) {
          console.error(`[INTERACTIVE-MENU] Failure notification error for interaction ${candidate.id}:`, err);
        }
      }
      return { handled: true, outcome: "failed" };
    }
  }

  await prisma.automationInteraction.update({
    where: { id: candidate.id },
    data: { state: "COMPLETED", completedAt: new Date() },
  });

  console.log(
    `[INTERACTIVE-MENU] Interaction ${candidate.id} COMPLETED — nextStepId=${matchedButton.nextStepId ?? "null"}`,
  );
  return { handled: true, outcome: "completed" };
}

/** Best-effort name lookup for the loop-stopped notification (rule may be disabled/missing). */
export async function findAutomationRuleName(userId: string, stepId: string): Promise<string> {
  const rule = await prisma.automationRule.findFirst({
    where: { id: stepId, userId },
    select: { name: true },
  });
  return rule?.name ?? stepId;
}

/** Validate next-step rule exists for tenant (used by executeAutomationStep). */
export async function findEnabledAutomationStep(userId: string, stepId: string) {
  return prisma.automationRule.findFirst({
    where: { id: stepId, userId, isEnabled: true },
    select: {
      id: true,
      name: true,
      replyType: true,
      replyContent: true,
      replyMediaUrl: true,
      templateId: true,
      interactiveConfig: true,
    },
  });
}

export const INTERACTIVE_MENU_MAX_HOPS = 10;

export function isHopLimitExceeded(hops: number): boolean {
  return hops > INTERACTIVE_MENU_MAX_HOPS;
}

export function shouldNotifyOnSelect(button: InteractiveButtonSnapshot): boolean {
  return button.notifyOnSelect === true;
}

export { ReplyType };