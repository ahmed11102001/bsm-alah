import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";

// ─── GET — List all templates for the developer ──────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const templates = await prisma.developerOtpTemplate.findMany({
    where: { developerId: session.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ templates });
}

// ─── POST — Create template (save locally, optionally submit to Meta) ────────
export async function POST(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const {
    name,
    language = "ar",
    category = "AUTHENTICATION",
    headerType = "none",
    headerText,
    body,
    bodyExample,  // string[] — قيم تجريبية للمتغيرات
    footer,
    submitToMeta = false,  // لو true → نبعت لـ Meta فوراً
  } = await req.json();

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!name?.trim())  return NextResponse.json({ error: "اسم القالب مطلوب" }, { status: 400 });
  if (!body?.trim())  return NextResponse.json({ error: "محتوى القالب مطلوب" }, { status: 400 });

  // Meta name: lowercase, underscores only, no spaces
  const metaName = name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  if (metaName.length < 3) return NextResponse.json({ error: "اسم القالب قصير جداً أو يحتوي على أحرف غير مدعومة" }, { status: 400 });

  // ── Save locally first ──────────────────────────────────────────────────────
  const template = await prisma.developerOtpTemplate.create({
    data: {
      developerId: session.id,
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

  // ── If submitToMeta → try to send to Meta Graph API ────────────────────────
  if (submitToMeta) {
    const connection = await prisma.developerMetaConnection.findUnique({
      where: { developerId: session.id },
    });

    if (!connection?.isVerified || !connection.accessToken || !connection.wabaId) {
      // Save locally only — no Meta yet
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
        data: {
          metaTemplateId: metaResult.id,
          status: "PENDING",
        },
      });

      return NextResponse.json({ ok: true, template: updated, submittedToMeta: true });
    } catch (err: any) {
      // Submission failed — template still saved locally
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

// ─── Helper: Submit to Meta Graph API ───────────────────────────────────────
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

  // HEADER
  if (template.headerType === "text" && template.headerText) {
    components.push({ type: "HEADER", format: "TEXT", text: template.headerText });
  }

  // BODY — detect {{N}} variables
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

  // FOOTER
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
  return data; // { id, status }
}