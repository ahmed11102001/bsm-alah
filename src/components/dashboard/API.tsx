"use client";

import { useEffect, useState } from "react";
// استيراد الأكشن الجديد هنا
import { saveWhatsAppSettings, syncWhatsAppTemplates } from "@/app/actions/whatsapp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, RefreshCw, ShoppingBag, Zap, CheckCircle2, ArrowRight, Loader2, Store, Key, Webhook, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function API({ initialData }: { initialData?: any }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [shopUrl,     setShopUrl]     = useState("");
  const [connecting,  setConnecting]  = useState(false);
  const [shopError,   setShopError]   = useState("");

  // ─── Easy Orders State ────────────────────────────────────────────────────
  const [eoStoreName,   setEoStoreName]   = useState("");
  const [eoApiKey,      setEoApiKey]      = useState("");
  const [eoWebhookUrl,  setEoWebhookUrl]  = useState("");
  const [eoConnected,   setEoConnected]   = useState(false);
  const [eoSaving,      setEoSaving]      = useState(false);
  const [eoDeleting,    setEoDeleting]    = useState(false);
  const [eoCopied,      setEoCopied]      = useState(false);

  useEffect(() => {
    fetch("/api/me/api-key")
      .then((res) => res.json())
      .then((data) => setApiKey(data.apiKey))
      .catch(() => setApiKey("not-available"));

    fetch("/api/me/webhook-config")
      .then((res) => res.json())
      .then((data) => setVerifyToken(data.verifyToken ?? ""))
      .catch(() => setVerifyToken(""));

    // جيب إعدادات إيزي أوردرز الحالية
    fetch("/api/easy-orders/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.store) {
          setEoStoreName(data.store.storeName);
          setEoApiKey(data.store.apiKey);
          setEoConnected(true);
        }
        if (data.webhookUrl) setEoWebhookUrl(data.webhookUrl);
      })
      .catch(() => {});
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyEoWebhook = () => {
    navigator.clipboard.writeText(eoWebhookUrl);
    setEoCopied(true);
    setTimeout(() => setEoCopied(false), 2000);
  };

  // دالة مزامنة القوالب
  const handleSyncTemplates = async () => {
    setIsSyncing(true);
    try {
      const result = await syncWhatsAppTemplates();
      if (result.success) {
        toast.success(`تمت مزامنة ${result.count} قالب بنجاح`);
      } else {
        toast.error(result.error || "فشلت المزامنة");
      }
    } catch (err) {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleShopifyConnect = async () => {
    setShopError("");
    const shop = shopUrl.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!shop) { setShopError("أدخل رابط المتجر أولاً"); return; }
    if (!shop.includes("myshopify.com") && !shop.match(/^[a-zA-Z0-9-]+$/)) {
      setShopError("صيغة الرابط غير صحيحة"); return;
    }
    setConnecting(true);
    try {
      const r = await fetch("/api/shopify/install", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ shop }),
      });
      const d = await r.json();
      if (!r.ok) { setShopError(d.error ?? "حدث خطأ"); return; }
      window.location.href = d.authUrl;
    } catch {
      setShopError("تعذر الاتصال بالسيرفر");
    } finally {
      setConnecting(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      await saveWhatsAppSettings({
        accessToken: formData.get("accessToken") as string,
        phoneNumberId: formData.get("phoneNumberId") as string,
        wabaId: formData.get("wabaId") as string,
      });
      toast.success("تم حفظ الإعدادات بنجاح");
    } catch (err) {
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  // ─── حفظ إعدادات إيزي أوردرز ─────────────────────────────────────────────
  const handleEoSave = async () => {
    if (!eoStoreName.trim() || !eoApiKey.trim()) {
      toast.error("يرجى إدخال اسم المتجر ومفتاح الـ API");
      return;
    }
    setEoSaving(true);
    try {
      const r = await fetch("/api/easy-orders/settings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ storeName: eoStoreName, apiKey: eoApiKey }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "حدث خطأ");
      if (d.webhookUrl) setEoWebhookUrl(d.webhookUrl);
      setEoConnected(true);
      toast.success("تم حفظ إعدادات إيزي أوردرز بنجاح ✅");
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setEoSaving(false);
    }
  };

  // ─── إلغاء ربط إيزي أوردرز ───────────────────────────────────────────────
  const handleEoDisconnect = async () => {
    if (!confirm("هل أنت متأكد من إلغاء ربط إيزي أوردرز؟")) return;
    setEoDeleting(true);
    try {
      const r = await fetch("/api/easy-orders/settings", { method: "DELETE" });
      if (!r.ok) throw new Error("حدث خطأ");
      setEoConnected(false);
      setEoStoreName("");
      setEoApiKey("");
      toast.success("تم إلغاء ربط إيزي أوردرز");
    } catch {
      toast.error("حدث خطأ أثناء الإلغاء");
    } finally {
      setEoDeleting(false);
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">API Dashboard</h1>
          <p className="text-gray-500">ربط واتساب وإدارة الـ API</p>
        </div>
        
        {/* تحديث الزرار ليعمل مع الأكشن */}
        <Button 
          variant="outline" 
          className="gap-2" 
          onClick={handleSyncTemplates}
          disabled={isSyncing}
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "جاري المزامنة..." : "تحديث القوالب"}
        </Button>
      </div>

      <Tabs defaultValue="connect">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="connect">ربط الحساب</TabsTrigger>
          <TabsTrigger value="shopify" className="gap-2">
            <ShoppingBag className="w-4 h-4" />
            ربط شوبيفاي
          </TabsTrigger>
          <TabsTrigger value="easy-orders" className="gap-2">
            <Store className="w-4 h-4" />
            إيزي أوردرز
            {eoConnected && (
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            )}
          </TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="connect">
          <Card>
            <CardHeader>
              <CardTitle>ربط WhatsApp</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <Label>Access Token</Label>
                  <Input 
                    key={`token-${initialData?.accessToken}`}
                    name="accessToken" 
                    defaultValue={initialData?.accessToken || ""} 
                    placeholder="EAA..."
                  />
                </div>

                <div>
                  <Label>Phone Number ID</Label>
                  <Input 
                    key={`phone-${initialData?.phoneNumberId}`} 
                    name="phoneNumberId" 
                    defaultValue={initialData?.phoneNumberId || ""} 
                    placeholder="123456789..."
                  />
                </div>

                <div>
                  <Label>WABA ID</Label>
                  <Input 
                    key={`waba-${initialData?.wabaId}`} 
                    name="wabaId" 
                    defaultValue={initialData?.wabaId || ""} 
                    placeholder="987654321..."
                  />
                </div>

                <Button disabled={loading} className="w-full lg:w-auto">
                  {loading ? "جاري الحفظ..." : "حفظ الإعدادات"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shopify">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="text-blue-600" />
                ربط متجر شوبيفاي (Shopify Integration)
              </CardTitle>
              <p className="text-sm text-gray-500">قم بربط متجرك لتبدأ في أتمتة رسائل العملاء وزيادة مبيعاتك تلقائياً</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-8 py-4">
                {/* Flow Steps */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 relative">
                  <div className="flex flex-col items-center text-center space-y-2 flex-1 z-10">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold border-2 border-blue-600">1</div>
                    <h3 className="font-semibold">ربط المتجر</h3>
                    <p className="text-xs text-gray-500 px-2">أدخل رابط متجرك في شوبيفاي للبدء</p>
                  </div>
                  <div className="hidden md:block flex-1 h-[2px] bg-gray-200 mt-5 -mx-4 relative top-0"></div>
                  <div className="flex flex-col items-center text-center space-y-2 flex-1 z-10">
                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold border-2 border-gray-200">2</div>
                    <h3 className="font-semibold">الموافقة</h3>
                    <p className="text-xs text-gray-500 px-2">الموافقة على تثبيت التطبيق في شوبيفاي</p>
                  </div>
                  <div className="hidden md:block flex-1 h-[2px] bg-gray-200 mt-5 -mx-4 relative top-0"></div>
                  <div className="flex flex-col items-center text-center space-y-2 flex-1 z-10">
                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold border-2 border-gray-200">3</div>
                    <h3 className="font-semibold">تفعيل الأتمتة</h3>
                    <p className="text-xs text-gray-500 px-2">استقبال الطلبات وإرسال الرسائل فوراً</p>
                  </div>
                </div>

                <div className="mt-6 p-6 border rounded-xl bg-slate-50 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shop-url">رابط متجر شوبيفاي</Label>
                    <div className="flex gap-2">
                      <Input
                        id="shop-url"
                        placeholder="your-store.myshopify.com"
                        className="bg-white"
                        dir="ltr"
                        value={shopUrl}
                        onChange={e => { setShopUrl(e.target.value); setShopError(""); }}
                        onKeyDown={e => e.key === "Enter" && handleShopifyConnect()}
                        disabled={connecting}
                      />
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 gap-2"
                        onClick={handleShopifyConnect}
                        disabled={connecting}
                      >
                        {connecting ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> جاري الربط...</>
                        ) : (
                          <>ربط الآن <ArrowRight className="w-4 h-4" /></>
                        )}
                      </Button>
                    </div>
                    <p className="text-[10px] text-gray-400">مثال: bsm-alah-store.myshopify.com</p>
                    {shopError && <p className="text-xs text-red-500">{shopError}</p>}
                  </div>

                  <div className="pt-4 border-t flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Zap className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">ماذا سيحدث بعد الربط؟</h4>
                      <ul className="text-xs text-gray-600 mt-1 space-y-1">
                        <li>• سيتم سحب جميع بيانات العملاء والطلبات تلقائياً.</li>
                        <li>• يمكنك تفعيل رسائل تأكيد الطلب فور حدوثها.</li>
                        <li>• متابعة الشحن وإرسال التحديثات للعملاء عبر واتساب.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================
            تاب إيزي أوردرز الجديد
            ========================================= */}
        <TabsContent value="easy-orders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="text-orange-500 w-5 h-5" />
                ربط متجر إيزي أوردرز
                {eoConnected && (
                  <span className="flex items-center gap-1 text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> مرتبط
                  </span>
                )}
              </CardTitle>
              <p className="text-sm text-gray-500">اربط متجرك على إيزي أوردرز لإرسال رسائل واتساب تلقائية عند كل طلب جديد أو تحديث شحن</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-8 py-4">

                {/* خطوات الربط */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  {[
                    { n: 1, label: "نسخ الـ API Key", desc: "من لوحة إيزي أوردرز ← الإعدادات ← API" },
                    { n: 2, label: "الإعداد هنا", desc: "أدخل اسم المتجر ومفتاح الـ API ثم احفظ" },
                    { n: 3, label: "تفعيل الويب هوك", desc: "انسخ رابط الويب هوك وضعه في إيزي أوردرز" },
                  ].map((s) => (
                    <div key={s.n} className="flex flex-col items-center text-center space-y-2 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${
                        eoConnected
                          ? "bg-orange-100 text-orange-600 border-orange-400"
                          : s.n === 1 ? "bg-orange-100 text-orange-600 border-orange-400" : "bg-gray-100 text-gray-400 border-gray-200"
                      }`}>{s.n}</div>
                      <h3 className="font-semibold text-sm">{s.label}</h3>
                      <p className="text-xs text-gray-500 px-1">{s.desc}</p>
                    </div>
                  ))}
                </div>

                {/* نموذج الإدخال */}
                <div className="p-6 border rounded-xl bg-orange-50/40 space-y-4">

                  {/* اسم المتجر */}
                  <div className="space-y-2">
                    <Label htmlFor="eo-store-name" className="flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-orange-500" />
                      اسم المتجر
                    </Label>
                    <Input
                      id="eo-store-name"
                      placeholder="مثال: متجر أحمد للأزياء"
                      value={eoStoreName}
                      onChange={e => setEoStoreName(e.target.value)}
                      disabled={eoSaving}
                    />
                  </div>

                  {/* مفتاح الـ API */}
                  <div className="space-y-2">
                    <Label htmlFor="eo-api-key" className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-orange-500" />
                      مفتاح الربط (API Key)
                    </Label>
                    <Input
                      id="eo-api-key"
                      placeholder="eo_live_xxxxxxxxxxxx"
                      dir="ltr"
                      value={eoApiKey}
                      onChange={e => setEoApiKey(e.target.value)}
                      disabled={eoSaving}
                      type="password"
                    />
                    <p className="text-[10px] text-gray-400">
                      ستجد المفتاح في: لوحة إيزي أوردرز ← الإعدادات ← الربط التقني ← API
                    </p>
                  </div>

                  {/* رابط الويب هوك (للعرض فقط) */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Webhook className="w-3.5 h-3.5 text-orange-500" />
                      رابط الويب هوك الخاص بك
                      <span className="text-[10px] text-gray-400 font-normal">(للقراءة فقط)</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        dir="ltr"
                        value={eoWebhookUrl || (eoConnected ? "جاري التحميل..." : "سيظهر بعد الحفظ")}
                        className="bg-white font-mono text-xs text-gray-600"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={copyEoWebhook}
                        disabled={!eoWebhookUrl}
                        title="نسخ الرابط"
                      >
                        {eoCopied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    {eoConnected && (
                      <p className="text-[10px] text-gray-400">
                        ضع هذا الرابط في إيزي أوردرز ← الويب هوك ← إضافة ويب هوك جديد
                      </p>
                    )}
                  </div>

                  {/* أزرار الحفظ والإلغاء */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      className="bg-orange-500 hover:bg-orange-600 gap-2 flex-1"
                      onClick={handleEoSave}
                      disabled={eoSaving}
                    >
                      {eoSaving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4" /> حفظ واختبار الاتصال</>
                      )}
                    </Button>

                    {eoConnected && (
                      <Button
                        variant="outline"
                        className="gap-2 text-red-500 border-red-200 hover:bg-red-50"
                        onClick={handleEoDisconnect}
                        disabled={eoDeleting}
                      >
                        {eoDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        إلغاء الربط
                      </Button>
                    )}
                  </div>
                </div>

                {/* الأحداث المدعومة */}
                <div className="p-4 border rounded-xl bg-white space-y-3">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-500" />
                    الأحداث التي يدعمها الربط
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                      { event: "Order Created", desc: "رسالة تأكيد فور إتمام الطلب" },
                      { event: "Status Updated", desc: "تحديث حالة الشحن (تجهيز، شحن، توصيل)" },
                    ].map((item) => (
                      <div key={item.event} className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 border border-orange-100">
                        <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold" dir="ltr">{item.event}</p>
                          <p className="text-[11px] text-gray-500">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================
            تمت إضافة كود الويب هوك هنا
            ========================================= */}
        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الويب هوك (Webhook Settings)</CardTitle>
              <p className="text-sm text-gray-500">انسخ هذه البيانات لربط نظامك مع Meta Developers لاستقبال تقارير الوصول والقراءة</p>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* رابط الويب هوك */}
              <div className="space-y-2">
                <Label className="text-blue-600 font-bold">Callback URL</Label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={typeof window !== "undefined" ? `https://${window.location.host}/api/webhook` : ""} 
                    className="bg-gray-50 font-mono text-sm"
                    dir="ltr"
                  />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(typeof window !== "undefined" ? `https://${window.location.host}/api/webhook` : "")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Verify Token */}
              <div className="space-y-2">
                <Label className="text-blue-600 font-bold">Verify Token</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={verifyToken || "جاري التحميل..."}
                    className="bg-gray-50 font-mono text-sm"
                    dir="ltr"
                  />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(verifyToken)} disabled={!verifyToken}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* تنبيه سريع للعميل */}
              <div className="p-4 rounded-lg border border-dashed border-slate-200 bg-slate-50">
                <p className="text-sm text-slate-700">
                  استخدم هذا الرابط و Verify Token داخل إعدادات Webhook في Meta Developers.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
