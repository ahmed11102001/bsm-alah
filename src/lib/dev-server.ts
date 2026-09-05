// src/lib/dev-server.ts
// ── Server-only helpers for the Developers section ──────────────────────────
// (ملف منفصل عن dev-links.ts عشان next/headers و next/navigation
//  ما يتسربوش لأي client bundle)

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { devPathForHost } from "./dev-links";

/**
 * redirect واعٍ بالهوست للـ server components/layouts جوه قسم المطورين.
 * على الـ subdomain يوجّه لمسار من غير بادئة، وعلى الدومين الرئيسي بالبادئة.
 *   await devRedirect("/developers/signin");
 */
export async function devRedirect(path: string): Promise<never> {
  const h = await headers();
  redirect(
    devPathForHost(path, h.get("x-forwarded-host") ?? h.get("host"))
  );
}
