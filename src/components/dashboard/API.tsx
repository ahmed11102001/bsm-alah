"use client";

import { useEffect, useState } from "react";
import { saveWhatsAppSettings } from "@/app/actions/whatsapp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner"; // أو استخدم alert لو مش ضايف sonner

const endpoints = [
  { method: "POST", path: "/v1/messages", description: "إرسال رسالة" },
  { method: "GET", path: "/v1/messages/{id}", description: "حالة الرسالة" },
  { method: "POST", path: "/v1/campaigns", description: "إنشاء حملة جديدة" },
];

export default function API({ initialData }: { initialData?: any }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

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

      toast.success("تم حفظ الإعدادات وتحديث الصفحة");
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
        {/* زرار إضافي لمزامنة القوالب مستقبلاً */}
        <Button variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          تحديث القوالب
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
                    key={`token-${initialData?.accessToken}`} // الحل السحري لظهور البيانات
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

        {/* باقي الـ Tabs (Docs & Webhooks) تفضل زي ما هي */}
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
          {/* Endpoints Table... */}
        </TabsContent>
      </Tabs>
    </div>
  );
}