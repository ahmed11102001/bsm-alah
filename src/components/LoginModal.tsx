"use client";

import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, cubicBezier } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  AlertCircle, Loader2, KeyRound, Eye, EyeOff,
  CheckCircle2, XCircle, ArrowRight, Mail, Lock,
  Phone, User, MessageCircle,
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
}

// ─── Animations ───────────────────────────────────────────────────────────────
const easeSmooth = cubicBezier(0.25, 0.1, 0.25, 1);

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: easeSmooth } },
  exit:    { opacity: 0, x: -20, transition: { duration: 0.15, ease: easeSmooth } },
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
  value: string; onChange: (v: string) => void; placeholder?: string; [k: string]: any;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...rest} type={show ? "text" : "password"} value={value}
        placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="rounded-xl pl-10 pr-4 h-12" />
      <button type="button" onClick={() => setShow(p => !p)}
        className="absolute left-3 top-3.5 text-gray-400 hover:text-gray-600" tabIndex={-1}>
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function Tab({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all relative ${
        active ? "text-[#25D366]" : "text-gray-400 hover:text-gray-600"
      }`}>
      {children}
      {active && (
        <motion.div layoutId="tab-indicator"
          className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#25D366] rounded-full" />
      )}
    </button>
  );
}

// ─── Google Button ─────────────────────────────────────────────────────────────
// تصميم Google الرسمي (brand guidelines)
function GoogleButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
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
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          متابعة بـ Google
        </>
      )}
    </button>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-xs text-gray-400">أو</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LoginModal({ isOpen, onClose, callbackUrl }: LoginModalProps) {
  const router  = useRouter();
  const [view,  setView]  = useState<View>("login");
  const [busy,  setBusy]  = useState(false);
  const [gBusy, setGBusy] = useState(false);
  const [err,   setErr]   = useState("");

  // login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass,  setLoginPass]  = useState("");

  // register
  const [regFirst,   setRegFirst]   = useState("");
  const [regLast,    setRegLast]    = useState("");
  const [regEmail,   setRegEmail]   = useState("");
  const [regPhone,   setRegPhone]   = useState("");
  const [regPass,    setRegPass]    = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // join team
  const [joinEmail, setJoinEmail] = useState("");
  const [joinCode,  setJoinCode]  = useState("");
  const [joinPass,  setJoinPass]  = useState("");

  // forgot
  const [forgotEmail, setForgotEmail] = useState("");

  const go = (v: View) => { setView(v); setErr(""); };

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const emailFormatOk = /\S+@\S+\.\S+/.test(regEmail);
  const emailIcon = regEmail
    ? emailFormatOk
      ? <CheckCircle2 className="w-4 h-4 text-green-500" />
      : <XCircle className="w-4 h-4 text-red-400" />
    : null;

  // ── Google Login ──────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setGBusy(true);
    try {
      // NextAuth بيعمل redirect تلقائي لـ Google ثم يرجع لـ /auth/callback.
      // لو عندنا callbackUrl (مثلاً جاي من /checkout) بنمررها كـ "next"
      // جوه الـ URL عشان /auth/callback يحترمها بعد ما يتأكد من الـ session
      // (بعد الـ onboarding لو محتاج، أو مباشرة لو لأ).
      const authCallback = callbackUrl
        ? `/auth/callback?next=${encodeURIComponent(callbackUrl)}`
        : "/auth/callback";
      await signIn("google", { callbackUrl: authCallback });
    } catch {
      setErr("حدث خطأ، حاول مرة أخرى");
      setGBusy(false);
    }
  };

  // ── Email Login ───────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const res = await signIn("credentials", {
        email: loginEmail.toLowerCase(), password: loginPass, redirect: false,
      });
      if (!res?.ok) { setErr(res?.error || "بيانات غير صحيحة"); return; }
      onClose(); router.push(callbackUrl || "/dashboard");
    } catch { setErr("حدث خطأ، حاول مرة أخرى"); }
    finally { setBusy(false); }
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!termsAccepted) {
      setErr("يجب الموافقة على شروط الاستخدام وسياسة الخصوصية.");
      return;
    }
    const fullName = `${regFirst.trim()} ${regLast.trim()}`.trim();
    if (!regFirst.trim() || !regLast.trim()) { setErr("الاسم الثنائي مطلوب"); return; }
    if (!emailFormatOk)                       { setErr("صيغة البريد غير صحيحة"); return; }
    if (!/^\d{8,15}$/.test(regPhone.replace(/\D/g, ""))) { setErr("من فضلك أدخل رقم هاتف صحيح"); return; }
    if (regPass.length < 8)                   { setErr("كلمة المرور 8 أحرف على الأقل"); return; }
    if (regPass !== regConfirm)               { setErr("كلمتا المرور غير متطابقتين"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, email: regEmail.toLowerCase(), phone: regPhone, password: regPass }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error); return; }
      toast.success("تم إنشاء الحساب بنجاح!");
      await signOut({ redirect: false });
      await signIn("credentials", { email: regEmail.toLowerCase(), password: regPass, redirect: false });
      onClose(); router.push(callbackUrl || "/dashboard");
    } catch { setErr("حدث خطأ، حاول مرة أخرى"); }
    finally { setBusy(false); }
  };

  // ── Join team ─────────────────────────────────────────────────────────────
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/auth/join-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: joinEmail.toLowerCase(), inviteCode: joinCode, password: joinPass }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error); return; }
      toast.success("تم تفعيل حسابك!");
      setLoginEmail(joinEmail); go("login");
    } catch { setErr("حدث خطأ، حاول مرة أخرى"); }
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
    } catch { setErr("حدث خطأ، حاول مرة أخرى"); }
    finally { setBusy(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-[95vw] sm:max-w-[440px] max-h-[95vh] sm:max-h-[90vh] p-0 overflow-hidden rounded-3xl border-0 shadow-2xl"
        dir="rtl"
      >
        {/* Top gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#25D366] via-[#128C7E] to-[#25D366]" />

        <div className="flex flex-col max-h-[95vh] sm:max-h-[90vh] bg-[#090A0B] text-white">
          <div className="sticky top-0 z-20 border-b border-white/10 bg-[#090A0B]/95 backdrop-blur-sm px-7 pt-5 pb-4">
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-50">
                WANI
              </span>
            </motion.div>

            {(view === "login" || view === "register" || view === "join") && (
              <div className="flex border-b border-white/10 mb-0">
                <Tab active={view === "login"}    onClick={() => go("login")}>دخول</Tab>
                <Tab active={view === "register"} onClick={() => go("register")}>حساب جديد</Tab>
                <Tab active={view === "join"}     onClick={() => go("join")}>انضمام لفريق</Tab>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-7 pb-6 pt-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#25D366]/35 hover:scrollbar-thumb-[#25D366]">
            <AnimatePresence mode="wait">

            {/* ══ LOGIN ══ */}
            {view === "login" && (
              <motion.div key="login" {...slide} className="space-y-4">

                {/* ── Google (Primary CTA) ── */}
                <GoogleButton loading={gBusy} onClick={handleGoogle} />

                <OrDivider />

                {/* ── Email / Password (Secondary) ── */}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-3.5 w-4 h-4 text-gray-400" />
                      <Input type="email" required value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="rounded-xl pr-10 h-12 text-sm" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-700">كلمة المرور</Label>
                      <button type="button" onClick={() => go("forgot")}
                        className="text-xs text-[#25D366] hover:underline">
                        نسيت كلمة المرور؟
                      </button>
                    </div>
                    <PasswordInput value={loginPass} onChange={setLoginPass} />
                  </div>

                  {err && <ErrMsg msg={err} />}

                  <Button type="submit" disabled={busy}
                    className="w-full h-12 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl font-semibold text-sm">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "تسجيل الدخول"}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* ══ REGISTER ══ */}
            {view === "register" && (
              <motion.div key="register" {...slide} className="space-y-4">

                {/* ── Google (Primary CTA) ── */}
                <GoogleButton loading={gBusy} onClick={handleGoogle} />

                <OrDivider />

                {/* ── Email Register (Secondary) ── */}
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">الاسم الأول</Label>
                      <div className="relative">
                        <User className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                        <Input required value={regFirst} onChange={e => setRegFirst(e.target.value)}
                          placeholder="أحمد" className="rounded-xl pr-9 h-11 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">اسم العائلة</Label>
                      <Input required value={regLast} onChange={e => setRegLast(e.target.value)}
                        placeholder="محمد" className="rounded-xl h-11 text-sm" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                      <Input type="email" required value={regEmail}
                        onChange={e => setRegEmail(e.target.value)} placeholder="owner@email.com"
                        className={`rounded-xl pr-9 pl-9 h-11 text-sm transition-colors ${
                          regEmail && !emailFormatOk ? "border-red-400 focus:ring-red-300" :
                          regEmail &&  emailFormatOk ? "border-green-400 focus:ring-green-200" : ""
                        }`} />
                      <span className="absolute left-3 top-3">{emailIcon}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">رقم الهاتف <span className="text-red-400">*</span></Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                      <Input required type="tel" value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                        placeholder="201234567890" className="rounded-xl pr-9 h-11 text-sm" dir="ltr" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">كلمة المرور (8 أحرف على الأقل)</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                      <PasswordInput value={regPass} onChange={setRegPass} className="rounded-xl pr-9 h-11 text-sm" />
                    </div>
                    {regPass && (
                      <div className="flex gap-1 mt-1">
                        {[4,6,8,10].map((threshold, i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                            regPass.length >= threshold
                              ? i < 1 ? "bg-red-400" : i < 2 ? "bg-orange-400" : i < 3 ? "bg-yellow-400" : "bg-green-400"
                              : "bg-gray-200"
                          }`} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">تأكيد كلمة المرور</Label>
                    <PasswordInput value={regConfirm} onChange={setRegConfirm}
                      className={`rounded-xl h-11 text-sm ${
                        regConfirm && regPass !== regConfirm ? "border-red-400" :
                        regConfirm && regPass === regConfirm ? "border-green-400" : ""
                      }`} />
                    {regConfirm && regPass !== regConfirm && (
                      <p className="text-xs text-red-500">كلمتا المرور غير متطابقتين</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <label htmlFor="terms-checkbox" className="flex items-start gap-3 cursor-pointer">
                      <input id="terms-checkbox" type="checkbox" checked={termsAccepted}
                        onChange={e => setTermsAccepted(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-400 bg-black text-[#25D366] focus:ring-[#25D366]" />
                      <span className="text-sm leading-relaxed text-gray-200">
                        أوافق على
                        <a href="/terms" target="_blank" rel="noreferrer"
                          className="ml-1 text-[#25D366] transition-colors duration-150 hover:text-[#1fa455] focus:outline-none focus:ring-2 focus:ring-[#25D366]/50 rounded">
                          شروط الاستخدام
                        </a>
                        و
                        <a href="/privacy" target="_blank" rel="noreferrer"
                          className="mx-1 text-[#25D366] transition-colors duration-150 hover:text-[#1fa455] focus:outline-none focus:ring-2 focus:ring-[#25D366]/50 rounded">
                          سياسة الخصوصية
                        </a>
                        .
                      </span>
                    </label>
                  </div>

                  {err && <ErrMsg msg={err} />}

                  <div className="sticky bottom-0 z-10 -mx-7 px-7 pb-4 pt-4 bg-[#090A0B]/95 border-t border-white/10">
                    <Button type="submit" disabled={busy || !termsAccepted || (!!regEmail && !emailFormatOk)}
                      className="w-full h-11 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl font-semibold text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60">
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء الحساب"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ══ JOIN TEAM — بدون Google (عضو الفريق لازم يستخدم كود الدعوة) ══ */}
            {view === "join" && (
              <motion.form key="join" {...slide} onSubmit={handleJoin} className="space-y-4">
                <div className="bg-green-50 border border-green-100 rounded-2xl p-3.5 flex items-start gap-2.5">
                  <KeyRound className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-green-800 leading-relaxed">
                    إذا كنت موظفاً، أدخل بريدك وكود الدعوة الذي استلمته من مدير الفريق لتفعيل حسابك.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3.5 w-4 h-4 text-gray-400" />
                    <Input type="email" required value={joinEmail}
                      onChange={e => setJoinEmail(e.target.value)}
                      placeholder="your@email.com" className="rounded-xl pr-10 h-12 text-sm" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">كود الانضمام</Label>
                  <Input required value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="WP-XXXX"
                    className="rounded-xl h-12 text-sm font-mono text-center tracking-widest border-green-200" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">اختر كلمة مرور</Label>
                  <PasswordInput value={joinPass} onChange={setJoinPass} />
                </div>

                {err && <ErrMsg msg={err} />}

                <Button type="submit" disabled={busy}
                  className="w-full h-12 bg-[#128C7E] hover:bg-[#0e7066] text-white rounded-xl font-semibold text-sm">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "تفعيل الحساب والانضمام"}
                </Button>
              </motion.form>
            )}

            {/* ══ FORGOT PASSWORD ══ */}
            {view === "forgot" && (
              <motion.form key="forgot" {...slide} onSubmit={handleForgot} className="space-y-5">
                <div>
                  <button type="button" onClick={() => go("login")}
                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4">
                    <ArrowRight className="w-4 h-4" /> العودة لتسجيل الدخول
                  </button>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">نسيت كلمة المرور؟</h2>
                  <p className="text-sm text-gray-500">
                    أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3.5 w-4 h-4 text-gray-400" />
                    <Input type="email" required value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="example@email.com" className="rounded-xl pr-10 h-12 text-sm" />
                  </div>
                </div>

                {err && <ErrMsg msg={err} />}

                <Button type="submit" disabled={busy}
                  className="w-full h-12 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl font-semibold text-sm">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "إرسال رابط الاستعادة"}
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
                  <h2 className="text-lg font-bold text-gray-900">تم الإرسال!</h2>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    أرسلنا رابط إعادة التعيين إلى <strong>{forgotEmail}</strong>.<br />
                    تحقق من بريدك الوارد.
                  </p>
                </div>
                <button type="button" onClick={() => go("login")}
                  className="text-sm text-[#25D366] hover:underline font-medium">
                  العودة لتسجيل الدخول
                </button>
              </motion.div>
            )}

          </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}