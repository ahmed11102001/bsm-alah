import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { decryptToken } from "@/lib/crypto";
import { getProjectForOwnerOrDeveloper } from "@/lib/dev-project-auth";
import { devError } from "@/lib/dev-errors";
import { GRAPH_API_VERSION } from "@/lib/meta-graph";
import { placeholderPositions, type OtpVariableDefinition } from "@/lib/developer-template-contract";

function deriveVariables(components: unknown, category?: string): OtpVariableDefinition[] | null | undefined {
  if (category?.toUpperCase() === "AUTHENTICATION") return undefined;
  if (!Array.isArray(components)) return undefined;
  const body = components.find((component: any) => String(component?.type ?? "").toUpperCase() === "BODY") as any;
  if (!body || typeof body.text !== "string") return undefined;
  const positions = placeholderPositions(body.text);
  if (positions.length === 0 || positions.length > 2) return undefined;
  const examples = Array.isArray(body.example?.body_text?.[0]) ? body.example.body_text[0] : [];
  if (examples.length < positions.length || examples.some((value: unknown) => !String(value ?? "").trim())) return undefined;
  const keys: OtpVariableDefinition["key"][] = ["otp", "expiryMinutes"];
  return positions.map((position, index) => ({
    position,
    key: keys[index],
    example: String(examples[index]),
  }));
}

// ── POST /api/developers/projects/[id]/otp-templates/sync ────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getDevSessionFromRequest(req);
    if (!session) return devError("unauthenticated", "AUTH_REQUIRED", 401);

    const project = await getProjectForOwnerOrDeveloper(id, session.id);
    if (!project) return devError("المشروع مش موجود", "NOT_FOUND", 404);

    const connection = await prisma.developerMetaConnection.findUnique({
      where: { projectId: id },
    });

    if (!connection?.isVerified || !connection.accessToken || !connection.wabaId) {
      return devError(
        "ربط Meta مطلوب — ادخل على نظرة عامة واربط Meta الأول",
        "INVALID_REQUEST",
        400
      );
    }

    // فك تشفير الـ accessToken قبل الاستخدام مع Meta API
    const plainAccessToken = decryptToken(connection.accessToken);

    // Fetch templates from Meta
    const metaUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${connection.wabaId}/message_templates?limit=100&fields=id,name,status,category,language,rejected_reason,components`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${plainAccessToken}` },
    });

    const metaData = await metaRes.json();

    if (!metaRes.ok || metaData.error) {
      return devError(
        metaData.error?.message || "فشل الاتصال بـ Meta",
        "UPSTREAM_ERROR",
        502
      );
    }

    const metaTemplates: Array<{
      id: string;
      name: string;
      status: string;
      category?: string;
      language: string;
      rejected_reason?: string;
      components?: unknown[];
    }> = metaData.data || [];

    const statusMap: Record<string, string> = {
      APPROVED: "APPROVED",
      PENDING:  "PENDING",
      REJECTED: "REJECTED",
      DISABLED: "DISABLED",
      PAUSED:   "DISABLED",
    };

    // تصنيفات Meta المعروفة — أي قيمة خارجها تُعامل كـ UTILITY
    const KNOWN_CATEGORIES = new Set(["AUTHENTICATION", "UTILITY", "MARKETING"]);

    const localTemplates = await prisma.developerOtpTemplate.findMany({
      where: { projectId: id },
    });

    let updated = 0;
    let imported = 0;

    for (const local of localTemplates) {
      // Prefer the stable Meta id, but recover when Meta recreated the template
      // with a new id by matching the project-scoped name + language pair.
      const metaTmpl =
        (local.metaTemplateId && metaTemplates.find((m) => m.id === local.metaTemplateId)) ??
        metaTemplates.find((m) => m.name === local.name && m.language === local.language);

      if (!metaTmpl) continue;

      const newStatus = statusMap[metaTmpl.status] || local.status;
      const newRejectedReason = metaTmpl.status === "REJECTED"
        ? metaTmpl.rejected_reason || "مرفوض من Meta"
        : null;

      const syncedComponents = Array.isArray(metaTmpl.components)
        ? JSON.parse(JSON.stringify(metaTmpl.components))
        : null;
      const componentsChanged = JSON.stringify(local.metaComponents ?? null) !== JSON.stringify(syncedComponents);
      const syncedCategory = metaTmpl.category && KNOWN_CATEGORIES.has(metaTmpl.category.toUpperCase())
        ? metaTmpl.category.toUpperCase()
        : local.category;
      const derivedVariables = deriveVariables(metaTmpl.components, syncedCategory);
      const variablesChanged = derivedVariables !== undefined &&
        JSON.stringify(local.variables ?? null) !== JSON.stringify(derivedVariables);

      if (
        local.status !== newStatus ||
        local.metaTemplateId !== metaTmpl.id ||
        local.language !== metaTmpl.language ||
        local.category !== syncedCategory ||
        local.rejectedReason !== newRejectedReason ||
        componentsChanged ||
        variablesChanged
      ) {
        await prisma.developerOtpTemplate.update({
          where: { id: local.id },
          data: {
            status: newStatus as any,
            metaTemplateId: metaTmpl.id,
            language: metaTmpl.language,
            category: syncedCategory as any,
            metaComponents: syncedComponents,
    ...(derivedVariables !== undefined ? { variables: JSON.parse(JSON.stringify(derivedVariables)) } : {}),
            rejectedReason: newRejectedReason,
          },
        });
        updated++;
      }
    }

    // ── استيراد قوالب Meta التي لا سجل محلي لها ──────────────────────────
    // السبب: قالب APPROVED في Meta بلا سجل محلي كان سبب 400 دائم في الإرسال
    // (resolveTemplate لا يرى إلا الجدول المحلي). الاستيراد ينشئ السجل بنفس
    // الهوية (name + language) والحالة الحقيقية — بلا أي تجاوز للـ APPROVED.
    const matchedMetaIds = new Set(
      localTemplates
        .map((l) => l.metaTemplateId)
        .filter(Boolean) as string[]
    );
    const matchedNameLang = new Set(
      localTemplates.map((l) => `${l.name}::${l.language}`)
    );

    for (const m of metaTemplates) {
      if (!m.id || !m.name) continue;
      if (matchedMetaIds.has(m.id)) continue;
      if (matchedNameLang.has(`${m.name}::${m.language}`)) continue;

      const category = m.category && KNOWN_CATEGORIES.has(m.category.toUpperCase())
        ? m.category.toUpperCase()
        : "UTILITY";
      const isAuth = category === "AUTHENTICATION";
      const derivedVariables = deriveVariables(m.components, category);

      await prisma.developerOtpTemplate.create({
        data: {
          projectId: id,
          name: m.name,
          language: m.language,
          category: category as any,
          // قوالب AUTHENTICATION تخزن إعدادات OTP في body (JSON) حسب convention
          // المشروع — المستورد منها يُعلَّم لمراجعته من صفحة القوالب.
          body: isAuth ? JSON.stringify({ imported: true }) : "",
          status: (statusMap[m.status] || "PENDING") as any,
          metaTemplateId: m.id,
          ...(derivedVariables !== undefined ? { variables: JSON.parse(JSON.stringify(derivedVariables)) } : {}),
          metaComponents: m.components ? JSON.parse(JSON.stringify(m.components)) : undefined,
          rejectedReason: m.status === "REJECTED" ? m.rejected_reason || "مرفوض من Meta" : null,
        },
      });
      matchedMetaIds.add(m.id);
      matchedNameLang.add(`${m.name}::${m.language}`);
      imported++;
    }

    return NextResponse.json({ ok: true, updated, imported, total: metaTemplates.length });
  } catch (err) {
    console.error("[sync-templates] unexpected failure", {
      error: err instanceof Error ? err.message : "unknown error",
    });
    return devError(
      "Unable to sync templates right now. Please try again shortly.",
      "UNAVAILABLE",
      503,
    );
  }
}
