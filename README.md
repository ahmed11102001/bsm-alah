# WhatsPro — منصة تسويق واتساب

منصة SaaS متكاملة لإرسال حملات واتساب جماعية، إدارة المحادثات، وأتمتة الردود بالذكاء الاصطناعي.

---

## المتطلبات

- Node.js 20+
- PostgreSQL (أو حساب [Neon](https://neon.tech) مجاني)
- حساب [Meta for Developers](https://developers.facebook.com) مع WhatsApp Business API

---

## تشغيل المشروع محلياً

**1. نسخ المشروع وتثبيت الحزم**

```bash
git clone <repo-url>
cd bsm-alah
npm install
```

**2. إعداد متغيرات البيئة**

```bash
cp .env.example .env.local
```

افتح `.env.local` واعبي المتغيرات المطلوبة — كلها موثقة في `.env.example`.

**3. إعداد قاعدة البيانات**

```bash
npx prisma migrate dev
npx prisma generate
```

**4. تشغيل السيرفر**

```bash
npm run dev
```

الموقع على [http://localhost:3000](http://localhost:3000)

---

## بناء وتشغيل Production

```bash
npm run build
npm start
```

> `npm run build` بيعمل `prisma generate` تلقائياً قبل البناء.

---

## الـ Services المطلوبة

| Service | الاستخدام | رابط |
|---|---|---|
| PostgreSQL / Neon | قاعدة البيانات | [neon.tech](https://neon.tech) |
| Meta WhatsApp API | إرسال واستقبال الرسائل | [developers.facebook.com](https://developers.facebook.com) |
| Cloudinary | رفع الصور والملفات | [cloudinary.com](https://cloudinary.com) |
| Resend | إرسال الإيميلات | [resend.com](https://resend.com) |
| Upstash Redis | Rate Limiting | [upstash.com](https://upstash.com) |
| Inngest | Background Jobs | [inngest.com](https://inngest.com) |

---

## إعداد WhatsApp Webhook

بعد تشغيل المشروع على سيرفر عام:

1. افتح Meta for Developers → WhatsApp → Configuration
2. Webhook URL: `https://yourdomain.com/api/webhook`
3. Verify Token: نفس قيمة `WHATSAPP_VERIFY_TOKEN` في الـ `.env`
4. اشترك في: `messages`, `message_deliveries`, `message_reads`

---

## هيكل المشروع

```
src/
├── app/
│   ├── api/          — API routes (webhook, campaigns, auth...)
│   ├── dashboard/    — صفحات الـ dashboard
│   └── (public)/     — الصفحات العامة (landing, pricing...)
├── components/
│   ├── dashboard/    — مكونات الـ dashboard الكبيرة
│   └── ui/           — مكونات shadcn/ui
├── lib/              — utilities (auth, queue, AI agent, plans...)
├── inngest/          — background jobs (campaigns, automations)
└── hooks/            — custom React hooks
prisma/
├── schema.prisma     — DB schema
└── migrations/       — migration history
```

---

## الـ Scripts

```bash
npm run dev      # تشغيل dev server
npm run build    # بناء production (prisma generate + next build)
npm start        # تشغيل production server
npm run lint     # فحص الكود
```

---

## النشر على Vercel

1. اربط الـ repo بـ Vercel
2. أضف كل متغيرات البيئة من `.env.example` في Vercel Dashboard → Settings → Environment Variables
3. تأكد من إضافة `INNGEST_EVENT_KEY` و `INNGEST_SIGNING_KEY` — مطلوبين للـ background jobs
4. اربط Inngest بـ Vercel من [app.inngest.com](https://app.inngest.com)