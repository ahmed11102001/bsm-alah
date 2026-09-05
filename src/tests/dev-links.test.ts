import { describe, it, expect } from "vitest";
import {
  DEVELOPERS_BASE_URL,
  normalizeHostname,
  isDevHostname,
  devPathForHost,
} from "@/lib/dev-links";

describe("dev-links — Developers subdomain helpers", () => {
  it("DEVELOPERS_BASE_URL ثابت على السب دومين", () => {
    expect(DEVELOPERS_BASE_URL).toBe("https://developers.aiwni.com");
  });

  it("normalizeHostname بيشيل البورت ويوحّد الحالة", () => {
    expect(normalizeHostname("developers.localhost:3000")).toBe(
      "developers.localhost"
    );
    expect(normalizeHostname("Developers.Aiwni.COM")).toBe(
      "developers.aiwni.com"
    );
    expect(normalizeHostname(null)).toBe("");
    expect(normalizeHostname(undefined)).toBe("");
  });

  it("isDevHostname بيتعرف على السب دومين بس", () => {
    expect(isDevHostname("developers.aiwni.com")).toBe(true);
    expect(isDevHostname("developers.localhost:3000")).toBe(true);
    expect(isDevHostname("aiwni.com")).toBe(false);
    expect(isDevHostname("www.aiwni.com")).toBe(false);
    expect(isDevHostname("evildevelopers.aiwni.com")).toBe(false);
    expect(isDevHostname("developers.aiwni.com.evil.com")).toBe(false);
  });

  it("devPathForHost على السب دومين: بيشيل البادئة", () => {
    const host = "developers.aiwni.com";
    expect(devPathForHost("/portal/settings", host)).toBe("/portal/settings");
    expect(devPathForHost("/developers/portal/settings", host)).toBe(
      "/portal/settings"
    );
    expect(devPathForHost("/developers", host)).toBe("/");
    expect(devPathForHost("/signin?callbackUrl=/portal", host)).toBe(
      "/signin?callbackUrl=/portal"
    );
    expect(
      devPathForHost("/developers/signin?error=suspended", host)
    ).toBe("/signin?error=suspended");
  });

  it("devPathForHost على الدومين الرئيسي: بيضيف البادئة", () => {
    const host = "aiwni.com";
    expect(devPathForHost("/portal/settings", host)).toBe(
      "/developers/portal/settings"
    );
    expect(devPathForHost("/developers/portal/settings", host)).toBe(
      "/developers/portal/settings"
    );
    expect(devPathForHost("/", host)).toBe("/developers/");
  });

  it("devPathForHost على localhost من غير subdomain: بيضيف البادئة", () => {
    expect(devPathForHost("/portal", "localhost:3000")).toBe(
      "/developers/portal"
    );
  });
});
