"use client";

import { useEffect, useState } from "react";
// استيراد الأكشن الجديد هنا
import { saveWhatsAppSettings, syncWhatsAppTemplates } from "@/app/actions/whatsapp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const endpoints = [
  { method: "POST", path: "/v1/messages", description: "إرسال رسالة" },
  { method: "GET", path: "/v1/messages/{id}", description: "حالة الرسالة" },
  { method: "POST", path: "/v1/campaigns", description: "إنشاء حملة جديدة" },
];

export default function API({ initialData }: { initialData?: any }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // حالة خاصة بمزامنة القوالب
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    fetch("/api/me/api-key")
      .then((res) => res.json())
      .then((data) => setApiKey(data.apiKey))
      .catch(() => setApiKey("not-available"));
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
          <TabsTrigger value="docs">التوثيق</TabsTrigger>
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

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>API Key</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input value={apiKey} readOnly />
                <Button onClick={() => copyToClipboard(apiKey)}>
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              {endpoints.map((ep, i) => (
                <div key={i} className="flex justify-between p-2 border-b">
                  <span className="font-bold text-blue-600">{ep.method}</span>
                  <code className="bg-gray-100 px-1 rounded">{ep.path}</code>
                  <span className="text-gray-600 text-sm">{ep.description}</span>
                </div>
              ))}
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
                    value="bsm_alah_2026" 
                    className="bg-gray-50 font-mono text-sm"
                    dir="ltr"
                  />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard("bsm_alah_2026")}>
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