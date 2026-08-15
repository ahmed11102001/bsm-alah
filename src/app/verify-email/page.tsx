"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type PageState = "loading" | "success" | "error";

const GENERIC_ERROR = "رابط التحقق غير صالح أو انتهت صلاحيته.";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [state, setState] = useState<PageState>(token ? "loading" : "error");
  const [email, setEmail] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { method: "GET" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        setState(response.ok && data.success ? "success" : "error");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const resendVerification = async () => {
    if (!email.trim()) {
      setResendMessage("اكتب بريدك الإلكتروني لإرسال رابط جديد.");
      return;
    }

    setResendBusy(true);
    setResendMessage("");
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      setResendMessage(response.ok ? "إذا كان الحساب يحتاج إلى تأكيد، تم إرسال رابط جديد." : (data.error || GENERIC_ERROR));
    } catch {
      setResendMessage("تعذر إرسال الرابط الآن. حاول مرة أخرى.");
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 px-4 py-10 flex items-center justify-center">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900 text-white shadow-2xl">
        <CardHeader className="items-center text-center pb-3">
          <div className={`mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${state === "success" ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400"}`}>
            {state === "loading" ? <Loader2 className="h-8 w-8 animate-spin" /> : state === "success" ? <CheckCircle2 className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
          </div>
          <CardTitle className="text-2xl">
            {state === "loading" ? "جاري تأكيد بريدك الإلكتروني..." : state === "success" ? "تم تأكيد بريدك الإلكتروني بنجاح ✅" : "رابط التحقق غير صالح"}
          </CardTitle>
          <CardDescription className="text-slate-300">
            {state === "loading" ? "لحظات من فضلك." : state === "success" ? "أصبح حسابك جاهزًا للاستخدام." : GENERIC_ERROR}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {state === "success" ? (
            <Button className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={() => router.push("/?openLogin=1")}>
              الانتقال إلى تسجيل الدخول
            </Button>
          ) : state === "error" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-300"><MailCheck className="h-4 w-4" /> إعادة إرسال رابط التحقق</div>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="البريد الإلكتروني" className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500" />
              <Button className="w-full" onClick={resendVerification} disabled={resendBusy}>
                {resendBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "إعادة إرسال رابط التحقق"}
              </Button>
              {resendMessage && <p className="text-center text-sm text-slate-300">{resendMessage}</p>}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
