import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  campaignFollowUpRecord: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  campaignFollowUpSetting: {
    findFirst: vi.fn(),
  },
  contact: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const mockSmartFollowup = vi.hoisted(() => ({
  sendSessionText: vi.fn(),
}));
vi.mock("@/lib/smart-followup", () => mockSmartFollowup);

const mockNotifications = vi.hoisted(() => ({
  notifyAiHandoffNeeded: vi.fn(),
}));
vi.mock("@/lib/notifications", () => mockNotifications);

import {
  resolveActiveCampaignFollowUpContext,
  executeCampaignFollowUpAction,
  handleCampaignFollowUpReply,
} from "@/lib/campaign-followup";

describe("Campaign Followup Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveActiveCampaignFollowUpContext", () => {
    it("contextId موجود وبيلاقي record → بيرجعه", async () => {
      const mockRecord = { id: "rec-1" };
      mockPrisma.campaignFollowUpRecord.findFirst.mockResolvedValueOnce(mockRecord);

      const res = await resolveActiveCampaignFollowUpContext({
        userId: "u-1",
        phone: "010",
        contextId: "msg-1",
      });

      expect(res).toEqual(mockRecord);
      expect(mockPrisma.campaignFollowUpRecord.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "u-1",
            followUpMessageId: "msg-1",
            followUpStage: "SENT",
          }),
        })
      );
    });

    it("phone موجود وبيلاقي record بالـ phone → بيرجعه", async () => {
      const mockRecord = { id: "rec-2" };
      // first call (contextId not provided or null), so only second branch runs
      mockPrisma.campaignFollowUpRecord.findFirst.mockResolvedValueOnce(mockRecord);

      const res = await resolveActiveCampaignFollowUpContext({
        userId: "u-1",
        phone: "010",
      });

      expect(res).toEqual(mockRecord);
      expect(mockPrisma.campaignFollowUpRecord.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "u-1",
            customerPhone: "010",
            followUpStage: "SENT",
          }),
        })
      );
    });

    it("مش لاقي حاجة → بيرجع null", async () => {
      mockPrisma.campaignFollowUpRecord.findFirst.mockResolvedValue(null);

      const res = await resolveActiveCampaignFollowUpContext({
        userId: "u-1",
        phone: "010",
        contextId: "msg-1",
      });

      expect(res).toBeNull();
    });
  });

  describe("executeCampaignFollowUpAction", () => {
    it("record مش موجود → مايكسرش السيستم ويرجع", async () => {
      mockPrisma.campaignFollowUpRecord.findUnique.mockResolvedValue(null);

      await expect(executeCampaignFollowUpAction("rec-1", "want_order")).resolves.toBeUndefined();
    });

    it("record موجود → بيوجه لـ handleCampaignFollowUpReply", async () => {
      const mockRecord = {
        id: "rec-1",
        userId: "u-1",
        customerPhone: "010",
        contactId: "cont-1",
        followUpStage: "SENT",
        followUpMessageId: "msg-1",
        campaignId: "camp-1",
        user: {
          whatsappAccount: {
            id: "acc-1",
            phoneNumberId: "phone-1",
            accessToken: "token-1",
          },
        },
      };
      mockPrisma.campaignFollowUpRecord.findUnique.mockResolvedValue(mockRecord);
      
      // Need to mock handleCampaignFollowUpReply implicitly by mocking its internal calls?
      // Since handleCampaignFollowUpReply is in the same file, we can't easily mock it.
      // But we can test its effects since it's called.
      mockPrisma.campaignFollowUpSetting.findFirst.mockResolvedValue({ isEnabled: false });

      await executeCampaignFollowUpAction("rec-1", "want_order");
      
      expect(mockPrisma.campaignFollowUpSetting.findFirst).toHaveBeenCalled();
    });
  });

  describe("handleCampaignFollowUpReply", () => {
    const defaultRecord = {
      id: "rec-1",
      userId: "u-1",
      customerPhone: "010",
      contactId: "cont-1",
      followUpStage: "SENT",
      campaignId: "camp-1",
    };
    
    const defaultReplyParams = {
      payloadId: "want_order",
      messageText: "want_order",
      accountOwner: { phoneNumberId: "phone-1", accessToken: "token-1" } as any,
      userId: "u-1",
    };

    it("setting مش مفعل → بيرجع بدون اكشن", async () => {
      mockPrisma.campaignFollowUpSetting.findFirst.mockResolvedValue({ isEnabled: false });

      await handleCampaignFollowUpReply(defaultRecord, defaultReplyParams);

      expect(mockPrisma.campaignFollowUpRecord.updateMany).not.toHaveBeenCalled();
    });

    it("want_order → بيبعت رسالة ويبلغ الذكاء الاصطناعي", async () => {
      mockPrisma.campaignFollowUpSetting.findFirst.mockResolvedValue({
        isEnabled: true,
        texts: { wantOrder: "نص مخصص" },
      });
      mockPrisma.contact.findUnique.mockResolvedValue({ id: "cont-1", name: "Ahmed" });

      await handleCampaignFollowUpReply(defaultRecord, {
        ...defaultReplyParams,
        payloadId: "want_order",
      });

      expect(mockPrisma.campaignFollowUpRecord.updateMany).toHaveBeenCalledWith({
        where: { id: "rec-1", followUpStage: "SENT" },
        data: { followUpStage: "DONE" },
      });
      expect(mockSmartFollowup.sendSessionText).toHaveBeenCalledWith(
        "010", "phone-1", "token-1", "نص مخصص",
        expect.any(Object)
      );
      expect(mockNotifications.notifyAiHandoffNeeded).toHaveBeenCalledWith(
        "u-1", "Ahmed", "cont-1", expect.any(String), "high"
      );
    });

    it("has_question → بيبعت رسالة ويبلغ الذكاء الاصطناعي كأولوية عادية", async () => {
      mockPrisma.campaignFollowUpSetting.findFirst.mockResolvedValue({
        isEnabled: true,
      });
      mockPrisma.contact.findUnique.mockResolvedValue({ id: "cont-1", name: "Ali" });

      await handleCampaignFollowUpReply(defaultRecord, {
        ...defaultReplyParams,
        payloadId: "has_question",
      });

      expect(mockSmartFollowup.sendSessionText).toHaveBeenCalledWith(
        "010", "phone-1", "token-1", expect.stringContaining("يسعدنا مساعدتك"),
        expect.any(Object)
      );
      expect(mockNotifications.notifyAiHandoffNeeded).toHaveBeenCalledWith(
        "u-1", "Ali", "cont-1", expect.any(String), "normal"
      );
    });

    it("not_interested → بيبعت رسالة ومش بيبلغ الذكاء الاصطناعي", async () => {
      mockPrisma.campaignFollowUpSetting.findFirst.mockResolvedValue({
        isEnabled: true,
      });

      await handleCampaignFollowUpReply(defaultRecord, {
        ...defaultReplyParams,
        payloadId: "not_interested",
      });

      expect(mockSmartFollowup.sendSessionText).toHaveBeenCalledWith(
        "010", "phone-1", "token-1", expect.stringContaining("شكرًا لك"),
        expect.any(Object)
      );
      expect(mockNotifications.notifyAiHandoffNeeded).not.toHaveBeenCalled();
    });

    it("أكشن مش معروف → مايكسرش السيستم (بيعمل update لـ DONE بس مبيبعتش حاجة)", async () => {
      mockPrisma.campaignFollowUpSetting.findFirst.mockResolvedValue({
        isEnabled: true,
      });

      await handleCampaignFollowUpReply(defaultRecord, {
        ...defaultReplyParams,
        payloadId: "unknown_action",
      });

      // Update to done happens before branching
      expect(mockPrisma.campaignFollowUpRecord.updateMany).toHaveBeenCalled();
      // No text sent
      expect(mockSmartFollowup.sendSessionText).not.toHaveBeenCalled();
    });
  });
});
