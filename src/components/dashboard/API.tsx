"use client";

import { useEffect, useState } from "react";
import { saveWhatsAppSettings } from "@/app/actions/whatsapp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle, Key, RefreshCw, BookOpen, Terminal, Webhook } from "lucide-react";

const endpoints = [
  { method: "POST", path: "/v1/messages", description: "إرسال رسالة" },
  { method: "GET", path: "/v1/messages/{id}", description: "حالة الرسالة" },
  { method: "POST", path: "/v1/campaigns", description: "إنشاء حملة جديدة" },
];

export default function API({ initialData }: { initialData?: any }) {
  const [copied, setCopied] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState("curl");

  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");

  const [webhookUrl, setWebhookUrl] = useState("");

  // 🔥 API KEY من السيرفر
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

      alert("تم حفظ الإعدادات بنجاح");
    } catch (err) {
      alert("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">API Dashboard</h1>
        <p className="text-gray-500">ربط واتساب وإدارة الـ API</p>
      </div>

      <Tabs defaultValue="connect">

        <TabsList>
          <TabsTrigger value="connect">ربط الحساب</TabsTrigger>
          <TabsTrigger value="docs">التوثيق</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        {/* ================= CONNECT ================= */}
        <TabsContent value="connect">
          <Card>
            <CardHeader>
              <CardTitle>ربط WhatsApp</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">

                <div>
                  <Label>Access Token</Label>
                  <Input name="accessToken" defaultValue={initialData?.accessToken || ""} />
                </div>

                <div>
                  <Label>Phone Number ID</Label>
                  <Input name="phoneNumberId" defaultValue={initialData?.phoneNumberId || ""} />
                </div>

                <div>
                  <Label>WABA ID</Label>
                  <Input name="wabaId" defaultValue={initialData?.wabaId || ""} />
                </div>

                <Button disabled={loading}>
                  {loading ? "جاري الحفظ..." : "حفظ الإعدادات"}
                </Button>

              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= DOCS ================= */}
        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>API Key</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex gap-2">
                <Input value={apiKey} readOnly />
                <Button onClick={() => copyToClipboard(apiKey)}>
                  {copied ? <CheckCircle /> : <Copy />}
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
                  <span>{ep.method}</span>
                  <code>{ep.path}</code>
                  <span>{ep.description}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= WEBHOOK ================= */}
        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle>Webhook URL</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">

              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-domain.com/webhook"
              />

              <Button>
                حفظ Webhook
              </Button>

            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}