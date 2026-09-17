"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, cubicBezier } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle, Loader2, KeyRound, Eye, EyeOff,
  ArrowRight, Mail,
  Phone, X,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type View = "login" | "register" | "join" | "forgot" | "reset-sent";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** لو موجودة، بنوجّه اليوزر ليها بعد نجاح الدخول/التسجيل بدل /dashboard
   *  الثابتة — بتحافظ على نية اليوزر (مثلاً باقة مختارة في /checkout). */
  callbackUrl?: string;
  lang?: "ar" | "en";
  standalone?: boolean;
  initialView?: "login" | "register" | "join";
}

// ─── Animations ───────────────────────────────────────────────────────────────
const easeSmooth = cubicBezier(0.25, 0.1, 0.25, 1);

function maskEmail(email: string) {
  const [local, domain] = email.trim().split("@", 2);
  if (!local || !domain) return email;
  return `${local[0]}***@${domain}`;
}

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: easeSmooth } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.15, ease: easeSmooth } },
};

// ─── i18n (الكارت باللغتين حسب lang) ───────────────────────────────────────────
const AUTH_T = {
  ar: {
    continueGoogle: "متابعة بـ Google",
    or: "أو",
    loginTab: "تسجيل الدخول",
    joinTab: "انضمام لفريق",
    identifier: "الإيميل أو رقم الواتساب",
    identifierPh: "example@email.com أو 01xxxxxxxxx",
    password: "كلمة المرور",
    forgot: "نسيت كلمة المرور؟",
    signIn: "تسجيل الدخول",
    noAccount: "معندكش حساب؟",
    signUp: "سجل جديد",
    regIntro: "سجل بإيميل Google أولًا، وبعدين هنأكد رقم الواتساب بكود.",
    haveAccount: "عندك حساب؟",
    completeProfile: (email: string) => `${email} ✓ — كمّل بياناتك`,
    waNumber: "رقم الواتساب",
    waHint: "هيوصلك عليه كود التأكيد",
    newPass: "كلمة المرور (8 أحرف على الأقل)",
    confirmPass: "تأكيد كلمة المرور",
    passMismatch: "كلمتا المرور غير متطابقتين",
    terms1: "أوافق على",
    terms2: "شروط الاستخدام",
    terms3: "و",
    terms4: "سياسة الخصوصية",
    termsRequired: "يجب الموافقة على شروط الاستخدام وسياسة الخصوصية.",
    badPhone: "من فضلك أدخل رقم واتساب صحيح",
    passShort: "كلمة المرور 8 أحرف على الأقل",
    sendCode: "إرسال كود التأكيد",
    changeEmail: "تغيير الإيميل",
    codeSentWa: "اتبعتلّك كود تأكيد على واتساب",
    codeOnWa: (phone: string) => `اتبعتلّك كود على واتساب (${phone}) — صالح 10 دقائق`,
    otpLabel: "كود التأكيد",
    verifyCreate: "تأكيد وإنشاء الحساب",
    noCode: "موصلش الكود؟",
    resendIn: (s: number) => `إعادة الإرسال بعد ${s} ث`,
    sendNewCode: "إرسال كود جديد",
    newCodeSent: "اتبعتلّك كود جديد على واتساب",
    enterOtp: "أدخل الكود المرسل إليك",
    genericError: "حدث خطأ، حاول مرة أخرى",
    badCreds: "بيانات الدخول غير صحيحة",
    connError: "حصل خطأ في الاتصال، حاول تاني",
    accountCreatedLogin: "تم إنشاء الحساب — سجل الدخول",
    accountCreated: "تم إنشاء الحساب بنجاح 🎉",
    joinInfo: "إذا كنت موظفاً، أدخل بريدك وكود الدعوة الذي استلمته من مدير الفريق لتفعيل حسابك.",
    email: "البريد الإلكتروني",
    inviteCode: "كود الانضمام",
    choosePass: "اختر كلمة مرور",
    activateJoin: "تفعيل الحساب والانضمام",
    joinFailed: "فشل الانضمام للفريق",
    joinedOk: "🎉 تم الانضمام إلى الفريق بنجاح! جاري تحويلك...",
    backToLogin: "العودة لتسجيل الدخول",
    forgotTitle: "نسيت كلمة المرور؟",
    forgotDesc: "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور.",
    change: "تغيير",
    sendResetLink: "إرسال رابط الاستعادة",
    sentTitle: "تم الإرسال!",
    sentDesc1: "أرسلنا رابط إعادة التعيين إلى",
    sentDesc2: "تحقق من بريدك الوارد.",
  },
  en: {
    continueGoogle: "Continue with Google",
    or: "or",
    loginTab: "Sign In",
    joinTab: "Join a team",
    identifier: "Email or WhatsApp number",
    identifierPh: "example@email.com or 01xxxxxxxxx",
    password: "Password",
    forgot: "Forgot password?",
    signIn: "Sign In",
    noAccount: "Don't have an account?",
    signUp: "Sign Up",
    regIntro: "Sign up with your Google email first, then we'll verify your WhatsApp number with a code.",
    haveAccount: "Already have an account?",
    completeProfile: (email: string) => `${email} ✓ — complete your details`,
    waNumber: "WhatsApp number",
    waHint: "You'll receive the confirmation code on it",
    newPass: "Password (8+ characters)",
    confirmPass: "Confirm password",
    passMismatch: "Passwords don't match",
    terms1: "I agree to the",
    terms2: "Terms of Use",
    terms3: "and",
    terms4: "Privacy Policy",
    termsRequired: "You must accept the Terms of Use and Privacy Policy.",
    badPhone: "Please enter a valid WhatsApp number",
    passShort: "Password must be at least 8 characters",
    sendCode: "Send confirmation code",
    changeEmail: "Change email",
    codeSentWa: "A confirmation code was sent to your WhatsApp",
    codeOnWa: (phone: string) => `A code was sent to WhatsApp (${phone}) — valid for 10 minutes`,
    otpLabel: "Confirmation code",
    verifyCreate: "Verify & create account",
    noCode: "Didn't get the code?",
    resendIn: (s: number) => `Resend in ${s}s`,
    sendNewCode: "Send a new code",
    newCodeSent: "A new code was sent to your WhatsApp",
    enterOtp: "Enter the code sent to you",
    genericError: "An error occurred, please try again",
    badCreds: "Incorrect email or password",
    connError: "Connection error, please try again",
    accountCreatedLogin: "Account created — please sign in",
    accountCreated: "Account created successfully 🎉",
    joinInfo: "If you're an employee, enter your email and the invite code you received from your team manager to activate your account.",
    email: "Email",
    inviteCode: "Invite code",
    choosePass: "Choose a password",
    activateJoin: "Activate & join",
    joinFailed: "Failed to join the team",
    joinedOk: "🎉 Joined the team successfully! Redirecting...",
    backToLogin: "Back to sign in",
    forgotTitle: "Forgot password?",
    forgotDesc: "Enter your email and we'll send you a password reset link.",
    change: "Change",
    sendResetLink: "Send reset link",
    sentTitle: "Sent!",
    sentDesc1: "We sent a reset link to",
    sentDesc2: "Check your inbox.",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ErrMsg({ msg }: { msg: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-red-700">{msg}</p>
    </motion.div>
  );
}

function PasswordInput({ value, onChange, placeholder = "••••••••", ...rest }: {
  value: string; onChange: (v: string) => void; placeholder?: string;[k: string]: any;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...rest} type={show ? "text" : "password"} value={value}
        placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="rounded-xl ps-4 pe-10 h-12" />
      <button type="button" onClick={() => setShow(p => !p)}
        className="absolute end-3 top-3.5 text-gray-400 hover:text-gray-600" tabIndex={-1}>
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── Google Button ─────────────────────────────────────────────────────────────
// تصميم Google الرسمي (brand guidelines)
function GoogleButton({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 transition-all shadow-sm text-sm font-medium text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
      ) : (
        <>
          {/* Google SVG الرسمي */}
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" />
            <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LoginModal({ isOpen, onClose, callbackUrl, lang, standalone = false, initialView = "login" }: LoginModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const effLang = lang === "en" ? "en" : "ar";
  const L = AUTH_T[effLang];
  const [view, setView] = useState<View>(standalone ? initialView : "login");
  const [busy, setBusy] = useState(false);
  const [gBusy, setGBusy] = useState(false);
  const [err, setErr] = useState("");

  // login (identifier = email OR WhatsApp number)
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // register — Google-first stepped flow (no account before WhatsApp OTP)
  const [regStep, setRegStep] = useState<"google" | "profile" | "code">("google");
  const [signupToken, setSignupToken] = useState("");
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [resendIn, setResendIn] = useState(0);

  // forgot
  const [forgotEmail, setForgotEmail] = useState("");
  const [sentToEmail, setSentToEmail] = useState("");

  // join team
  const [joinEmail, setJoinEmail] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinPhone, setJoinPhone] = useState("");
  const [joinPass, setJoinPass] = useState("");

  // standalone (/auth page): التنقل بين الأوضاع بيتم بنفس الصفحة من غير
  // remount — فلازم الـ view الداخلي يتزامن مع initialView لما الـ URL يتغير،
  // وإلا أزرار (سجل جديد / انضمام لفريق) بتغير الرابط بس من غير ما تفتح حاجة
  useEffect(() => {
    if (standalone) {
      setView(initialView);
      setErr("");
    }
  }, [standalone, initialView]);

  // Keep the modal in sync when the signup continuation token is added to the
  // URL while the modal is already open after the Google redirect.
  const loginParam = searchParams.get("login");
  const tabParam = searchParams.get("tab");
  const emailParam = searchParams.get("email");
  const codeParam = searchParams.get("code") || searchParams.get("inviteCode") || searchParams.get("joinCode");
  const signupTokenParam = searchParams.get("signupToken");
  const signupEmailParam = searchParams.get("signupEmail");
  const signupNameParam = searchParams.get("signupName");

  const go = (v: View) => {
    if (v === "register") resetRegFlow();
    setView(v); setErr("");
  };

  // التنقل بين (دخول / جديد / انضمام) داخل الصفحة مباشرة — بيحدّث الـ state
  // فورًا وبيزامن الـ URL (مع الحفاظ على باقي الباراميترات زي كود الدعوة)
  // عشان الـ deep-link والرجوع يفضلوا شغالين
  const switchAuthMode = (m: "login" | "register" | "join") => {
    go(m);
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("mode", m === "register" ? "signup" : m);
      router.replace(`/auth?${params.toString()}`, { scroll: false });
    } catch {}
  };

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    try {
      if (loginParam === "join" || tabParam === "join") {
        setView("join");
      }
      if (emailParam) {
        setJoinEmail(emailParam);
        setLoginEmail(emailParam);
      }
      if (codeParam) {
        setJoinCode(codeParam.toUpperCase().trim());
      }
      if (signupTokenParam) {
        setView("register");
        setRegStep("profile");
        setSignupToken(signupTokenParam);
        setGoogleEmail(signupEmailParam || "");
        setGoogleName(signupNameParam || "");
      }
    } catch {}

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, loginParam, tabParam, emailParam, codeParam, signupTokenParam, signupEmailParam, signupNameParam]);


  // ── Google Login ──────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setGBusy(true);
    try {
      // NextAuth بيعمل redirect تلقائي لـ Google ثم يرجع لـ /auth/callback.
      // لو عندنا callbackUrl (مثلاً جاي من /checkout) بنمررها كـ "next"
      // جوه الـ URL عشان /auth/callback يحترمها بعد ما يتأكد من الـ session
      // الحساب المكتمل يذهب للداشبورد، والحساب الجديد يدخل نفس فلو التسجيل.
      const currentLang =
        lang ||
        (typeof document !== "undefined" &&
        document.cookie.includes("NEXT_LOCALE=en")
          ? "en"
          : "ar");
      const query = new URLSearchParams();
      if (callbackUrl) query.set("next", callbackUrl);
      if (currentLang) query.set("lang", currentLang);
      query.set("authContext", "login");
      const authCallback = `/auth/callback?${query.toString()}`;
      await signIn("google", { callbackUrl: authCallback });
    } catch {
      setErr(L.genericError);
      setGBusy(false);
    }
  };

  // ── Email Login ───────────────────────────────────────────────────────────
  const handleGoogleSignup = async () => {
    setGBusy(true);
    const currentLang = lang || (document.cookie.includes("NEXT_LOCALE=en") ? "en" : "ar");
    const signupReturn = new URL("/auth", window.location.origin);
    signupReturn.searchParams.set("mode", "signup");
    signupReturn.searchParams.set("lang", currentLang);
    if (callbackUrl) signupReturn.searchParams.set("callbackUrl", callbackUrl);
    const returnTo = `${signupReturn.pathname}${signupReturn.search}`;
    const query = new URLSearchParams({ signupContext: "dashboard", returnTo });
    query.set("lang", currentLang);
    await signIn("google", {
      callbackUrl: `/auth/callback?${query.toString()}`,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      // المعرف قد يكون إيميلًا أو رقم واتساب — الـ backend يحدد تلقائيًا
      const res = await signIn("credentials", {
        email: loginEmail.trim(), password: loginPass, redirect: false,
      });
      if (!res?.ok) { setErr(res?.error || L.badCreds); return; }
      onClose(); router.push(callbackUrl || "/dashboard");
    } catch { setErr(L.genericError); }
    finally { setBusy(false); }
  };

  // ── Register: Google-first flow ──────────────────────────────────────────
  function resetRegFlow() {
    setRegStep("google");
    setSignupToken("");
    setGoogleEmail("");
    setGoogleName("");
    setRegPhone("");
    setRegPass("");
    setRegConfirm("");
    setTermsAccepted(false);
    setOtpCode("");
    setResendIn(0);
  }

  // resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const handleRegProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!termsAccepted) { setErr(L.termsRequired); return; }
    if (!/^\d{8,15}$/.test(regPhone.replace(/\D/g, ""))) { setErr(L.badPhone); return; }
    if (regPass.length < 8) { setErr(L.passShort); return; }
    if (regPass !== regConfirm) { setErr(L.passMismatch); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/signup/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupToken, phone: regPhone, password: regPass, terms: true, locale: effLang }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error || L.genericError); return; }
      setOtpCode("");
      setResendIn(60);
      setRegStep("code");
      toast.success(L.codeSentWa);
    } catch { setErr(L.genericError); }
    finally { setBusy(false); }
  };

  const handleRegResend = async () => {
    if (resendIn > 0 || busy) return;
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/auth/signup/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupToken }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(d.error || L.genericError);
        if (typeof d.retryAfter === "number") setResendIn(d.retryAfter);
        return;
      }
      setResendIn(60);
      toast.success(L.newCodeSent);
    } catch { setErr(L.genericError); }
    finally { setBusy(false); }
  };

  const handleRegVerify = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (otpCode.trim().length < 4) { setErr(L.enterOtp); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupToken, code: otpCode.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (d.code === "ALREADY_DONE") { setLoginEmail(d.email || googleEmail); go("login"); }
        setErr(d.error || L.genericError);
        return;
      }
      // الحساب اتعمل — سجل الدخول تلقائيًا بنفس الباسورد
      const res = await signIn("credentials", {
        email: d.email, password: regPass, redirect: false,
      });
      if (!res?.ok) {
        setLoginEmail(d.email || "");
        go("login");
        toast.success(L.accountCreatedLogin);
        return;
      }
      toast.success(L.accountCreated);
      onClose(); router.push(callbackUrl || "/dashboard");
    } catch { setErr(L.genericError); }
    finally { setBusy(false); }
  };

  // ── Join team ─────────────────────────────────────────────────────────────
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/auth/join-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: joinEmail.toLowerCase().trim(), inviteCode: joinCode.trim().toUpperCase(), password: joinPass }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || L.joinFailed); return; }

      toast.success(L.joinedOk);

      // Auto sign-in with credentials
      const res = await signIn("credentials", {
        email: joinEmail.toLowerCase().trim(),
        password: joinPass,
        redirect: false,
      });

      if (res?.ok) {
        onClose();
        router.push(callbackUrl || "/dashboard");
      } else {
        setLoginEmail(joinEmail.toLowerCase().trim());
        go("login");
      }
    } catch { setErr(L.genericError); }
    finally { setBusy(false); }
  };

  // ── Forgot password ───────────────────────────────────────────────────────
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.toLowerCase() }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error); return; }
      go("reset-sent");
    } catch { setErr(L.genericError); }
    finally { setBusy(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // المحتوى الداخلي مشترك بين الوضعين:
  // - standalone (/auth page): بيرجع مباشرة من غير Dialog/overlay عشان
  //   الصفحة تبان صفحة حقيقية مش popup طافي
  // - modal: بيتغلّف بـ Dialog كالمعتاد
  const inner = (
    <>
      {/* Top gradient bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#25D366] via-[#128C7E] to-[#25D366]" />

      {!standalone && (
        <button
          type="button"
          onClick={onClose}
          aria-label={effLang === "en" ? "Close" : "إغلاق"}
          className="absolute top-4 right-4 z-30 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 bg-gray-100 hover:bg-gray-200 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[#25D366]/50"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="relative flex flex-col max-h-[95vh] sm:max-h-[90vh] bg-white text-gray-900">
          <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur-sm px-7 pt-5 pb-4">
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2.5 mb-4">
              <span className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#25D366]">
                <img src="/faviconlink.svg" alt="Wani" className="w-full h-full object-cover" />
              </span>
              <span className="text-xl font-bold text-gray-900">
                WANI
              </span>
            </motion.div>

          </div>

          <div className="flex-1 overflow-y-auto px-7 pb-6 pt-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#25D366]/35 hover:scrollbar-thumb-[#25D366]">
            {/* ── تبويبات الدخول/الانضمام (زي تبويبات البورتال) ── */}
            {(view === "login" || view === "join") && (
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 mb-4">
                <button
                  type="button"
                  onClick={() => switchAuthMode("login")}
                  className={`h-10 rounded-lg text-sm transition-all ${view === "login"
                    ? "bg-white shadow-sm font-bold text-gray-900"
                    : "font-medium text-gray-500 hover:text-gray-700"
                    }`}
                >
                  {L.loginTab}
                </button>
                <button
                  type="button"
                  onClick={() => switchAuthMode("join")}
                  className={`h-10 rounded-lg text-sm transition-all ${view === "join"
                    ? "bg-white shadow-sm font-bold text-gray-900"
                    : "font-medium text-gray-500 hover:text-gray-700"
                    }`}
                >
                  {L.joinTab}
                </button>
              </div>
            )}
            <AnimatePresence mode="wait">

              {/* ══ LOGIN ══ */}
              {view === "login" && (
                <motion.div key="login" {...slide} className="space-y-4">

                  {/* ── Google (Primary CTA) ── */}
                  <GoogleButton loading={gBusy} onClick={handleGoogle} label={L.continueGoogle} />

                  <OrDivider label={L.or} />

                  {/* ── Email or Phone / Password (Secondary) ── */}
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">{L.identifier}</Label>
                      <div className="relative">
                        <Mail className="absolute start-3 top-3.5 w-4 h-4 text-gray-400" />
                        <Input type="text" required value={loginEmail}
                          onChange={e => setLoginEmail(e.target.value)}
                          placeholder={L.identifierPh}
                          className="rounded-xl ps-10 h-12 text-sm border-gray-200" dir="auto" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700">{L.password}</Label>
                        <button type="button" onClick={() => { setForgotEmail(loginEmail.includes("@") ? loginEmail.trim() : ""); go("forgot"); }}
                          className="text-xs text-[#25D366] hover:underline">
                          {L.forgot}
                        </button>
                      </div>
                      <PasswordInput value={loginPass} onChange={setLoginPass} />
                    </div>

                    {err && <ErrMsg msg={err} />}

                    <Button type="submit" disabled={busy}
                      className="w-full h-12 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl font-semibold text-sm">
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : L.signIn}
                    </Button>
                  </form>

                  <p className="text-center">
                    <span className="text-sm text-gray-400">{L.noAccount}</span>{" "}
                    <button type="button" onClick={() => switchAuthMode("register")} className="text-base font-bold text-[#25D366] hover:underline">
                      {L.signUp}
                    </button>
                  </p>
                </motion.div>
              )}

              {/* ══ REGISTER — Google-first + WhatsApp OTP ══ */}
              {view === "register" && (
                <motion.div key="register" {...slide} className="space-y-4">

                  {/* Step 1: Google */}
                  {regStep === "google" && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {L.regIntro}
                      </p>
                      <GoogleButton loading={gBusy} onClick={handleGoogleSignup} label={L.continueGoogle} />
                      {err && <ErrMsg msg={err} />}
                      <p className="text-center">
                        <span className="text-sm text-gray-400">{L.haveAccount}</span>{" "}
                        <button type="button" onClick={() => switchAuthMode("login")} className="text-base font-bold text-[#25D366] hover:underline">
                          {L.signIn}
                        </button>
                      </p>
                    </div>
                  )}

                  {/* Step 2: phone + password + terms */}
                  {regStep === "profile" && (
                    <form onSubmit={handleRegProfile} className="space-y-3.5">
                      <div className="rounded-2xl bg-green-50 border border-green-100 px-3.5 py-2.5 text-xs text-green-800">
                        {L.completeProfile(googleEmail)}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-600">{L.waNumber} <span className="text-red-400">*</span></Label>
                        <div className="relative">
                          <Phone className="absolute start-3 top-3 w-4 h-4 text-gray-400" />
                          <Input required type="tel" value={regPhone}
                            onChange={e => setRegPhone(e.target.value)}
                            placeholder="01xxxxxxxxx" className="rounded-xl ps-9 h-11 text-sm border-gray-200" dir="ltr" />
                        </div>
                        <p className="text-[11px] text-gray-400">{L.waHint}</p>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-600">{L.newPass}</Label>
                        <PasswordInput value={regPass} onChange={setRegPass} className="rounded-xl h-11 text-sm border-gray-200" />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-600">{L.confirmPass}</Label>
                        <PasswordInput value={regConfirm} onChange={setRegConfirm}
                          className={`rounded-xl h-11 text-sm border-gray-200 ${regConfirm && regPass !== regConfirm ? "border-red-400" :
                              regConfirm && regPass === regConfirm ? "border-green-400" : ""
                            }`} />
                        {regConfirm && regPass !== regConfirm && (
                          <p className="text-xs text-red-500">{L.passMismatch}</p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <label htmlFor="terms-checkbox" className="flex items-start gap-3 cursor-pointer">
                          <input id="terms-checkbox" type="checkbox" checked={termsAccepted}
                            onChange={e => setTermsAccepted(e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 bg-white text-[#25D366] focus:ring-[#25D366]" />
                          <span className="text-sm leading-relaxed text-gray-700">
                            {L.terms1}{" "}
                            <a href="/terms" target="_blank" rel="noreferrer" className="text-[#25D366] hover:text-[#1fa455]">
                              {L.terms2}
                            </a>
                            {" "}{L.terms3}{" "}
                            <a href="/privacy" target="_blank" rel="noreferrer" className="text-[#25D366] hover:text-[#1fa455]">
                              {L.terms4}
                            </a>
                            .
                          </span>
                        </label>
                      </div>

                      {err && <ErrMsg msg={err} />}

                      <div className="sticky bottom-0 z-10 -mx-7 px-7 pb-4 pt-4 bg-white/95 border-t border-gray-100">
                        <Button type="submit" disabled={busy || !termsAccepted}
                          className="w-full h-11 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl font-semibold text-sm disabled:opacity-60">
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : L.sendCode}
                        </Button>
                        <button type="button" onClick={resetRegFlow}
                          className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600">
                          {L.changeEmail}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Step 3: OTP code */}
                  {regStep === "code" && (
                    <form onSubmit={handleRegVerify} className="space-y-4">
                      <div className="rounded-2xl bg-green-50 border border-green-100 px-3.5 py-2.5 text-xs text-green-800 leading-relaxed">
                        {L.codeOnWa(regPhone)}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">{L.otpLabel}</Label>
                        <Input required value={otpCode}
                          onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="••••••" inputMode="numeric" dir="ltr"
                          className="rounded-xl h-12 text-center text-xl tracking-[0.5em] font-bold border-gray-200" />
                      </div>

                      {err && <ErrMsg msg={err} />}

                      <Button type="submit" disabled={busy}
                        className="w-full h-12 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl font-semibold text-sm">
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : L.verifyCreate}
                      </Button>

                      <p className="text-xs text-gray-400 text-center">
                        {L.noCode}{" "}
                        {resendIn > 0 ? (
                          <span>{L.resendIn(resendIn)}</span>
                        ) : (
                          <button type="button" onClick={handleRegResend} className="text-[#25D366] hover:underline">
                            {L.sendNewCode}
                          </button>
                        )}
                      </p>
                    </form>
                  )}
                </motion.div>
              )}

              {/* ══ JOIN TEAM — بدون Google (عضو الفريق لازم يستخدم كود الدعوة) ══ */}
              {view === "join" && (
                <motion.form key="join" {...slide} onSubmit={handleJoin} className="space-y-4">
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-3.5 flex items-start gap-2.5">
                    <KeyRound className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-green-800 leading-relaxed">
                      {L.joinInfo}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">{L.email}</Label>
                    <div className="relative">
                      <Mail className="absolute start-3 top-3.5 w-4 h-4 text-gray-400" />
                      <Input type="email" required value={joinEmail}
                        onChange={e => setJoinEmail(e.target.value)}
                        placeholder="your@email.com" className="rounded-xl ps-10 h-12 text-sm" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">{L.inviteCode}</Label>
                    <Input required value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="WANI-XXXX-XXXX"
                      className="rounded-xl h-12 text-sm font-mono text-center tracking-widest border-green-200" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">{L.choosePass}</Label>
                    <PasswordInput value={joinPass} onChange={setJoinPass} />
                  </div>

                  {err && <ErrMsg msg={err} />}

                  <Button type="submit" disabled={busy}
                    className="w-full h-12 bg-[#128C7E] hover:bg-[#0e7066] text-white rounded-xl font-semibold text-sm">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : L.activateJoin}
                  </Button>
                </motion.form>
              )}

              {/* ══ FORGOT PASSWORD ══ */}
              {view === "forgot" && (
                <motion.form key="forgot" {...slide} onSubmit={handleForgot} className="space-y-5">
                  <div>
                    <button type="button" onClick={() => go("login")}
                      className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4">
                      <ArrowRight className="w-4 h-4 ltr:-scale-x-100" /> {L.backToLogin}
                    </button>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">{L.forgotTitle}</h2>
                    <p className="text-sm text-gray-500">
                      {L.forgotDesc}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">{L.email}</Label>
                    {forgotEmail ? (
                      <div className="flex h-12 items-center justify-between rounded-xl border border-green-200 bg-green-50 px-3 text-sm">
                        <span className="flex items-center gap-2 text-gray-700"><Mail className="w-4 h-4 text-[#25D366]" />{maskEmail(forgotEmail)}</span>
                        <button type="button" onClick={() => setForgotEmail("")} className="text-xs text-[#128C7E] hover:underline">{L.change}</button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Mail className="absolute start-3 top-3.5 w-4 h-4 text-gray-400" />
                        <Input type="email" required value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          placeholder="example@email.com" className="rounded-xl ps-10 h-12 text-sm" />
                      </div>
                    )}
                  </div>

                  {err && <ErrMsg msg={err} />}

                  <Button type="submit" disabled={busy}
                    className="w-full h-12 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl font-semibold text-sm">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : L.sendResetLink}
                  </Button>
                </motion.form>
              )}

              {/* ══ RESET SENT ══ */}
              {view === "reset-sent" && (
                <motion.div key="sent" {...slide} className="text-center py-4 space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{L.sentTitle}</h2>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      {L.sentDesc1} <strong>{forgotEmail}</strong>.<br />
                      {L.sentDesc2}
                    </p>
                  </div>
                  <button type="button" onClick={() => go("login")}
                    className="text-sm text-[#25D366] hover:underline font-medium">
                    {L.backToLogin}
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
    </>
  );

  if (standalone) return inner;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="force-light w-[95vw] sm:max-w-[440px] max-h-[95vh] sm:max-h-[90vh] p-0 overflow-hidden rounded-3xl border-0 shadow-2xl"
        dir={effLang === "en" ? "ltr" : "rtl"}
      >
        {inner}
      </DialogContent>
    </Dialog>
  );
}
