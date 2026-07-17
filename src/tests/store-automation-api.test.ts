import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import prisma from "@/lib/prisma";
import { executeStoreAutomationSend } from "@/lib/store-automation";
import * as whatsappApi from "@/lib/whatsapp-api";
import { UserRole, PlanTier } from "@/types/enums";

// Mock the external WhatsApp API call so we don't actually send real messages
vi.mock("@/lib/whatsapp-api", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue({ ok: true, whatsappMsgId: "msg-123" }),
}));

describe("Integration: Store Automation Idempotency (Real DB)", () => {
  let testUserId: string;
  let testStoreId: string = "test-store-123";
  let testOrderId: string;
  let testContactId: string;
  let testAutomationId: string;
  let testTemplateId: string;
  let testAccountId: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // 1. Create a dummy user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@test.com`,
        password: "hash",
        name: "Test User",
      },
    });
    testUserId = user.id;

    // 2. Create Whatsapp Account
    const waAccount = await prisma.whatsAppAccount.create({
      data: {
        userId: testUserId,
        phoneNumberId: "12345",
        wabaId: "67890",
        accessToken: "encrypted_token", // In reality this would be encrypted, but executeStoreAutomationSend decrypts it... wait, crypto decrypt will fail if not real!
      },
    });
    testAccountId = waAccount.id;

    // 3. Create a Contact
    const contact = await prisma.contact.create({
      data: {
        userId: testUserId,
        phone: "201000000000",
        name: "Test Contact",
      },
    });
    testContactId = contact.id;

    // 4. Create Template
    const template = await prisma.template.create({
      data: {
        userId: testUserId,
        name: "shipped_template",
        language: "ar",
        status: "APPROVED",
        category: "MARKETING",
        components: [],
        content: "test template content",
        metaId: "meta-test-123",
      },
    });
    testTemplateId = template.id;

    // 4.5 Create Shopify Store
    const store = await prisma.shopifyStore.create({
      data: {
        userId: testUserId,
        shop: "test-store.myshopify.com",
        storeName: "Test Store",
        accessToken: "test-token",
      },
    });
    testStoreId = store.id;

    // 5. Create StoreAutomation
    const automation = await prisma.storeAutomation.create({
      data: {
        userId: testUserId,
        type: "order_shipped",
        shopifyStoreId: testStoreId, // source is shopify
        templateId: testTemplateId,
        isEnabled: true,
      },
    });
    testAutomationId = automation.id;

    // 6. Create StoreOrder
    const order = await prisma.storeOrder.create({
      data: {
        userId: testUserId,
        source: "shopify",
        shopifyStoreId: testStoreId,
        externalId: `order-${Date.now()}`,
        customerPhone: "201000000000",
        customerName: "Customer",
        total: 100,
        status: "processing",
      },
    });
    testOrderId = order.id;
  }, 30000);

  afterEach(async () => {
    // Clean up created records in reverse order
    await prisma.message.deleteMany({ where: { userId: testUserId } });
    await prisma.storeOrder.deleteMany({ where: { userId: testUserId } });
    await prisma.storeAutomation.deleteMany({ where: { userId: testUserId } });
    await prisma.template.deleteMany({ where: { userId: testUserId } });
    await prisma.shopifyStore.deleteMany({ where: { userId: testUserId } });
    await prisma.contact.deleteMany({ where: { userId: testUserId } });
    if (testUserId) {
      await prisma.whatsAppAccount.deleteMany({ where: { userId: testUserId } });
    }
    await prisma.user.deleteMany({ where: { id: testUserId } });
  }, 30000);

  it("order_shipped claim race: يجب أن يُرسل رسالة واحدة فقط عند الاستدعاء المتزامن", async () => {
    // نحتاج إلى عمل Mock لـ decryptToken عشان ميضربش error واحنا بنحاول نفك تشفير "encrypted_token"
    const crypto = await import("@/lib/crypto");
    vi.spyOn(crypto, "decryptToken").mockReturnValue("decrypted-token");

    const params = {
      userId: testUserId,
      automationType: "order_shipped" as const,
      storeSource: "shopify" as const,
      storeId: testStoreId,
      customerPhone: "201000000000",
      contactId: testContactId,
      storeOrderId: testOrderId,
    };

    // استدعاء متزامن مرتين في نفس اللحظة
    const [res1, res2] = await Promise.all([
      executeStoreAutomationSend(params),
      executeStoreAutomationSend(params),
    ]);

    // نتحقق من كم مرة تم المناداة على sendWhatsAppMessage
    const sendMsgCalls = vi.mocked(whatsappApi.sendWhatsAppMessage).mock.calls.length;
    
    // Test Assertion - This will likely fail if the bug is present (i.e. if it's called 2 times)
    expect(sendMsgCalls).toBe(1);
    
    // المفترض واحدة تنجح والتانية ترجع already_shipped_or_in_progress
    const successes = [res1.sent, res2.sent].filter(Boolean).length;
    expect(successes).toBe(1);
  });
});