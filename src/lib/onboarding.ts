// src/lib/onboarding.ts
//
// مصدر واحد لتحديد: هل اليوزر ده لازم يمر على Google Onboarding؟
// بيتستخدم في auth.ts (jwt callback) وفي /api/onboarding كـ server-side guard.
//
// القاعدة الوحيدة المسموح بيها:
//   signupMethod === GOOGLE
//   AND onboardingCompleted === false
//   AND مش Team Member (parentId فاضي)
//
// أي مستخدم MANUAL أو TEAM_INVITE ميعديش من هنا أبداً، حتى لو ناقصه بيانات.

export type OnboardingCheckUser = {
  signupMethod?: "MANUAL" | "GOOGLE" | "TEAM_INVITE" | null;
  onboardingCompleted?: boolean | null;
  parentId?: string | null;
};

export function needsGoogleOnboarding(user: OnboardingCheckUser | null | undefined): boolean {
  if (!user) return false;
  if (user.parentId) return false; // Team Member — أبدًا
  if (user.signupMethod !== "GOOGLE") return false; // MANUAL — أبدًا
  return !user.onboardingCompleted;
}
