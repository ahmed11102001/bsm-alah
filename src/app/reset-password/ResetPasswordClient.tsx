"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

function PwInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xl pl-10 text-sm"
        placeholder="••••••••"
      />
      <button
        type="button"
        onClick={() => setShow((p) => !p)}
        className="absolute left-3 top-3.5 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function ResetPasswordClient() {
  const params = useSearchParams();
  const router = useRouter();

  const token = params.get("token");

  const [pw, setPw] = useState("");
  const [conf, setConf] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    if (!token) {
      setErr("رابط غير صالح أو منتهي");
      return;
    }

    if (pw.length < 8) {
      setErr("كلمة المرور 8 أحرف على الأقل");
      return;
    }

    if (pw !== conf) {
      setErr("كلمتا المرور غير متطابقتين");
      return;
    }

    setBusy(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: pw,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(data.error || "حدث خطأ");
        return;
      }

      setDone(true);
      toast.success("تم تغيير كلمة المرور بنجاح");

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setErr("حدث خطأ في السيرفر");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden"
      >
        <div className="h-1.5 bg-gradient-to-r from-[#25D366] via-[#128C7E] to-[#25D366]" />

        <div className="p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">
              واتس <span className="text-[#25D366]">برو</span>
            </span>
          </div>

          {/* Success state */}
          {done ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-3"
            >
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                تم تغيير كلمة المرور
              </h2>
              <p className="text-sm text-gray-500">
                جاري تحويلك لصفحة تسجيل الدخول...
              </p>
            </motion.div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <h1 className="text-xl font-bold text-gray-900">
                إعادة تعيين كلمة المرور
              </h1>

              {/* Password */}
              <div className="space-y-1.5">
                <Label>كلمة المرور الجديدة</Label>
                <PwInput value={pw} onChange={setPw} />
              </div>

              {/* Confirm */}
              <div className="space-y-1.5">
                <Label>تأكيد كلمة المرور</Label>
                <PwInput value={conf} onChange={setConf} />
              </div>

              {/* Error */}
              {err && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                  <p className="text-sm text-red-700">{err}</p>
                </div>
              )}

              {/* Button */}
              <Button
                type="submit"
                disabled={busy || !token}
                className="w-full h-12 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl font-semibold"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "تغيير كلمة المرور"
                )}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}