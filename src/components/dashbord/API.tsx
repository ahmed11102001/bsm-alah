"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, CheckCircle, Key, RefreshCw, BookOpen, Terminal, Webhook } from 'lucide-react';

const codeExamples = {
  curl: `curl -X POST https://api.whatspro.com/v1/messages \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+966501234567",
    "template": "welcome",
    "variables": {
      "name": "أحمد"
    }
  }'`,
  
  javascript: `const axios = require('axios');

const response = await axios.post(
  'https://api.whatspro.com/v1/messages',
  {
    to: '+966501234567',
    template: 'welcome',
    variables: {
      name: 'أحمد'
    }
  },
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    }
  }
);

console.log(response.data);`,

  php: `<?php
$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => 'https://api.whatspro.com/v1/messages',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode([
    'to' => '+966501234567',
    'template' => 'welcome',
    'variables' => ['name' => 'أحمد']
  ]),
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer YOUR_API_KEY',
    'Content-Type: application/json'
  ]
]);

$response = curl_exec($curl);
curl_close($curl);

echo $response;`,

  python: `import requests

response = requests.post(
    'https://api.whatspro.com/v1/messages',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'to': '+966501234567',
        'template': 'welcome',
        'variables': {
            'name': 'أحمد'
        }
    }
)

print(response.json())`
};

const endpoints = [
  {
    method: 'POST',
    path: '/v1/messages',
    description: 'إرسال رسالة',
    auth: true
  },
  {
    method: 'GET',
    path: '/v1/messages/{id}',
    description: 'الحصول على حالة الرسالة',
    auth: true
  },
  {
    method: 'POST',
    path: '/v1/campaigns',
    description: 'إنشاء حملة جديدة',
    auth: true
  },
  {
    method: 'GET',
    path: '/v1/contacts',
    description: 'قائمة جهات الاتصال',
    auth: true
  },
  {
    method: 'POST',
    path: '/v1/contacts',
    description: 'إضافة جهة اتصال',
    auth: true
  },
  {
    method: 'GET',
    path: '/v1/templates',
    description: 'قائمة القوالب',
    auth: true
  },
];

export default function API() {
  const [copied, setCopied] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState('curl');
  const [apiKey] = useState('whatspro_live_xxxxxxxxxxxxxxxx');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API</h1>
          <p className="text-gray-600">ربط تطبيقك مع واتس برو</p>
        </div>
        <Button variant="outline">
          <BookOpen className="w-4 h-4 ml-2" />
          التوثيق الكامل
        </Button>
      </div>

      {/* API Key Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            مفتاح API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-sm text-gray-500 mb-2 block">مفتاحك السري</Label>
              <div className="flex gap-2">
                <Input 
                  value={apiKey} 
                  type="password" 
                  readOnly 
                  className="font-mono"
                />
                <Button 
                  variant="outline" 
                  onClick={() => copyToClipboard(apiKey)}
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <RefreshCw className="w-4 h-4 ml-2" />
                إعادة توليد
              </Button>
            </div>
          </div>
          <div className="mt-4 p-4 bg-yellow-50 rounded-xl">
            <p className="text-sm text-yellow-700">
              ⚠️ لا تشارك مفتاح API مع أي شخص. استخدمه فقط في الخادم الخاص بك.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="docs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="docs">التوثيق</TabsTrigger>
          <TabsTrigger value="examples">أمثلة</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="docs" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">الطلبات هذا الشهر</p>
                <p className="text-2xl font-bold">12,450</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">معدل النجاح</p>
                <p className="text-2xl font-bold text-green-600">99.2%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">متوسط الاستجابة</p>
                <p className="text-2xl font-bold">120ms</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">حد الطلبات</p>
                <p className="text-2xl font-bold">10,000/يوم</p>
              </CardContent>
            </Card>
          </div>

          {/* Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle>نقاط النهاية (Endpoints)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {endpoints.map((endpoint, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Badge className={
                        endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                        endpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
                        'bg-yellow-100 text-yellow-700'
                      }>
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm font-mono">{endpoint.path}</code>
                    </div>
                    <span className="text-gray-600">{endpoint.description}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  أمثلة الكود
                </CardTitle>
                <div className="flex gap-2">
                  {['curl', 'javascript', 'php', 'python'].map((lang) => (
                    <Button
                      key={lang}
                      variant={activeLanguage === lang ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveLanguage(lang)}
                      className={activeLanguage === lang ? 'bg-whatsapp-gradient' : ''}
                    >
                      {lang}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="p-4 bg-gray-900 text-gray-100 rounded-xl overflow-x-auto text-sm font-mono">
                  <code>{codeExamples[activeLanguage as keyof typeof codeExamples]}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-4 left-4 bg-white"
                  onClick={() => copyToClipboard(codeExamples[activeLanguage as keyof typeof codeExamples])}
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>رابط Webhook</Label>
                <Input placeholder="https://your-website.com/webhook" />
                <p className="text-sm text-gray-500 mt-2">
                  سيتم إرسال إشعارات إلى هذا الرابط عند تغير حالة الرسائل
                </p>
              </div>

              <div>
                <Label className="mb-2 block">الأحداث</Label>
                <div className="space-y-2">
                  {[
                    { id: 'message_sent', label: 'تم إرسال الرسالة' },
                    { id: 'message_delivered', label: 'تم تسليم الرسالة' },
                    { id: 'message_read', label: 'تم قراءة الرسالة' },
                    { id: 'message_failed', label: 'فشل إرسال الرسالة' },
                  ].map((event) => (
                    <div key={event.id} className="flex items-center gap-2">
                      <input type="checkbox" id={event.id} className="rounded" defaultChecked />
                      <label htmlFor={event.id}>{event.label}</label>
                    </div>
                  ))}
                </div>
              </div>

              <Button className="bg-whatsapp-gradient">
                حفظ الإعدادات
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
