import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import {
  normalizeOtpTemplateName,
  isValidOtpTemplateName,
  isSupportedOtpLanguage,
  generatedOtpBody,
  buildMetaCreateComponents,
} from "@/lib/developer-template-contract";
import { decryptToken } from "@/lib/crypto";
import { GRAPH_API_VERSION } from "@/lib/meta-graph";

import { getProjectForOwnerOrDeveloper } from "@/lib/dev-project-auth";
import { validateVariableDefinitions, type OtpVariableDefinition } from "@/lib/developer-template-contract";

async function getProjectOrFail(userId: string, projectId: string) {
  return getProjectForOwnerOrDeveloper(projectId, userId);
}

// ── GET — list templates for project ─────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const project = await getProjectOrFail(session.id, id);
  if (!project) return NextResponse.json({ error: "المشروع مش موجود" }, { status: 404 });

  try {
    const templates = await prisma.developerOtpTemplate.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });

    // Older rows legitimately have null JSON metadata. Keep the API shape stable
    // without inventing metadata that was never returned by Meta.
    return NextResponse.json({
      templates: templates.map((template) => ({
        ...template,
        variables: template.variables ?? null,
        metaComponents: template.metaComponents ?? null,
      })),
    });
  } catch (error) {
    console.error("[otp-templates:get] database failure", {
      projectId: id,
      error: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json(
      { error: "Unable to load templates right now. Please try again shortly." },
      { status: 503 },
    );
  }
}

// ── POST — create template for project ────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const project = await getProjectOrFail(session.id, id);
  if (!project) return NextResponse.json({ error: "المشروع مش موجود" }, { status: 404 });

  const {
    name,
    language = "ar",
    // NOTE: category/body/variables/header/footer are intentionally IGNORED —
    // OTP templates are always AUTHENTICATION with a Wani-generated structure
    // (PHASE 3/4/12). There is no Marketing/Utility OTP creation path.
    submitToMeta = false,
    // OTP-specific fields for AUTHENTICATION
    addSecurityRecommendation = true,
    codeExpirationMinutes = 10,
  } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "اسم القالب مطلوب" }, { status: 400 });
  if (!isSupportedOtpLanguage(language)) {
    return NextResponse.json(
      { error: "اللغة غير مدعومة لقوالب OTP", code: "OTP_LANGUAGE_UNSUPPORTED" },
      { status: 400 }
    );
  }
  const expiry = Number(codeExpirationMinutes);
  if (!Number.isFinite(expiry) || expiry < 1 || expiry > 90) {
    return NextResponse.json(
      { error: "مدة صلاحية الكود يجب أن تكون بين 1 و 90 دقيقة", code: "OTP_EXPIRY_INVALID" },
      { status: 400 }
    );
  }

  const metaName = normalizeOtpTemplateName(name);
  if (!isValidOtpTemplateName(metaName))
    return NextResponse.json({ error: "اسم القالب قصير جداً أو يحتوي على أحرف غير مدعومة" }, { status: 400 });

  // For AUTHENTICATION templates, store OTP config in body/footer fields.
  // The send body text itself is Wani-generated (single {{1}} for the code).
  const template = await prisma.developerOtpTemplate.create({
    data: {
      projectId: id,
      name: metaName,
      language,
      category: "AUTHENTICATION",
      headerType: "none",
      headerText: null,
      body: JSON.stringify({
        addSecurityRecommendation,
        codeExpirationMinutes: Math.round(expiry),
        otpType: "COPY_CODE",
        text: generatedOtpBody(language),
      }),
      bodyExample: null,
      variables: undefined,
      footer: null,
      status: "LOCAL_DRAFT",
    },
  });

  if (submitToMeta) {
    const connection = await prisma.developerMetaConnection.findUnique({
      where: { projectId: id },
    });

    if (!connection?.isVerified || !connection.accessToken || !connection.wabaId) {
      return NextResponse.json({
        ok: true,
        template,
        warning: "القالب اتحفظ محلياً — ربط Meta مطلوب لإرساله للمراجعة",
      });
    }

    try {
      const plainAccessToken = decryptToken(connection.accessToken).trim();
      const metaResult = await submitTemplateToMeta({
        accessToken: plainAccessToken,
        wabaId: connection.wabaId,
        template: { ...template, addSecurityRecommendation, codeExpirationMinutes: Math.round(expiry) },
      });

      const updated = await prisma.developerOtpTemplate.update({
        where: { id: template.id },
        data: { metaTemplateId: metaResult.id, status: "PENDING" },
      });

      return NextResponse.json({ ok: true, template: updated, submittedToMeta: true });
    } catch (err: any) {
      await prisma.developerOtpTemplate.update({
        where: { id: template.id },
        data: { rejectedReason: err.message },
      });
      return NextResponse.json({
        ok: true,
        template,
        warning: `حُفظ محلياً — فشل الإرسال لـ Meta: ${err.message}`,
      });
    }
  }

  return NextResponse.json({ ok: true, template });
}

// ── DELETE — delete a template ─────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const project = await getProjectOrFail(session.id, id);
  if (!project) return NextResponse.json({ error: "المشروع مش موجود" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const templateId = searchParams.get("templateId");
  if (!templateId) return NextResponse.json({ error: "templateId مطلوب" }, { status: 400 });

  const template = await prisma.developerOtpTemplate.findFirst({
    where: { id: templateId, projectId: id },
  });

  if (!template) return NextResponse.json({ error: "القالب مش موجود" }, { status: 404 });

  if (template.metaTemplateId || template.status !== "LOCAL_DRAFT") {
    const connection = await prisma.developerMetaConnection.findUnique({
      where: { projectId: id },
    });
    if (connection?.accessToken && connection.wabaId) {
      try {
        const plainAccessToken = decryptToken(connection.accessToken).trim();
        await deleteTemplateFromMeta({
          accessToken: plainAccessToken,
          wabaId: connection.wabaId,
          templateName: template.name,
        });
      } catch (err) {
        console.error("[delete-meta-template] Error:", err);
      }
    }
  }

  await prisma.developerOtpTemplate.delete({ where: { id: templateId } });

  return NextResponse.json({ ok: true });
}

// ── Helper: Submit to Meta Graph API ──────────────────────────────────────────
// يستخدم buildMetaCreateComponents من الـ contract — لا يوجد builder يدوي مكرر.
// القالب دائمًا AUTHENTICATION بالنص المولّد من Wani (متغير {{1}} واحد للكود).
async function submitTemplateToMeta({
  accessToken,
  wabaId,
  template,
}: {
  accessToken: string;
  wabaId: string;
  template: any;
}) {
  const addSecurity = template.addSecurityRecommendation ?? true;
  const components = buildMetaCreateComponents({ addSecurityRecommendation: addSecurity });

  // BODY يحمل النص المولّد ({{1}} واحد للكود) + مثال — نفس structure الإرسال.
  const bodyComp = components.find((c) => c["type"] === "BODY") as Record<string, unknown> | undefined;
  if (bodyComp) {
    bodyComp["text"] = generatedOtpBody(template.language);
    bodyComp["example"] = { body_text: [["123456"]] };
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/message_templates`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: template.name,
      category: "AUTHENTICATION",
      language: template.language,
      components,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || data.error?.error_user_msg || "Meta API error");
  }
  return data;
}

// ── Helper: Delete from Meta Graph API ─────────────────────────────────────────
async function deleteTemplateFromMeta({
  accessToken,
  wabaId,
  templateName,
}: {
  accessToken: string;
  wabaId: string;
  templateName: string;
}) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/message_templates?name=${templateName}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    console.error("[delete-meta-template] Meta API error:", data.error);
    // لا نوقف الحذف المحلي حتى لو فشل الحذف في ميتا
  }
}
