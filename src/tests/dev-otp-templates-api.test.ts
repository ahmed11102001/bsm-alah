import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockPrisma = vi.hoisted(() => ({
  developerProject: { findFirst: vi.fn() },
  developerOtpTemplate: {
    findMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  developerMetaConnection: { findUnique: vi.fn() },
}));
const mockSession = vi.hoisted(() => vi.fn());
const mockProject = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/dev-auth", () => ({ getDevSessionFromRequest: mockSession }));
vi.mock("@/lib/dev-project-auth", () => ({ getProjectForOwnerOrDeveloper: mockProject }));
vi.mock("@/lib/crypto", () => ({ decryptToken: vi.fn((token: string) => token) }));

import { GET, POST } from "@/app/api/developers/projects/[id]/otp-templates/route";
import { POST as SYNC } from "@/app/api/developers/projects/[id]/otp-templates/sync/route";

const params = { params: Promise.resolve({ id: "proj-1" }) };
const request = (url: string, init?: any) => new NextRequest(url, init);

describe("developer OTP templates API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.mockResolvedValue({ id: "dev-1" });
    mockProject.mockResolvedValue({ id: "proj-1" });
  });

  it("GET returns old records with null metadata without inventing values", async () => {
    mockPrisma.developerOtpTemplate.findMany.mockResolvedValue([{
      id: "tpl-1",
      projectId: "proj-1",
      variables: null,
      metaComponents: null,
    }]);

    const response = await GET(request("http://localhost/api/developers/projects/proj-1/otp-templates"), params);
    expect(response.status).toBe(200);
    expect((await response.json()).templates).toEqual([expect.objectContaining({
      id: "tpl-1",
      variables: null,
      metaComponents: null,
    })]);
  });

  it("sync updates metadata even when status and Meta id are unchanged", async () => {    mockPrisma.developerMetaConnection.findUnique.mockResolvedValue({
      isVerified: true,
      accessToken: "TOKEN",
      wabaId: "waba-1",
    });
    mockPrisma.developerOtpTemplate.findMany.mockResolvedValue([{
      id: "tpl-1",
      name: "otp_verification",
      language: "ar",
      category: "AUTHENTICATION",
      status: "APPROVED",
      metaTemplateId: "meta-1",
      metaComponents: null,
      rejectedReason: null,
    }]);
    mockPrisma.developerOtpTemplate.update.mockResolvedValue({});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{
        id: "meta-1",
        name: "otp_verification",
        status: "APPROVED",
        category: "AUTHENTICATION",
        language: "ar",
        components: [
          { type: "BODY", add_security_recommendation: true },
          { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] },
        ],
      }] }),
    }));

    const response = await SYNC(
      request("http://localhost/api/developers/projects/proj-1/otp-templates/sync", { method: "POST" }),
      params,
    );
    expect(response.status).toBe(200);
    expect(mockPrisma.developerOtpTemplate.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "tpl-1" },
      data: expect.objectContaining({
        metaTemplateId: "meta-1",
        metaComponents: [
          { type: "BODY", add_security_recommendation: true },
          { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] },
        ],
      }),
    }));
  });

  it("creation ignores client category/body — always AUTHENTICATION with generated structure", async () => {
    mockPrisma.developerOtpTemplate.create.mockResolvedValue({ id: "tpl-new" });
    const response = await POST(
      request("http://localhost/api/developers/projects/proj-1/otp-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "My OTP",
          language: "en_US",
          category: "MARKETING",
          body: "hacked {{1}} {{2}} {{3}}",
          variables: [{ position: 1, key: "custom", example: "x" }],
          headerText: "hi",
          footer: "bye",
          codeExpirationMinutes: 15,
        }),
      }),
      params
    );
    expect(response.status).toBe(200);
    expect(mockPrisma.developerOtpTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "proj-1",
        name: "my_otp",
        language: "en_US",
        category: "AUTHENTICATION",
        headerText: null,
        footer: null,
        status: "LOCAL_DRAFT",
      }),
    });
    const created = mockPrisma.developerOtpTemplate.create.mock.calls[0][0].data;
    // النص المولّد يحمل {{1}} واحدًا فقط — بلا أي أثر لمدخلات العميل
    expect(created.body).not.toContain("hacked");
    expect(created.body).toContain("COPY_CODE");
    expect(created.body).not.toContain("MARKETING");
  });

  it("creation rejects unsupported language and bad expiry", async () => {    const badLang = await POST(
      request("http://localhost/api/developers/projects/proj-1/otp-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "otp_x", language: "xx" }),
      }),
      params
    );
    expect(badLang.status).toBe(400);
    expect(mockPrisma.developerOtpTemplate.create).not.toHaveBeenCalled();

    const badExpiry = await POST(
      request("http://localhost/api/developers/projects/proj-1/otp-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "otp_x", language: "ar", codeExpirationMinutes: 500 }),
      }),
      params
    );
    expect(badExpiry.status).toBe(400);
  });

  it("submit sends the exact deterministic builder payload (FOOTER expiry, no custom text)", async () => {
    mockPrisma.developerMetaConnection.findUnique.mockResolvedValue({
      isVerified: true,
      accessToken: "TOKEN",
      wabaId: "waba-1",
    });
    mockPrisma.developerOtpTemplate.create.mockResolvedValue({
      id: "tpl-new",
      projectId: "proj-1",
      name: "opt_wani",
      language: "en_US",
      category: "AUTHENTICATION",
      status: "LOCAL_DRAFT",
    });
    mockPrisma.developerOtpTemplate.update.mockResolvedValue({});
    const metaFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "meta-new" }),
    });
    vi.stubGlobal("fetch", metaFetch);

    const response = await POST(
      request("http://localhost/api/developers/projects/proj-1/otp-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "opt_wani", language: "en_US", codeExpirationMinutes: 5, submitToMeta: true }),
      }),
      params
    );
    expect(response.status).toBe(200);
    expect(metaFetch).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(metaFetch.mock.calls[0][1].body);
    expect(sent).toEqual({
      name: "opt_wani",
      category: "AUTHENTICATION",
      language: "en_US",
      components: [
        { type: "BODY", add_security_recommendation: true },
        { type: "FOOTER", code_expiration_minutes: 5 },
        { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] },
      ],
    });
    vi.unstubAllGlobals();
  });
});
