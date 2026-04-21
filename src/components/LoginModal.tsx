"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

// ─── Animation variants ───────────────────────────────────────────────────────
const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: "easeOut" } },
  exit:    { opacity: 0, x: -20, transition: { duration: 0.15 } },
};

// ─── Small helpers ────────────────────────────────────────────────────────────
function ErrMsg({ msg }: { msg: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5"
    >
      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-red-700">{msg}</p>
    </motion.div>
  );
}

function PasswordInput({
  value, onChange, placeholder = "••••••••", ...rest
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; [k: string]: any;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        {...rest}
        type={show ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="rounded-xl pl-10 pr-4 h-12"
      />
      <button
        type="button"
        onClick={() => setShow(p => !p)}
        className="absolute left-3 top-3.5 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// Tab button
function Tab({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all relative ${
        active ? "text-[#25D366]" : "text-gray-400 hover:text-gray-600"
      }`}
    >
      {children}
      {active && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#25D366] rounded-full"
        />
      )}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router  = useRouter();
  const [view,  setView]    = useState<View>("login");
  const [busy,  setBusy]    = useState(false);
  const [err,   setErr]     = useState("");

  // login
  const [loginEmail,  setLoginEmail]  = useState("");
  const [loginPass,   setLoginPass]   = useState("");

  // register
  const [regFirst,    setRegFirst]    = useState("");
  const [regLast,     setRegLast]     = useState("");
  const [regEmail,    setRegEmail]    = useState("");
  const [regPhone,    setRegPhone]    = useState("");
  const [regPass,     setRegPass]     = useState("");
  const [regConfirm,  setRegConfirm]  = useState("");
  // instant email check
  const [emailStatus, setEmailStatus] = useState<"idle"|"checking"|"ok"|"taken">("idle");

  // join team
  const [joinEmail,   setJoinEmail]   = useState("");
  const [joinCode,    setJoinCode]    = useState("");
  const [joinPass,    setJoinPass]    = useState("");

  // forgot
  const [forgotEmail, setForgotEmail] = useState("");

  const go = (v: View) => { setView(v); setErr(""); };

  // ── Instant email check ───────────────────────────────────────
  const checkEmail = useCallback(async (email: string) => {
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailStatus("idle"); return; }
    setEmailStatus("checking");
    try {
      const r = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
      const d = await r.json();
      setEmailStatus(d.exists ? "taken" : "ok");
    } catch { setEmailStatus("idle"); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (regEmail) checkEmail(regEmail); }, 600);
    return () => clearTimeout(t);
  }, [regEmail, checkEmail]);

  // ── Login ─────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const res = await signIn("credentials", {
        email: loginEmail.toLowerCase(), password: loginPass, redirect: false,
      });
      if (!res?.ok) { setErr(res?.error || "بيانات غير صحيحة"); return; }
      onClose(); router.push("/dashboard");
    } catch { setErr("حدث خطأ، حاول مرة أخرى"); }
    finally { setBusy(false); }
  };

  // ── Register ──────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); 
    const fullName = `${regFirst.trim()} ${regLast.trim()}`.trim();
    if (!regFirst.trim() || !regLast.trim()) { setErr("الاسم الثنائي مطلوب"); return; }
    if (emailStatus === "taken") { setErr("هذا البريد مسجل بالفعل"); return; }
    if (!regPhone.trim()) { setErr("رقم الهاتف مطلوب"); return; }
    if (regPass.length < 8) { setErr("كلمة المرور 8 أحرف على الأقل"); return; }
    if (regPass !== regConfirm) { setErr("كلمتا المرور غير متطابقتين"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName, email: regEmail.toLowerCase(),
          phone: regPhone, password: regPass,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error); return; }
      toast.success("تم إنشاء الحساب بنجاح!");
      // auto-login
      await signIn("credentials", {
        email: regEmail.toLowerCase(), password: regPass, redirect: false,
      });
      onClose(); router.push("/dashboard");
    } catch { setErr("حدث خطأ، حاول مرة أخرى"); }
    finally { setBusy(false); }
  };

  // ── Join team ─────────────────────────────────────────────────
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

  // ── Forgot password ───────────────────────────────────────────
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

  // email status icon
  const emailIcon = {
    idle:     null,
    checking: <Loader2 className="w-4 h-4 animate-spin text-gray-400" />,
    ok:       <CheckCircle2 className="w-4 h-4 text-green-500" />,
    taken:    <XCircle className="w-4 h-4 text-red-400" />,
  }[emailStatus];

  // ─────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[440px] p-0 overflow-hidden rounded-3xl border-0 shadow-2xl"
        dir="rtl"
      >
        {/* Top gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#25D366] via-[#128C7E] to-[#25D366]" />

        <div className="px-7 pt-5 pb-7">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2.5 mb-5"
          >
            <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              واتس <span className="text-[#25D366]">برو</span>
            </span>
          </motion.div>

          {/* Tabs — only for main 3 views */}
          {(view === "login" || view === "register" || view === "join") && (
            <div className="flex border-b border-gray-100 mb-5">
              <Tab active={view === "login"}    onClick={() => go("login")}>دخول</Tab>
              <Tab active={view === "register"} onClick={() => go("register")}>حساب جديد</Tab>
              <Tab active={view === "join"}     onClick={() => go("join")}>انضمام لفريق</Tab>
            </div>
          )}

          {/* Views */}
          <AnimatePresence mode="wait">

            {/* ══ LOGIN ══ */}
            {view === "login" && (
              <motion.form key="login" {...slide} onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3.5 w-4 h-4 text-gray-400" />
                    <Input
                      type="email" required
                      value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="rounded-xl pr-10 h-12 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">كلمة المرور</Label>
                    <button
                      type="button"
                      onClick={() => go("forgot")}
                      className="text-xs text-[#25D366] hover:underline"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                  <PasswordInput value={loginPass} onChange={setLoginPass} />
                </div>

                {err && <ErrMsg msg={err} />}

                <Button
                  type="submit" disabled={busy}
                  className="w-full h-12 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl font-semibold text-sm"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "تسجيل الدخول"}
                </Button>
              </motion.form>
            )}

            {/* ══ REGISTER ══ */}
            {view === "register" && (
              <motion.form key="register" {...slide} onSubmit={handleRegister} className="space-y-3.5">
                {/* Full name */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">الاسم الأول</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        required value={regFirst} onChange={e => setRegFirst(e.target.value)}
                        placeholder="أحمد"
                        className="rounded-xl pr-9 h-11 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">اسم العائلة</Label>
                    <Input
                      required value={regLast} onChange={e => setRegLast(e.target.value)}
                      placeholder="محمد"
                      className="rounded-xl h-11 text-sm"
                    />
                  </div>
                </div>

                {/* Email with instant check */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      type="email" required
                      value={regEmail} onChange={e => { setRegEmail(e.target.value); setEmailStatus("idle"); }}
                      placeholder="owner@email.com"
                      className={`rounded-xl pr-9 pl-9 h-11 text-sm transition-colors ${
                        emailStatus === "taken" ? "border-red-400 focus:ring-red-300" :
                        emailStatus === "ok"    ? "border-green-400 focus:ring-green-200" : ""
                      }`}
                    />
                    <span className="absolute left-3 top-3">{emailIcon}</span>
                  </div>
                  {emailStatus === "taken" && (
                    <p className="text-xs text-red-500">هذا البريد مسجل بالفعل</p>
                  )}
                  {emailStatus === "ok" && (
                    <p className="text-xs text-green-600">البريد متاح ✓</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">رقم الهاتف <span className="text-red-400">*</span></Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      required type="tel"
                      value={regPhone} onChange={e => setRegPhone(e.target.value)}
                      placeholder="201234567890"
                      className="rounded-xl pr-9 h-11 text-sm" dir="ltr"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">كلمة المرور (8 أحرف على الأقل)</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                    <PasswordInput
                      value={regPass} onChange={setRegPass}
                      className="rounded-xl pr-9 h-11 text-sm"
                    />
                  </div>
                  {/* Strength bar */}
                  {regPass && (
                    <div className="flex gap-1 mt-1">
                      {[4,6,8,10].map((threshold, i) => (
                        <div key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            regPass.length >= threshold
                              ? i < 1 ? "bg-red-400" : i < 2 ? "bg-orange-400" : i < 3 ? "bg-yellow-400" : "bg-green-400"
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">تأكيد كلمة المرور</Label>
                  <PasswordInput
                    value={regConfirm} onChange={setRegConfirm}
                    className={`rounded-xl h-11 text-sm ${
                      regConfirm && regPass !== regConfirm ? "border-red-400" :
                      regConfirm && regPass === regConfirm ? "border-green-400" : ""
                    }`}
                  />
                  {regConfirm && regPass !== regConfirm && (
                    <p className="text-xs text-red-500">كلمتا المرور غير متطابقتين</p>
                  )}
                </div>

                {err && <ErrMsg msg={err} />}

                <Button
                  type="submit" disabled={busy || emailStatus === "taken"}
                  className="w-full h-11 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl font-semibold text-sm mt-1"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء الحساب"}
                </Button>
              </motion.form>
            )}

            {/* ══ JOIN TEAM ══ */}
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
                    <Input
                      type="email" required
                      value={joinEmail} onChange={e => setJoinEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="rounded-xl pr-10 h-12 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">كود الانضمام</Label>
                  <Input
                    required value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="WP-XXXX"
                    className="rounded-xl h-12 text-sm font-mono text-center tracking-widest border-green-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">اختر كلمة مرور</Label>
                  <PasswordInput value={joinPass} onChange={setJoinPass} />
                </div>

                {err && <ErrMsg msg={err} />}

                <Button
                  type="submit" disabled={busy}
                  className="w-full h-12 bg-[#128C7E] hover:bg-[#0e7066] text-white rounded-xl font-semibold text-sm"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "تفعيل الحساب والانضمام"}
                </Button>
              </motion.form>
            )}

            {/* ══ FORGOT PASSWORD ══ */}
            {view === "forgot" && (
              <motion.form key="forgot" {...slide} onSubmit={handleForgot} className="space-y-5">
                <div>
                  <button
                    type="button" onClick={() => go("login")}
                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4"
                  >
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
                    <Input
                      type="email" required
                      value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="rounded-xl pr-10 h-12 text-sm"
                    />
                  </div>
                </div>

                {err && <ErrMsg msg={err} />}

                <Button
                  type="submit" disabled={busy}
                  className="w-full h-12 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl font-semibold text-sm"
                >
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
                <button
                  type="button" onClick={() => go("login")}
                  className="text-sm text-[#25D366] hover:underline font-medium"
                >
                  العودة لتسجيل الدخول
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}a