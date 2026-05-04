"use client";

import { useEffect, useState } from "react";
// استيراد الأكشن الجديد هنا
import { saveWhatsAppSettings, syncWhatsAppTemplates } from "@/app/actions/whatsapp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle, RefreshCw, ShoppingBag, Link as LinkIcon, Zap, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const endpoints = [
  { method: "POST", path: "/v1/messages", description: "إرسال رسالة" },
  { method: "GET", path: "/v1/messages/{id}", description: "حالة الرسالة" },
  { method: "POST", path: "/v1/campaigns", description: "إنشاء حملة جديدة" },
];

export default function API({ initialData }: { initialData?: any }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [verifyToken, setVerifyToken] = useState("");

  useEffect(() => {
    fetch("/api/me/api-key")
      .then((res) => res.json())
      .then((data) => setApiKey(data.apiKey))
      .catch(() => setApiKey("not-available"));

    fetch("/api/me/webhook-config")
      .then((res) => res.json())
      .then((data) => setVerifyToken(data.verifyToken ?? ""))
      .catch(() => setVerifyToken(""));
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <TabsList>
          <TabsTrigger value="connect">ربط الحساب</TabsTrigger>
          <TabsTrigger value="shopify" className="gap-2">
            <ShoppingBag className="w-4 h-4" />
            ربط شوبيفاي
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
                  {/* Step 1 */}
                  <div className="flex flex-col items-center text-center space-y-2 flex-1 z-10">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold border-2 border-blue-600">1</div>
                    <h3 className="font-semibold">ربط المتجر</h3>
                    <p className="text-xs text-gray-500 px-2">أدخل رابط متجرك في شوبيفاي للبدء</p>
                  </div>
                  
                  <div className="hidden md:block flex-1 h-[2px] bg-gray-200 mt-5 -mx-4 relative top-0"></div>

                  {/* Step 2 */}
                  <div className="flex flex-col items-center text-center space-y-2 flex-1 z-10">
                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold border-2 border-gray-200">2</div>
                    <h3 className="font-semibold">الموافقة</h3>
                    <p className="text-xs text-gray-500 px-2">الموافقة على تثبيت التطبيق في شوبيفاي</p>
                  </div>

                  <div className="hidden md:block flex-1 h-[2px] bg-gray-200 mt-5 -mx-4 relative top-0"></div>

                  {/* Step 3 */}
                  <div className="flex flex-col items-center text-center space-y-2 flex-1 z-10">
                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold border-2 border-gray-200">3</div>
                    <h3 className="font-semibold">تفعيل الأتمتة</h3>
                    <p className="text-xs text-gray-500 px-2">استقبال الطلبات وإرسال الرسائل فوراً</p>
                  </div>
                </div>

                {/* Connection Form */}
                <div className="mt-6 p-6 border rounded-xl bg-slate-50 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shop-url">رابط متجر شوبيفاي</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="shop-url" 
                        placeholder="your-store.myshopify.com" 
                        className="bg-white"
                        dir="ltr"
                      />
                      <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                        ربط الآن
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-gray-400">مثال: bsm-alah-store.myshopify.com</p>
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