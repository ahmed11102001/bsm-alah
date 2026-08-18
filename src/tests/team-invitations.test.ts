import { describe, it, expect } from "vitest";
import { generateJoinCode, hashJoinCode, verifyJoinCode, INVITATION_EXPIRY_HOURS } from "@/lib/team-invitations";
import { TeamInviteSchema, TeamResendInviteSchema, TeamCancelInviteSchema, JoinTeamSchema } from "@/lib/schemas";

describe("Team Invitations Module", () => {
  describe("generateJoinCode", () => {
    it("ينشئ كود يبدأ بـ WANI- وله 2 أجزاء", () => {
      const code = generateJoinCode();
      expect(code).toMatch(/^WANI-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it("ينشئ أكواد فريدة في كل مرة", () => {
      const c1 = generateJoinCode();
      const c2 = generateJoinCode();
      expect(c1).not.toBe(c2);
    });
  });

  describe("hashJoinCode and verifyJoinCode", () => {
    it("يقوم بتشفير الكود والتحقق منه بنجاح", async () => {
      const code = "WANI-7K4P-92XM";
      const hash = await hashJoinCode(code);
      expect(hash).not.toBe(code);

      const isValid = await verifyJoinCode(code, hash);
      expect(isValid).toBe(true);

      // Case insensitive check
      const isCaseValid = await verifyJoinCode("wani-7k4p-92xm", hash);
      expect(isCaseValid).toBe(true);

      // Wrong code check
      const isInvalid = await verifyJoinCode("WANI-0000-0000", hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe("Team Schemas", () => {
    it("TeamInviteSchema: بيانات صالحة تعدي", () => {
      const input = { email: "agent@company.com", name: "Ahmed Agent", role: "CHAT_ONLY" };
      expect(TeamInviteSchema.safeParse(input).success).toBe(true);
    });

    it("TeamInviteSchema: دور غير صالح يترفض", () => {
      const input = { email: "agent@company.com", name: "Ahmed Agent", role: "SUPERADMIN" };
      expect(TeamInviteSchema.safeParse(input).success).toBe(false);
    });

    it("TeamResendInviteSchema: invitationId مطلوب", () => {
      expect(TeamResendInviteSchema.safeParse({ invitationId: "cuid123" }).success).toBe(true);
      expect(TeamResendInviteSchema.safeParse({ invitationId: "" }).success).toBe(false);
    });

    it("TeamCancelInviteSchema: invitationId مطلوب", () => {
      expect(TeamCancelInviteSchema.safeParse({ invitationId: "cuid123" }).success).toBe(true);
      expect(TeamCancelInviteSchema.safeParse({ invitationId: "" }).success).toBe(false);
    });
  });

  describe("Invitation constants", () => {
    it("صلاحية الدعوة 48 ساعة", () => {
      expect(INVITATION_EXPIRY_HOURS).toBe(48);
    });
  });
});
