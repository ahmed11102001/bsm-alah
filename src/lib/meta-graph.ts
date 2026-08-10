// src/lib/meta-graph.ts
// نسخة Graph API الموحّدة لكل نداءات Meta في المشروع — مكان واحد للتحديث
// بدل ما النسخة تتكرر مكتوبة (hardcoded) في كل ملف على حدة.
//
// ميتا بتضمن كل نسخة سنتين بس من تاريخ إصدارها، فمحتاجين نراجع الرقم ده
// كل شوية (راجع: https://developers.facebook.com/docs/graph-api/changelog/versions/).
// آخر مراجعة: أغسطس 2026 — النسخة الحالية عند ميتا وقتها v26.0.

export const GRAPH_API_VERSION =
  process.env.NEXT_PUBLIC_GRAPH_API_VERSION ?? "v26.0";

export const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * يبني رابط Graph API كامل من path (من غير / في الأول).
 * مثال: graphApiUrl(`${phoneNumberId}/messages`)
 *   → https://graph.facebook.com/v26.0/123456/messages
 */
export function graphApiUrl(path: string): string {
  return `${GRAPH_API_BASE}/${path}`;
}
