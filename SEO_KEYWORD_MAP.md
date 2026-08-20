# Wani SEO Keyword Map & Content Architecture
> **Document Version:** Phase 2 — Strategic Keyword Mapping & Content Hierarchy  
> **Target Domain:** [aiwni.com](https://aiwni.com)  
> **Brand:** Wani (وني) — منصة واتساب للأعمال والذكاء الاصطناعي  
> **Source of Truth:** This document serves as the permanent strategic guideline for all on-page SEO, content marketing, and internal linking decisions across the platform.

---

## 1. Site-Wide SEO Strategy

### 1.1 Brand Identity & Market Positioning
Wani (وني) is an all-in-one **WhatsApp Business Platform** specifically tailored for businesses, eCommerce merchants, and developers in Egypt and the MENA region. The platform combines:
- **WhatsApp CRM & Unified Team Inbox:** Multi-agent conversation management and customer lifecycle tracking.
- **Bulk Marketing Campaigns:** Broadcast messaging using official Meta-approved templates with 0% ban risk.
- **24/7 AI Sales Assistant:** Intelligent sales automation powered by LLMs that converses with customers, recommends products, and closes deals.
- **eCommerce Automation:** Native integrations with Shopify, WooCommerce, and EasyOrders for automated order confirmation, shipment tracking, and abandoned cart recovery.
- **Developer WhatsApp OTP API:** High-speed, lightweight REST API for phone verification and transactional notifications.

### 1.2 Strategic SEO Principles
1. **Pillar & Cluster Architecture:** Core transactional and commercial landing pages serve as Pillar pages. Deep informational articles act as supporting cluster assets that funnel authority and qualified traffic upward.
2. **Strict Cannibalization Prevention:** Every URL in the index possesses exactly one distinct **Primary Keyword** and a defined **Search Intent**. Multiple pages must never compete for the same user intent.
3. **Intent-Driven Funneling:**
   - *Informational Intent (Articles / Blog):* Educates, answers specific problems, and provides actionable frameworks.
   - *Commercial / Strategy Intent (/strategies):* Demonstrates automated playbooks and business ROI.
   - *Developer / Technical Intent (/developers, /developers/docs):* Delivers code samples, REST endpoint specs, and implementation details.
   - *Transactional Intent (Homepage / #pricing):* Converts high-intent visitors into registered accounts.
4. **Natural Localization:** Content is written in professional, natural Arabic suitable for Egyptian and Middle Eastern decision-makers, with technical English terminology included where standard in the tech industry.

---

## 2. Public Page Keyword Map (Current Architecture)

| URL | Page Name | Primary Keyword | Secondary Keywords | Search Intent | Page Role | Internal Link Targets |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | **Homepage** | **واتساب للأعمال** | WhatsApp Business, WhatsApp CRM, أتمتة واتساب, WhatsApp Marketing, حملات واتساب, WhatsApp Business API, WhatsApp Chatbot, صندوق وارد واتساب للفريق | Commercial / Transactional | Main Product Pillar Page | `/strategies`, `/developers`, `/articles`, `/#pricing` |
| `/strategies` | **Marketing Strategies Hub** | **التسويق عبر واتساب** | تسويق واتساب, WhatsApp Marketing, حملات واتساب, التسويق عبر WhatsApp Business, أتمتة التسويق عبر واتساب | Commercial / Informational | Marketing Strategy Hub | `/strategies/abandoned-cart`, `/`, `/dashboard` |
| `/strategies/abandoned-cart` | **Abandoned Cart Strategy** | **استرجاع السلات المتروكة عبر واتساب** | استرجاع السلة المتروكة, WhatsApp abandoned cart, abandoned cart recovery, رسائل السلات المتروكة, استرجاع عربات التسوق | Commercial / Educational | eCommerce Feature Pillar | `/strategies`, `/`, `/#pricing` |
| `/strategies/retargeting` | **Retargeting Strategy** | **إعادة استهداف العملاء عبر واتساب** | تصنيف وتقسيم عملاء واتساب, قوائم عملاء الـ VIP على واتساب, استعادة العملاء غير النشطين, Win-back Campaigns WhatsApp, تحليل تقارير واتساب, WhatsApp Customer Segmentation | Commercial / Educational | CRM & Analytics Feature Pillar | `/strategies`, `/`, `/dashboard/reports` |
| `/developers` | **Developer Portal** | **WhatsApp API** | WhatsApp Business API, WhatsApp Cloud API, WhatsApp OTP API, WhatsApp API Egypt, WhatsApp API platform | Commercial / Developer | API Product Landing Page | `/developers/docs`, `/developers/signin`, `/developers/signup`, `/` |
| `/developers/docs` | **API Documentation** | **WhatsApp API Documentation** | WhatsApp API Docs, WhatsApp Cloud API Documentation, WhatsApp OTP API Documentation, WhatsApp Business API Documentation | Developer / Navigational | Technical Reference | `/developers`, `/developers/signup` |
| `/articles` | **Articles Index** | **مقالات واتساب للأعمال** | نصائح واتساب للأعمال, WhatsApp Business Tips, WhatsApp Marketing Guide, WhatsApp CRM, WhatsApp Automation | Informational | Content Hub / Blog Index | Individual Article Pages (`/articles/[slug]`), `/` |
| `/articles/[slug]` | **Individual Article** | *Unique per article topic* | 3–6 topic-specific keywords | Informational | Cluster Asset / Authority Builder | Parent Pillar Page, Related Articles, `/#pricing` |
| `/privacy` | **Privacy Policy** | *Non-target* (Legal) | سياسة الخصوصية, Privacy Policy | Navigational / Legal | Legal Compliance | `/`, `/terms` |
| `/terms` | **Terms of Service** | *Non-target* (Legal) | شروط الاستخدام, Terms of Service | Navigational / Legal | Legal Compliance | `/`, `/privacy` |
| `/developers/privacy` | **Developer Privacy** | *Non-target* (Legal) | Developer Privacy | Navigational / Legal | Legal Compliance | `/developers`, `/developers/terms` |
| `/developers/terms` | **Developer Terms** | *Non-target* (Legal) | Developer Terms | Navigational / Legal | Legal Compliance | `/developers`, `/developers/privacy` |

---

## 3. Internal Linking Hierarchy

The following visual diagram defines the internal link equity flow across the Wani domain:

```
                               +----------------------------+
                               |          Homepage          |
                               |             /              |
                               |   (واتساب للأعمال - Pillar)   |
                               +--------------+-------------+
                                              |
        +-------------------------------------+-------------------------------------+
        |                                     |                                     |
        v                                     v                                     v
+-------------------------------+ +-------------------------------+ +-------------------------------+
|       /strategies Hub         | |       /developers Page        | |        /articles Index        |
|    (التسويق عبر واتساب)       | |        (WhatsApp API)         | |    (مقالات واتساب للأعمال)     |
+---------------+---------------+ +---------------+---------------+ +---------------+---------------+
                |                                 |                                 |
                v                                 v                                 v
+-------------------------------+ +-------------------------------+ +-------------------------------+
|  /strategies/abandoned-cart   | |       /developers/docs        | |     /articles/[slug] (15+)    |
| (استرجاع السلات المتروكة عبر  | | (WhatsApp API Documentation)  | | (Topic-specific Cluster Posts)|
|           واتساب)             | |                               | |                               |
+---------------+---------------+ +---------------+---------------+ +---------------+---------------+
                ^                                 ^                                 |
                |                                 |                                 |
                +---------------------------------+---------------------------------+
                               (Supporting contextual in-article backlinks)
```

### 3.1 Linking Rules
1. **Bottom-Up Equity Flow:** Informational articles must link back to their parent Pillar page (`/`, `/strategies`, `/strategies/abandoned-cart`, or `/developers`).
2. **Contextual Relevance:** Anchor text must use descriptive, natural phrasing rather than generic terms like "click here" or "اضغط هنا".
3. **No Redundant Linking:** Avoid multiple links pointing to the exact same destination URL within a single paragraph.
4. **Direct Conversion Funneling:** Every informational article must include a clear, relevant Call-to-Action (CTA) leading to either free signup or the relevant product feature.

---

## 4. Keyword Cannibalization Prevention Matrix

| Potential Conflict | High-Authority URL (Pillar) | Supporting URL (Article / Cluster) | Clear Intent Separation |
| :--- | :--- | :--- | :--- |
| **WhatsApp Marketing** vs **حملات واتساب** | `/strategies`<br>*(Primary: التسويق عبر واتساب)* | Article 4: `إزاي تعمل حملات واتساب ناجحة بدون سبام؟`<br>*(Primary: حملات واتساب)* | `/strategies` is a high-level commercial hub showing business playbooks. Article 4 is a tactical guide on spam rules, deliverability, and template approvals. |
| **WhatsApp CRM** | `/` (Homepage)<br>*(Mentions CRM feature)* | Article 2: `WhatsApp CRM: يعني إيه وإمتى شركتك تحتاجه؟`<br>*(Primary: WhatsApp CRM)* | Homepage targets users looking to purchase a full platform. Article 2 educates users who are searching to understand what WhatsApp CRM is and when to adopt it. |
| **Abandoned Cart** | `/strategies/abandoned-cart`<br>*(Primary: استرجاع السلات المتروكة عبر واتساب)* | Article 6: `إزاي تسترجع السلات المتروكة باستخدام واتساب؟`<br>*(Primary: استرجاع السلات المتروكة واتساب)* | The `/strategies/abandoned-cart` page is an interactive showcase of the automated mechanism. Article 6 is a step-by-step tutorial with copy templates and conversion optimization tips. |
| **WhatsApp API vs Business** | `/developers`<br>*(Primary: WhatsApp API)* | Article 1: `واتساب بزنس vs WhatsApp Business API: إيه الفرق؟`<br>Article 10: `WhatsApp API vs WhatsApp Business` | `/developers` is a developer product portal. Article 1 is for non-technical business owners outgrowing the mobile app. Article 10 is for technical architects comparing Cloud API features. |
| **Shopify / WooCommerce** | `/` (Homepage integrations section) | Article 11 (Shopify) & Article 12 (WooCommerce) | Homepage mentions integrations as part of the feature list. Articles 11 & 12 are detailed, platform-specific setup guides. |
| **Customer Segmentation / Win-back** | `/strategies/retargeting`<br>*(Primary: إعادة استهداف العملاء عبر واتساب)* | Future Article (Cluster B/D): `أتمتة استعادة العملاء غير النشطين (Win-back Campaigns)` | `/strategies/retargeting` is an interactive commercial showcase of the segmentation mechanism (Reports data → VIP vs inactive split → targeted campaign). The future article would be a tactical, step-by-step guide to writing win-back message copy, timing, and discount ladders — linking back to `/strategies/retargeting` as its pillar. |

---

## 5. First 15 Planned Articles — Strategic Content Map

### Article 01: واتساب بزنس vs WhatsApp Business API: إيه الفرق؟
- **Suggested Slug:** `whatsapp-business-vs-api-difference`
- **Primary Keyword:** `واتساب بزنس vs WhatsApp Business API`
- **Secondary Keywords:** `الفرق بين واتساب بزنس وواتساب API`, `WhatsApp Business vs API`, `مقارنة واتساب للأعمال`, `حدود تطبيق واتساب بزنس`, `متى أحتاج WhatsApp API`
- **Search Intent:** Informational / Commercial Investigation
- **Target Audience:** Small-to-medium business owners and marketing leads hitting the limits of the free WhatsApp Business app.
- **Recommended Pillar Page:** Homepage (`/`)
- **Internal Links to Include:**
  - Link to `/` (منصة واتساب للأعمال المتكاملة)
  - Link to `/developers` (للمطورين والربط البرمجي)
  - Link to `/#pricing` (باقات وني)
- **Related Articles:** Article 02, Article 05, Article 10
- **Cannibalization Risk & Mitigation:** May overlap with Article 10. *Mitigation:* Article 01 is written from a business & commercial perspective; Article 10 focuses on technical/developer architecture.

---

### Article 02: WhatsApp CRM: يعني إيه وإمتى شركتك تحتاجه؟
- **Suggested Slug:** `whatsapp-crm-guide-for-businesses`
- **Primary Keyword:** `WhatsApp CRM`
- **Secondary Keywords:** `واتساب CRM`, `إدارة علاقات العملاء عبر واتساب`, `صندوق وارد واتساب للفريق`, `تتبع محادثات واتساب`, `CRM واتساب للشركات`
- **Search Intent:** Informational / Commercial
- **Target Audience:** Sales managers and business owners needing a unified team inbox, conversation assignment, and customer tracking.
- **Recommended Pillar Page:** Homepage (`/`)
- **Internal Links to Include:**
  - Link to `/` (صندوق وارد الفريق وإدارة العملاء)
  - Link to `/#features` (مميزات وني CRM)
  - Link to `/#pricing` (البدء مجاناً)
- **Related Articles:** Article 01, Article 03, Article 07
- **Cannibalization Risk & Mitigation:** Homepage mentions CRM. *Mitigation:* Homepage captures product purchase intent; Article 02 ranks for informational queries explaining CRM definitions, workflow benefits, and readiness criteria.

---

### Article 03: أتمتة واتساب: إزاي تخلي الردود تشتغل 24/7؟
- **Suggested Slug:** `whatsapp-automation-guide-24-7`
- **Primary Keyword:** `أتمتة واتساب`
- **Secondary Keywords:** `WhatsApp Automation`, `الرد التلقائي على واتساب`, `أتمتة رسائل واتساب`, `بوت واتساب للرد التلقائي`, `أتمتة خدمة العملاء واتساب`
- **Search Intent:** Informational / Practical Guide
- **Target Audience:** eCommerce merchants and service businesses losing leads during off-hours or delayed reply times.
- **Recommended Pillar Page:** Homepage (`/`) & Strategies (`/strategies`)
- **Internal Links to Include:**
  - Link to `/` (محرك الأتمتة والرد الذكي)
  - Link to `/strategies` (استراتيجيات التسويق والأتمتة)
  - Link to `/#pricing`
- **Related Articles:** Article 06, Article 07, Article 11
- **Cannibalization Risk & Mitigation:** May overlap with Article 07 (Chatbots). *Mitigation:* Article 03 focuses on trigger-based automation rules (confirmations, hours, status triggers); Article 07 focuses on conversational AI assistants.

---

### Article 04: إزاي تعمل حملات واتساب ناجحة بدون سبام؟
- **Suggested Slug:** `successful-whatsapp-marketing-campaigns-without-spam`
- **Primary Keyword:** `حملات واتساب`
- **Secondary Keywords:** `WhatsApp Campaigns`, `حملات واتساب إعلانية`, `إرسال رسائل واتساب تسويقية`, `تجنب حظر واتساب في الحملات`, `قوالب رسائل واتساب الإعلانية`
- **Search Intent:** Informational / Best Practices
- **Target Audience:** Marketers and store owners running broadcast promotions who want to protect their phone numbers from Meta bans.
- **Recommended Pillar Page:** Strategies (`/strategies`) & Homepage (`/`)
- **Internal Links to Include:**
  - Link to `/strategies` (دليل الاستراتيجيات التسويقية)
  - Link to `/` (نظام إرسال الحملات المعتمد من Meta)
- **Related Articles:** Article 08, Article 09
- **Cannibalization Risk & Mitigation:** Overlap with Article 08 & Article 09. *Mitigation:* Article 04 specifically focuses on compliance, opt-in building, Meta quality score, and anti-spam strategies.

---

### Article 05: WhatsApp Business API في مصر: دليل الشركات
- **Suggested Slug:** `whatsapp-business-api-egypt-guide`
- **Primary Keyword:** `WhatsApp Business API مصر`
- **Secondary Keywords:** `واتساب بزنس API مصر`, `تكلفة واتساب API في مصر`, `شريك Meta في مصر`, `طرق الدفع واتساب API مصر`, `WhatsApp API Egypt`
- **Search Intent:** Commercial / Local Informational
- **Target Audience:** Egyptian startups, retail brands, and eCommerce stores looking for local payment methods and WhatsApp solutions.
- **Recommended Pillar Page:** Homepage (`/`) & Developers (`/developers`)
- **Internal Links to Include:**
  - Link to `/` (شريك رسمي معتمد وطرق دفع محلية فواتيرك)
  - Link to `/developers` (بورتال المطورين)
  - Link to `/#pricing` (الأسعار بالجنيه المصري)
- **Related Articles:** Article 01, Article 10, Article 13
- **Cannibalization Risk & Mitigation:** Local geo-intent ensures this article captures "in Egypt" queries without diluting general product pages.

---

### Article 06: إزاي تسترجع السلات المتروكة باستخدام واتساب؟
- **Suggested Slug:** `recover-abandoned-carts-via-whatsapp`
- **Primary Keyword:** `استرجاع السلات المتروكة واتساب`
- **Secondary Keywords:** `WhatsApp Abandoned Cart`, `استرجاع السلة المتروكة`, `رسائل تذكير السلة المتروكة`, `تقليل السلات المتروكة في المتجر`, `Abandoned Cart Recovery WhatsApp`
- **Search Intent:** Informational / Step-by-Step Tutorial
- **Target Audience:** Store owners on Shopify, WooCommerce, or EasyOrders looking to boost checkout recovery rates.
- **Recommended Pillar Page:** Abandoned Cart Strategy (`/strategies/abandoned-cart`)
- **Internal Links to Include:**
  - Link to `/strategies/abandoned-cart` (استعراض استراتيجية السلات المتروكة)
  - Link to `/strategies` (باقي الاستراتيجيات)
  - Link to `/#pricing`
- **Related Articles:** Article 03, Article 11, Article 12
- **Cannibalization Risk & Mitigation:** Directly supports `/strategies/abandoned-cart`. The landing page is commercial; this article provides educational copy templates, timing delays, and discount strategies.

---

### Article 07: WhatsApp Chatbot للشركات: دليلك لبناء شات بوت ذكي
- **Suggested Slug:** `whatsapp-chatbot-for-businesses-guide`
- **Primary Keyword:** `WhatsApp Chatbot`
- **Secondary Keywords:** `شات بوت واتساب للشركات`, `بوت واتساب ذكي`, `AI Chatbot واتساب`, `تصميم بوت واتساب`, `مساعد مبيعات واتساب`
- **Search Intent:** Informational / Commercial Investigation
- **Target Audience:** Business owners seeking conversational AI bots to qualify leads, answer FAQs, and assist buyers.
- **Recommended Pillar Page:** Homepage (`/`)
- **Internal Links to Include:**
  - Link to `/` (مساعد المبيعات الذكي AI Sales Assistant)
  - Link to `/#features`
  - Link to `/#pricing`
- **Related Articles:** Article 02, Article 03, Article 09
- **Cannibalization Risk & Mitigation:** Homepage showcases the feature; Article 07 educates on conversational flows, AI system prompts, and guardrails.

---

### Article 08: إرسال رسائل واتساب جماعية بطريقة صحيحة وقانونية
- **Suggested Slug:** `bulk-whatsapp-messages-correct-way`
- **Primary Keyword:** `رسائل واتساب جماعية`
- **Secondary Keywords:** `Bulk WhatsApp Messages`, `إرسال واتساب جماعي بدون حظر`, `برنامج إرسال رسائل واتساب جماعية`, `طريقة إرسال رسائل واتساب لكل العملاء`, `WhatsApp Broadcast API`
- **Search Intent:** Informational / Solution-Seeking
- **Target Audience:** Merchants wanting to message their customer lists safely at scale.
- **Recommended Pillar Page:** Homepage (`/`)
- **Internal Links to Include:**
  - Link to `/` (إدارة جهات الاتصال والحملات)
  - Link to `/strategies`
- **Related Articles:** Article 04, Article 09
- **Cannibalization Risk & Mitigation:** Focuses strictly on the mechanics of contact segmentation, broadcast lists vs API broadcasts, and Meta messaging tiers.

---

### Article 09: التسويق عبر واتساب للشركات: الدليل الشامل لزيادة المبيعات
- **Suggested Slug:** `whatsapp-marketing-guide-for-companies`
- **Primary Keyword:** `التسويق عبر واتساب`
- **Secondary Keywords:** `WhatsApp Marketing للشركات`, `دليل التسويق عبر واتساب`, `استراتيجية تسويق واتساب`, `زيادة المبيعات عبر واتساب`, `WhatsApp Marketing Strategy`
- **Search Intent:** Informational (Comprehensive Educational Guide)
- **Target Audience:** Marketing directors, eCommerce managers, and growth strategists.
- **Recommended Pillar Page:** Strategies Hub (`/strategies`)
- **Internal Links to Include:**
  - Link to `/strategies` (بوابة استراتيجيات وني)
  - Link to `/strategies/abandoned-cart`
  - Link to `/`
- **Related Articles:** Article 04, Article 06, Article 08
- **Cannibalization Risk & Mitigation:** Target keyword matches `/strategies`. *Mitigation:* `/strategies` is a concise commercial hub; Article 09 is the comprehensive theoretical and tactical guide that ranks for long-tail informational searches and channels readers into `/strategies`.

---

### Article 10: WhatsApp API vs WhatsApp Business: المقارنة الفنية والعملية
- **Suggested Slug:** `whatsapp-api-vs-whatsapp-business-comparison`
- **Primary Keyword:** `WhatsApp API vs WhatsApp Business`
- **Secondary Keywords:** `الفرق بين تطبيق واتساب بيزنس وواتساب API`, `WhatsApp Cloud API vs Business App`, `حدود واتساب بزنس العادي`, `مقارنة واتساب للمطورين`
- **Search Intent:** Technical / Commercial Evaluation
- **Target Audience:** CTOs, tech leads, and product engineers choosing the right infrastructure.
- **Recommended Pillar Page:** Developers Portal (`/developers`)
- **Internal Links to Include:**
  - Link to `/developers` (بورتال المطورين)
  - Link to `/developers/docs` (التوثيق البرمجي)
  - Link to `/` (المنصة التجارية)
- **Related Articles:** Article 01, Article 13, Article 14
- **Cannibalization Risk & Mitigation:** Focuses on technical architecture, rate limits, webhooks, hosting models, and API throughput.

---

### Article 11: إزاي تربط Shopify بواتساب لأتمتة الطلبات والسلات المتروكة؟
- **Suggested Slug:** `integrate-shopify-with-whatsapp-guide`
- **Primary Keyword:** `Shopify WhatsApp Integration`
- **Secondary Keywords:** `ربط شوبيفاي مع واتساب`, `Shopify WhatsApp Bot`, `إشعارات طلبات شوبيفاي واتساب`, `استرجاع سلات شوبيفاي واتساب`, `تكامل واتساب Shopify`
- **Search Intent:** Informational / Practical Tutorial
- **Target Audience:** Shopify store managers and eCommerce agencies.
- **Recommended Pillar Page:** Abandoned Cart (`/strategies/abandoned-cart`) & Homepage (`/`)
- **Internal Links to Include:**
  - Link to `/strategies/abandoned-cart` (أتمتة السلات المتروكة لـ Shopify)
  - Link to `/` (ربط المتاجر الإلكترونية)
  - Link to `/#pricing`
- **Related Articles:** Article 03, Article 06, Article 12
- **Cannibalization Risk & Mitigation:** Highly specific platform keyword. Zero risk of cannibalizing general pages.

---

### Article 12: ربط WooCommerce بواتساب لإشعارات الطلبات والمتابعة
- **Suggested Slug:** `integrate-woocommerce-with-whatsapp-guide`
- **Primary Keyword:** `WooCommerce WhatsApp Integration`
- **Secondary Keywords:** `ربط ووكومرس مع واتساب`, `إشعارات طلبات ووكومرس واتساب`, `WooCommerce WhatsApp Notifications`, `واتساب ووردبريس`, `تكامل واتساب ووكومرس`
- **Search Intent:** Informational / Practical Tutorial
- **Target Audience:** WordPress & WooCommerce store administrators and web developers.
- **Recommended Pillar Page:** Abandoned Cart (`/strategies/abandoned-cart`) & Homepage (`/`)
- **Internal Links to Include:**
  - Link to `/strategies/abandoned-cart`
  - Link to `/` (تكامل WooCommerce)
  - Link to `/#pricing`
- **Related Articles:** Article 03, Article 06, Article 11
- **Cannibalization Risk & Mitigation:** Highly specific platform keyword. Zero risk of cannibalizing general pages.

---

### Article 13: WhatsApp Cloud API للمبتدئين: دليلك العملي للبدء
- **Suggested Slug:** `whatsapp-cloud-api-beginners-guide`
- **Primary Keyword:** `WhatsApp Cloud API`
- **Secondary Keywords:** `شرح WhatsApp Cloud API`, `واتساب كلاود API`, `حساب مطور Meta واتساب`, `WABA إعداد`, `WhatsApp Cloud API شرح عربي`
- **Search Intent:** Developer / Educational Guide
- **Target Audience:** Software engineers and developers integrating Meta's direct Cloud API.
- **Recommended Pillar Page:** Developers (`/developers`) & Docs (`/developers/docs`)
- **Internal Links to Include:**
  - Link to `/developers` (بورتال مطوري وني)
  - Link to `/developers/docs` (دليل الأكواد والـ Endpoints)
  - Link to `/developers/signup`
- **Related Articles:** Article 10, Article 14, Article 15
- **Cannibalization Risk & Mitigation:** Explains Meta Cloud API fundamentals and contrasts them with Wani's simplified wrapper API.

---

### Article 14: إرسال رسالة واتساب باستخدام API (أمثلة Node.js و Python و cURL)
- **Suggested Slug:** `send-whatsapp-message-using-api-tutorial`
- **Primary Keyword:** `إرسال رسالة واتساب API`
- **Secondary Keywords:** `Send WhatsApp message API`, `كود إرسال رسالة واتساب`, `WhatsApp API Nodejs`, `WhatsApp API Python`, `إرسال رسائل واتساب برمجياً`
- **Search Intent:** Developer / Practical Code Tutorial
- **Target Audience:** Backend programmers seeking direct code snippets and payload examples.
- **Recommended Pillar Page:** API Documentation (`/developers/docs`)
- **Internal Links to Include:**
  - Link to `/developers/docs` (مرجع الـ API الكامل)
  - Link to `/developers`
  - Link to `/developers/signup` (الحصول على API Key)
- **Related Articles:** Article 13, Article 15
- **Cannibalization Risk & Mitigation:** Pure code snippet and tutorial intent supporting the official documentation page.

---

### Article 15: WhatsApp API Webhooks: شرح عملي لاستقبال الرسائل وتحديثات الحالة
- **Suggested Slug:** `whatsapp-api-webhooks-practical-guide`
- **Primary Keyword:** `WhatsApp API Webhook`
- **Secondary Keywords:** `استقبال رسائل واتساب Webhook`, `WhatsApp Webhook Nodejs`, `تتبع تسليم رسائل واتساب`, `Webhook WhatsApp Cloud API`, `أحداث واتساب ويب هوك`
- **Search Intent:** Developer / Technical Guide
- **Target Audience:** Developers building event-driven message receivers, delivery status handlers, and two-way communication logic.
- **Recommended Pillar Page:** API Documentation (`/developers/docs`)
- **Internal Links to Include:**
  - Link to `/developers/docs` (مرجع Webhooks والأحداث)
  - Link to `/developers`
- **Related Articles:** Article 13, Article 14
- **Cannibalization Risk & Mitigation:** Focuses on the receiver architecture, payload verification, and webhook server setup.

---

## 6. Future Topic Clusters (Clusters A through I)

```
===================================================================================
Cluster A: WhatsApp Business (واتساب للأعمال)
===================================================================================
- Pillar Page: / (Homepage)
- Target Intent: Commercial / Platform Evaluation
- Internal Link Destination: / and /#pricing
- Core Topics & Supporting Articles:
  * واتساب بزنس vs WhatsApp Business API (Article 01)
  * WhatsApp Business API في مصر: دليل الشركات (Article 05)
  * WhatsApp API vs WhatsApp Business (Article 10)
  * شروط وسياسات استخدام واتساب للأعمال

===================================================================================
Cluster B: WhatsApp CRM (إدارة علاقات العملاء)
===================================================================================
- Pillar Page: / (Homepage — Features Section)
- Target Intent: Commercial / Operational Efficiency
- Internal Link Destination: /#features and /
- Core Topics & Supporting Articles:
  * WhatsApp CRM: يعني إيه وإمتى شركتك تحتاجه؟ (Article 02)
  * إدارة صندوق وارد واتساب الموحد لفرق المبيعات والدعم
  * كيفية تصنيف وتقسيم العملاء وقوائم الـ VIP على واتساب
    → Now a dedicated commercial page: /strategies/retargeting
  * تقييم أداء موظفي خدمة العملاء على واتساب

===================================================================================
Cluster C: WhatsApp Marketing (التسويق عبر واتساب)
===================================================================================
- Pillar Page: /strategies (Marketing Strategies Hub)
- Target Intent: Commercial / Strategic ROI
- Internal Link Destination: /strategies and /#pricing
- Core Topics & Supporting Articles:
  * إزاي تعمل حملات واتساب ناجحة بدون سبام؟ (Article 04)
  * إرسال رسائل واتساب جماعية بطريقة صحيحة وقانونية (Article 08)
  * التسويق عبر واتساب للشركات: الدليل الشامل (Article 09)
  * كيفية كتابة قوالب رسائل واتساب ترويجية تحقق أعلى نسبة نقر

===================================================================================
Cluster D: WhatsApp Automation (أتمتة واتساب)
===================================================================================
- Pillar Page: /strategies and /
- Target Intent: Informational / Workflow Automation
- Internal Link Destination: /strategies and /
- Core Topics & Supporting Articles:
  * أتمتة واتساب: إزاي تخلي الردود تشتغل 24/7؟ (Article 03)
  * أتمتة إشعارات تأكيد وشحن الطلبات للعملاء
  * إعداد رسائل المتابعة والتقييم التلقائي بعد الشراء
  * أتمتة استعادة العملاء غير النشطين (Win-back Campaigns)
    → Now a dedicated commercial page: /strategies/retargeting

===================================================================================
Cluster E: WhatsApp AI / Chatbot (الذكاء الاصطناعي والشات بوت)
===================================================================================
- Pillar Page: / (Homepage — AI Sales Assistant Section)
- Target Intent: Commercial / AI Adoption
- Internal Link Destination: / and /#features
- Core Topics & Supporting Articles:
  * WhatsApp Chatbot للشركات: دليلك الشامل (Article 07)
  * كيف يساعدك AI Sales Assistant على قفل الصفقات تلقائياً؟
  * تدريب روبوت الذكاء الاصطناعي على كتالوج منتجاتك وسياساتك
  * المقارنة بين الشات بوت التقليدي المبني على قواعد والشات بوت الذكي (AI)

===================================================================================
Cluster F: WhatsApp API (واجهة برمجة التطبيقات للمطورين)
===================================================================================
- Pillar Page: /developers (Developer Portal)
- Target Intent: Developer / Technical Evaluation
- Internal Link Destination: /developers and /developers/docs
- Core Topics & Supporting Articles:
  * WhatsApp Cloud API للمبتدئين (Article 13)
  * إرسال رسالة واتساب باستخدام API (Article 14)
  * WhatsApp API Webhooks (Article 15)
  * كيفية ترقية Messaging Tier وزيادة حد الرسائل اليومي في Meta

===================================================================================
Cluster G: eCommerce + WhatsApp (التجارة الإلكترونية وواتساب)
===================================================================================
- Pillar Page: /strategies/abandoned-cart
- Target Intent: Commercial / Conversion Optimization
- Internal Link Destination: /strategies/abandoned-cart and /
- Core Topics & Supporting Articles:
  * إزاي تسترجع السلات المتروكة باستخدام واتساب؟ (Article 06)
  * إزاي تربط Shopify بواتساب؟ (Article 11)
  * ربط WooCommerce بواتساب لإشعارات الطلبات (Article 12)
  * تكامل EasyOrders مع واتساب للتجارة الإلكترونية في مصر

===================================================================================
Cluster H: WhatsApp OTP (التحقق ورموز المرور)
===================================================================================
- Pillar Page: /developers (Developer Portal — OTP Section)
- Target Intent: Developer / Security & Verification
- Internal Link Destination: /developers and /developers/docs
- Core Topics & Supporting Articles:
  * لماذا يعتبر WhatsApp OTP بديلاً أفضل وأرخص من SMS OTP؟
  * كيفية ربط وإرسال OTP عبر واتساب في تطبيقات React / Node.js
  * أفضل ممارسات أمان التحقق بخطوتين عبر واتساب
  * حساب معدل توصيل الـ OTP وسرعة التسليم

===================================================================================
Cluster I: WhatsApp Business API in Egypt (واتساب للأعمال في مصر)
===================================================================================
- Pillar Page: / (Homepage)
- Target Intent: Commercial / Local Decision Making
- Internal Link Destination: / and /#pricing
- Core Topics & Supporting Articles:
  * WhatsApp Business API في مصر: دليل الشركات (Article 05)
  * طرق دفع رسائل واتساب الرسمية في مصر بالجنيه المصري (Fawaterak)
  * قصص نجاح وتجارب براندات تجارية مصرية تستخدم وني
  * كيفية توثيق حساب Meta Business للشركات المصرية بالعلامة الخضراء
===================================================================================
```

---

## 7. Guidelines & Best Practices for Future Content Writers

1. **Brand Voice:** Professional, clear, practical, and conversational. Egyptian Arabic should feel natural and respectful, avoiding stiff classic academic language as well as overly casual street slang.
2. **No False Promises or Fake Metrics:**
   - Never fabricate search volume metrics, CPC values, or ranking difficulty numbers.
   - Never invent product capabilities, certifications, partners, or awards that Wani does not possess.
   - All references to WhatsApp delivery rates must reflect realistic official WhatsApp API averages (e.g. 95%–98% open rates).
3. **Keyword Density & Placement:**
   - Place the **Primary Keyword** naturally in:
     1. The H1 Title (within the first 60 characters)
     2. The first 100 words of the introduction
     3. At least one H2 sub-heading
     4. The meta title and meta description
     5. The image alt tag (when relevant)
   - Do not keyword-stuff. The writing must read smoothly and prioritize the human reader's intent.
4. **Structured Content Requirements:**
   - Use clear markdown hierarchy: one single `# H1`, followed by `## H2` and `### H3` sections.
   - Utilize bullet points, comparison tables, and code snippets to enhance readability.
   - Include a concise 2–3 sentence executive summary / excerpt at the top of every article.
5. **Call-to-Action (CTA) Standard:**
   - Every published article must conclude with a contextual conversion section directing the user to sign up free or explore the relevant Wani dashboard tool.
