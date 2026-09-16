// src/lib/google-verify.ts
// ─── التحقق من Google ID Token server-side ────────────────────────────────
// يُستخدم في بداية فلو التسجيل (داشبورد + بورتال): إثبات ملكية الإيميل عبر جوجل.
// بدون مكتبات إضافية — عبر tokeninfo endpoint الرسمي.

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity | null> {
  try {
    if (!idToken || typeof idToken !== "string" || idToken.length > 8192) return null;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("[google-verify] GOOGLE_CLIENT_ID missing");
      return null;
    }

    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      { method: "GET" }
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== "object") return null;

    // aud لازم يكون الـ Client ID بتاعنا — وإلا التوكن مطلّع لتطبيق تاني
    if (data.aud !== clientId) return null;
    if (!data.email || typeof data.email !== "string") return null;
    // iss لازم جوجل
    if (data.iss !== "https://accounts.google.com" && data.iss !== "accounts.google.com") {
      return null;
    }

    return {
      sub: String(data.sub ?? ""),
      email: data.email.toLowerCase().trim(),
      emailVerified: data.email_verified === "true" || data.email_verified === true,
      name: typeof data.name === "string" ? data.name : null,
      picture: typeof data.picture === "string" ? data.picture : null,
    };
  } catch {
    return null;
  }
}
