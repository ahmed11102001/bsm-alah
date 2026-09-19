import { describe, it, expect } from "vitest";

import { sendEmailViaProvider } from "@/lib/email-marketing/send";

const conn = (over: any = {}) => ({
  host: "smtp.example.com",
  port: 587,
  secure: false,
  userLogin: "user@example.com",
  password: "not-encrypted",
  fromEmail: "news@example.com",
  fromName: "News",
  ...over,
});

describe("sendEmailViaProvider — validation (no network)", () => {
  it("بريد مستلم فاضي → error من غير شبكة", async () => {
    const r = await sendEmailViaProvider({
      connection: conn(),
      to: "   ",
      subject: "s",
      html: "<p>h</p>",
    });
    expect(r.success).toBe(false);
    expect(r.error).toBeDefined();
  });

  it("connection ناقص → error", async () => {
    const r = await sendEmailViaProvider({
      connection: { ...conn(), host: null },
      to: "a@b.co",
      subject: "s",
      html: "<p>h</p>",
    });
    expect(r.success).toBe(false);
  });

  it("باسورد غير مشفّر → decrypt error (من غير شبكة)", async () => {
    const r = await sendEmailViaProvider({
      connection: conn(),
      to: "a@b.co",
      subject: "s",
      html: "<p>h</p>",
    });
    expect(r.success).toBe(false);
    expect(r.error).toBeDefined();
  });
});
