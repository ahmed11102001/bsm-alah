import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";

async function getProjectOrFail(developerId: string, projectId: string) {
  return prisma.developerProject.findFirst({
    where: { id: projectId, developerId, status: "ACTIVE" },
  });
}

// ── GET — list templates for project ─────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const project = await getProjectOrFail(session.id, params.id);
  if (!project) return NextResponse.json({ error: "المشروع مش موجود" }, { status: 404 });

  const templates = await prisma.developerOtpTemplate.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ templates });
}

// ── POST — create template for project ────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const project = await getProjectOrFail(session.id, params.id);
  if (!project) return NextResponse.json({ error: "المشروع مش موجود" }, { status: 404 });

  const {
    name,
    language = "ar",
    category = "AUTHENTICATION",
    headerType = "none",
    headerText,
    body,
    bodyExample,
    footer,
    submitToMeta = false,
  } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "اسم القالب مطلوب" }, { status: 400 });
  if (!body?.trim()) return NextResponse.json({ error: "محتوى القالب مطلوب" }, { status: 400 });

  const metaName = name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  if (metaName.length < 3)
    return NextResponse.json({ error: "اسم القالب قصير جداً أو يحتوي على أحرف غير مدعومة" }, { status: 400 });

  const template = await prisma.developerOtpTemplate.create({
    data: {
      projectId: params.id,
      name: metaName,
      language,
      category,
      headerType: headerType || "none",
      headerText: headerType === "text" ? headerText?.trim() : null,
      body: body.trim(),
      bodyExample: bodyExample ? JSON.stringify(bodyExample) : null,
      footer: footer?.trim() || null,
      status: "LOCAL_DRAFT",
    },
  });

  if (submitToMeta) {
    const connection = await prisma.developerMetaConnection.findUnique({
      where: { projectId: params.id },
    });

    if (!connection?.isVerified || !connection.accessToken || !connection.wabaId) {
      return NextResponse.json({
        ok: true,
        template,
        warning: "القالب اتحفظ محلياً — ربط Meta مطلوب لإرساله للمراجعة",
      });
    }

    try {
      const metaResult = await submitTemplateToMeta({
        accessToken: connection.accessToken,
        wabaId: connection.wabaId,
        template: { ...template, bodyExample: bodyExample || [] },
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
  { params }: { params: { id: string } }
) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const project = await getProjectOrFail(session.id, params.id);
  if (!project) return NextResponse.json({ error: "المشروع مش موجود" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const templateId = searchParams.get("templateId");
  if (!templateId) return NextResponse.json({ error: "templateId مطلوب" }, { status: 400 });

  const template = await prisma.developerOtpTemplate.findFirst({
    where: { id: templateId, projectId: params.id },
  });

  if (!template) return NextResponse.json({ error: "القالب مش موجود" }, { status: 404 });

  await prisma.developerOtpTemplate.delete({ where: { id: templateId } });

  return NextResponse.json({ ok: true });
}

// ── Helper: Submit to Meta Graph API ──────────────────────────────────────────
async function submitTemplateToMeta({
  accessToken,
  wabaId,
  template,
}: {
  accessToken: string;
  wabaId: string;
  template: any;
}) {
  const components: any[] = [];

  if (template.headerType === "text" && template.headerText) {
    components.push({ type: "HEADER", format: "TEXT", text: template.headerText });
  }

  const varMatches = template.body.match(/\{\{(\d+)\}\}/g) ?? [];
  const varCount = varMatches.length;
  const exampleVars: string[] = Array.isArray(template.bodyExample) ? template.bodyExample : [];

  const bodyComp: any = { type: "BODY", text: template.body };
  if (varCount > 0) {
    const filled = Array.from({ length: varCount }, (_, i) =>
      exampleVars[i]?.trim() || `قيمة_${i + 1}`
    );
    bodyComp.example = { body_text: [filled] };
  }
  components.push(bodyComp);

  if (template.footer) {
    components.push({ type: "FOOTER", text: template.footer });
  }

  const url = `https://graph.facebook.com/v21.0/${wabaId}/message_templates`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: template.name,
      category: template.category,
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