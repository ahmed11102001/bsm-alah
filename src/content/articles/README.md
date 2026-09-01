# 📝 دليل كتابة مقالات Wani (MDX Articles)

## المكان

كل مقال يتم إنشاؤه كملف `.mdx` داخل هذا المجلد:

```
src/content/articles/
```

## شكل ملف المقال

اسم الملف يجب أن يكون **slug المقال** + `.mdx`:

```
whatsapp-business-vs-api-difference.mdx
whatsapp-crm-guide-for-businesses.mdx
```

## Frontmatter المطلوب

كل ملف MDX يبدأ بـ frontmatter بين `---`:

### الحقول الإجبارية

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `title` | string | عنوان المقال |
| `slug` | string | معرّف URL فريد (حروف إنجليزية + أرقام + شرطات فقط) |
| `description` | string | وصف SEO (يظهر في نتائج البحث، 120-160 حرف) |
| `publishedAt` | date | تاريخ النشر (YYYY-MM-DD) |

### الحقول الاختيارية

| الحقل | النوع | الوصف | القيمة الافتراضية |
|-------|-------|-------|-------------------|
| `excerpt` | string | وصف مختصر للعرض في القوائم | `null` |
| `keywords` | string[] | كلمات مفتاحية SEO | `[]` |
| `category` | string | تصنيف المقال | `null` |
| `tags` | string[] | وسوم للتصفية | `[]` |
| `author` | string | اسم الكاتب | `"Wani"` |
| `updatedAt` | date | تاريخ آخر تحديث | `null` |
| `coverImage` | string | رابط صورة الغلاف | `null` |
| `coverImageAlt` | string | نص بديل لصورة الغلاف | `null` |
| `featured` | boolean | هل هو مقال مميز؟ | `false` |
| `robots` | string | تحكم في الأرشفة | `"index, follow"` |
| `canonical` | string | رابط canonical مخصص | يتم توليده تلقائياً |
| `ogTitle` | string | عنوان Open Graph | يستخدم `title` |
| `ogDescription` | string | وصف Open Graph | يستخدم `description` |
| `ogImage` | string | صورة Open Graph | يستخدم `coverImage` |
| `readingTime` | number | وقت القراءة بالدقائق | يتم حسابه تلقائياً |
| `relatedArticles` | string[] | slugs مقالات مرتبطة | `[]` |

## Template جاهز

انسخ هذا القالب لإنشاء مقال جديد:

```mdx
---
title: ""
slug: ""
description: ""
excerpt: ""

keywords: []

category: ""
tags: []

author: "Wani"

publishedAt: "2026-01-01"
updatedAt: ""

coverImage: ""
coverImageAlt: ""

featured: false

relatedArticles: []
---

# عنوان المقال

محتوى المقال هنا...

## عنوان فرعي

نص تحت العنوان الفرعي...

### نقطة مهمة

- نقطة 1
- نقطة 2
- نقطة 3

> اقتباس أو نصيحة مهمة

[رابط لصفحة وني](/)
```

## قواعد الـ Slug

- **حروف إنجليزية فقط** + أرقام + شرطات (-)
- **فريد** — لا يمكن أن يتكرر slug لمقالين
- **مستقر** — لا تغيّر slug بعد النشر (يكسر الروابط والـ SEO)
- **وصفي** — يجب أن يعكس محتوى المقال
- راجع `SEO_KEYWORD_MAP.md` للـ slugs المقترحة

## قواعد SEO

1. **العنوان**: واضح ويحتوي الكلمة المفتاحية الرئيسية
2. **الوصف**: 120-160 حرف، يشرح فائدة المقال للقارئ
3. **الكلمات المفتاحية**: 3-6 كلمات مرتبطة بالموضوع (لا تحشو)
4. **الروابط الداخلية**: اربط بالصفحات ذات الصلة (`/`, `/strategies`, `/#pricing`)
5. **المقالات المرتبطة**: أضف 2-3 slugs لمقالات ذات صلة

## إضافة صورة

### صورة الغلاف

```yaml
coverImage: "https://res.cloudinary.com/your-cloud/image/upload/..."
coverImageAlt: "وصف دقيق ومفيد للصورة — تجنب كلمات عامة مثل 'صورة' أو 'image'"
```

### صور داخل المقال

```mdx
![وصف الصورة](https://example.com/image.jpg)
```

## إضافة Related Articles

```yaml
relatedArticles:
  - whatsapp-crm-guide-for-businesses
  - whatsapp-automation-guide-24-7
```

يتم عرضها تلقائياً أسفل المقال كروابط.

## طريقة النشر

1. أنشئ ملف `.mdx` في `src/content/articles/`
2. املأ الـ frontmatter بالحقول الإجبارية
3. اكتب المحتوى بصيغة Markdown
4. ادفع التغييرات إلى Git
5. المقال سيظهر تلقائياً في:
   - صفحة `/articles`
   - صفحة `/articles/{slug}`
   - ملف `sitemap.xml`

## كيف يعمل النظام

```
ملف MDX → src/lib/articles.ts (loader) → صفحات Next.js
                                        → Metadata & SEO
                                        → Sitemap
                                        → JSON-LD
```

- الـ loader يقرأ كل ملفات `.mdx` من هذا المجلد
- يتحقق من صحة الـ frontmatter (يعطي خطأ واضح لو ناقص حقل إجباري)
- يولّد metadata و JSON-LD تلقائياً من البيانات
- المقالات **لا تعتمد على Database** — كلها من الملفات

## ملاحظات

- لا تعدّل `README.md` هذا إلا لتحديث التوثيق
- لا تنشئ مجلدات فرعية — كل المقالات في مستوى واحد
- الملفات التي تبدأ بـ `_` أو `README.md` يتم تجاهلها
