# 📝 دليل نظام مقالات Wani (Markdown Articles)

## 1. مكان وضع المقالات

جميع ملفات المقالات توضع داخل هذا المجلد:

```text
src/content/articles/
```

- صيغة الملفات: **`.md`** (Markdown القياسي)
- اسم الملف يجب أن يطابق تماماً الـ **slug**:

```text
whatsapp-business-vs-api-difference.md
whatsapp-crm-guide-for-businesses.md
```

> **ملاحظة المسودات:** أي ملف يبدأ بـ `_` (مثل `_draft-article.md`) أو ملف `README.md` يتم تجاهله تلقائياً بواسطة الـ loader ولن يظهر في الموقع أو الـ sitemap.

---

## 2. قواعد الـ Slug

- **أحرف إنجليزية صغيرة + أرقام + شرطات (`-`) فقط**: `/^[a-z0-9-]+$/`
- ممنوع المسافات أو الرموز الخاصة أو الحروف العربية في الـ slug.
- يجب أن يكون الـ slug فريداً لكل مقال.
- راجع `SEO_KEYWORD_MAP.md` لاختيار الـ slugs الاستراتيجية المعتمدة.

---

## 3. الـ Frontmatter والمواصفات

كل مقال يبدأ بـ YAML Frontmatter محاط بـ `---` في أعلى الملف:

### الحقول الإجبارية (Required)

| الحقل | النوع | الوصف |
| :--- | :--- | :--- |
| `title` | `string` | عنوان المقال (يُعرض كـ `<h1>` وحيد في الصفحة وكـ SEO Title) |
| `slug` | `string` | معرّف الـ URL الفريد بالإنجليزية |
| `description` | `string` | وصف الـ SEO التعريفي (120-160 حرف لنتائج محركات البحث) |
| `publishedAt` | `string` | تاريخ النشر بتنسيق ISO مثل `"2026-09-01"` (إجباري بدون fallback) |

### الحقول الاختيارية (Optional)

| الحقل | النوع | الوصف | القيمة الافتراضية |
| :--- | :--- | :--- | :--- |
| `excerpt` | `string` | نبذة مختصرة تظهر أسفل العنوان وفي كروت القوائم | `null` |
| `keywords` | `string[]` | كلمات مفتاحية موجهة لمحركات البحث | `[]` |
| `category` | `string` | تصنيف المقال (مثل `"whatsapp-marketing"`) | `null` |
| `tags` | `string[]` | وسوم إضافية لتصنيف المحتوى | `[]` |
| `author` | `string` | اسم الكاتب (عند استخدام `"Wani"` تُعرّف كـ Organization في JSON-LD) | `"Wani"` |
| `updatedAt` | `string` | تاريخ آخر تعديل على المقال بتنسيق ISO `"YYYY-MM-DD"` | `null` |
| `coverImage` | `string` | رابط صورة الغلاف | `null` |
| `coverImageAlt` | `string` | النص البديل لصورة الغلاف | `null` |
| `featured` | `boolean` | هل المقال مميز؟ | `false` |
| `robots` | `object` | تحكم الأرشفة: `index: true/false`, `follow: true/false` | `{ index: true, follow: true }` |
| `canonical` | `string` | رابط Canonical مخصص | `https://aiwni.com/articles/{slug}` |
| `ogTitle` | `string` | تخصيص عنوان OpenGraph | يطابق `title` |
| `ogDescription` | `string` | تخصيص وصف OpenGraph | يطابق `description` |
| `ogImage` | `string` | تخصيص صورة OpenGraph | يطابق `coverImage` |
| `readingTime` | `number` | وقت القراءة بالدقائق (يُحسب تلقائياً إن لم يُحدد) | محسوب تلقائياً |
| `relatedArticles` | `string[]` | مصفوفة slugs لمقالات ذات صلة لعرضها أسفل المقال | `[]` |

---

## 4. هيكل محتوى المقال (قاعدة الـ Headings)

> ⚠️ **تنبيه هام جداً بخصوص الـ H1:**
> صفحة المقال تحتوي بالفعل على وسم `<h1>` واحد فقط وهو **عنوان المقال** القادم من الـ Frontmatter.
> لذلك **يجب أن يبدأ محتوى المقال داخل الـ Markdown بـ `##` (H2)** وليس بـ `#` (H1)، للحفاظ على معايير الـ SEO الدقيقة وعدم تكرار وسم H1.

---

## 5. Template جاهز لإنشاء مقال جديد

```markdown
---
title: "عنوان المقال الكامل هنا"
slug: "article-slug-here"
description: "وصف جذاب ومختصر لمحركات البحث يشرح محتوى المقال في 120-160 حرف."
excerpt: "نبذة تمهيدية سريعة تظهر أعلى المقال وفي بطاقة المقال بصفحة /articles."

keywords:
  - كلمة مفتاحية رئيسية
  - كلمة مفتاحية ثانوية
  - WhatsApp Marketing

category: "whatsapp-marketing"
tags:
  - واتساب
  - أتمتة
  - مبيعات

author: "Wani"

publishedAt: "2026-09-01"
updatedAt: "2026-09-01"

coverImage: ""
coverImageAlt: "وصف واضح لصورة الغلاف"

featured: false

robots:
  index: true
  follow: true

relatedArticles:
  - other-article-slug
---

## المقدمة

نص المقدمة يبدأ هنا مباشرة باستخدام عناوين فرعية H2...

## القسم الرئيسي الأول

شرح الفكرة مع نقاط توضيحية:

- نقطة أولى
- نقطة ثانية
- نقطة ثالثة

### تفاصيل فرعية (H3)

تفاصيل إضافية...

> **نصيحة عملية:** نصيحة هامة ومميزة للقارئ.

| الميزة | التفاصيل | الفائدة |
| :--- | :--- | :--- |
| أتمتة الردود | رد فوري 24/7 | زيادة المبيعات |

[تعرف على باقات وني](/#pricing)
```

---

## 6. سير العمل التلقائي

بمجرد حفظ الملف باسم `slug.md` داخل هذا المجلد:
1. يقرأه الـ Loader (`src/lib/articles.ts`) ويتحقق من سلامة البيانات والتواريخ.
2. يظهر تلقائياً في صفحة المقالات `/articles`.
3. يُنشئ صفحته الثابتة `/articles/{slug}` مع كامل الـ Metadata و JSON-LD Schema و OpenGraph.
4. يُدرج تلقائياً في ملف `sitemap.xml`.
