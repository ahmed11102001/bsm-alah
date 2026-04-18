"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Users2, KeyRound } from "lucide-react"; // ضفنا أيقونات جديدة
import { toast } from "sonner";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("login");

  // Login state
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  // Register state (Owner)
  const [registerData, setRegisterData] = useState({ name: "", email: "", password: "", phone: "" });

  // Join Team state (Member)
  const [joinData, setJoinData] = useState({ email: "", password: "", inviteCode: "" });

  // ==================== LOGIN ====================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: loginData.email,
        password: loginData.password,
        redirect: false,
      });
      if (!result?.ok) {
        setError(result?.error || "خطأ في تسجيل الدخول");
        return;
      }
      onClose();
      router.push("/dashboard");
    } catch (err) {
      setError("حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== JOIN TEAM (جديد) ====================
  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/join-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(joinData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "فشل الانضمام للفريق");
        return;
      }

      toast.success("تم تفعيل حسابك بنجاح! يمكنك الآن تسجيل الدخول.");
      setActiveTab("login"); // حوله لتبويب تسجيل الدخول بعد النجاح
      setLoginData({ ...loginData, email: joinData.email }); // عبيله الإيميل جاهز
    } catch (err) {
      setError("حدث خطأ في الاتصال بالسيرفر");
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== REGISTER (Owner) ====================
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const registerRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });

      if (!registerRes.ok) {
        const errData = await registerRes.json();
        setError(errData.error || "فشل التسجيل");
        return;
      }

      await signIn("credentials", {
        email: registerData.email,
        password: registerData.password,
        redirect: false,
      });

      onClose();
      router.push("/dashboard");
    } catch (err) {
      setError("حدث خطأ أثناء التسجيل");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-6 rounded-[2rem]" dir="rtl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-black text-center text-gray-800">
            مرحباً بك في واتس برو
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 p-1 rounded-xl">
            <TabsTrigger value="login" className="rounded-lg font-bold">دخول</TabsTrigger>
            <TabsTrigger value="register" className="rounded-lg font-bold">إنشاء مالك</TabsTrigger>
            <TabsTrigger value="join" className="rounded-lg font-bold text-green-700 bg-green-50/50">انضمام لفريق</TabsTrigger>
          </TabsList>

          {/* ----- LOGIN ----- */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input type="email" placeholder="example@email.com" value={loginData.email} onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} required className="rounded-xl p-6" />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <Input type="password" placeholder="••••••••" value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} required className="rounded-xl p-6" />
              </div>
              {error && <ErrorMessage message={error} />}
              <Button type="submit" className="w-full h-12 bg-green-600 hover:bg-green-700 rounded-xl font-bold" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : "تسجيل دخول"}
              </Button>
            </form>
          </TabsContent>

          {/* ----- REGISTER ----- */}
          <TabsContent value="register">
             <form onSubmit={handleRegister} className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <Label>اسم النشاط / المالك</Label>
                <Input placeholder="أحمد محمد" value={registerData.name} onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })} required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input type="email" placeholder="owner@email.com" value={registerData.email} onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })} required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <Input type="password" placeholder="••••••••" value={registerData.password} onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })} required className="rounded-xl" />
              </div>
              {error && <ErrorMessage message={error} />}
              <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : "إنشاء حساب جديد"}
              </Button>
            </form>
          </TabsContent>

          {/* ----- JOIN TEAM (The New Logic) ----- */}
          <TabsContent value="join">
            <div className="bg-green-50/50 p-4 rounded-2xl mb-4 border border-green-100 flex items-start gap-3">
              <KeyRound className="text-green-600 shrink-0 mt-1" size={18} />
              <p className="text-[11px] text-green-800 font-medium leading-relaxed">
                إذا كنت موظفاً، أدخل إيميلك وكود الدعوة الذي استلمته من مدير الفريق لتفعيل حسابك واختيار كلمة مرور.
              </p>
            </div>
            <form onSubmit={handleJoinTeam} className="space-y-4">
              <div className="space-y-2">
                <Label>البريد الإلكتروني (المسجل من المدير)</Label>
                <Input type="email" placeholder="your@email.com" value={joinData.email} onChange={(e) => setJoinData({ ...joinData, email: e.target.value })} required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>كود الانضمام (Invite Code)</Label>
                <Input placeholder="WP-XXXX" value={joinData.inviteCode} onChange={(e) => setJoinData({ ...joinData, inviteCode: e.target.value.toUpperCase() })} required className="rounded-xl font-mono text-center tracking-widest border-green-200 focus:ring-green-500" />
              </div>
              <div className="space-y-2">
                <Label>اختر كلمة مرورك</Label>
                <Input type="password" placeholder="••••••••" value={joinData.password} onChange={(e) => setJoinData({ ...joinData, password: e.target.value })} required className="rounded-xl" />
              </div>
              {error && <ErrorMessage message={error} />}
              <Button type="submit" className="w-full h-12 bg-green-700 hover:bg-green-800 rounded-xl font-bold shadow-lg shadow-green-900/10" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : "تفعيل الحساب والانضمام"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// مكون بسيط لعرض الخطأ
function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 animate-in fade-in zoom-in-95">
      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}