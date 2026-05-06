// src/lib/translations.ts
// ─── Landing Page Translations (AR / EN) ─────────────────────────────────────

export type Lang = "ar" | "en";

export const t = {
  // ── Navbar ──────────────────────────────────────────────────────────────────
  nav: {
    logo:    { ar: "واتس برو",       en: "WhatsPro" },
    logoHighlight: { ar: "برو",      en: "Pro" },
    features:  { ar: "المميزات",     en: "Features" },
    howItWorks:{ ar: "كيف يعمل",    en: "How It Works" },
    pricing:   { ar: "الأسعار",      en: "Pricing" },
    testimonials:{ ar: "آراء العملاء", en: "Testimonials" },
    faq:       { ar: "الأسئلة الشائعة", en: "FAQ" },
    login:     { ar: "تسجيل الدخول", en: "Login" },
    langSwitch:{ ar: "EN",           en: "AR" },
  },

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: {
    badge:       { ar: "المنصة الأكثر تطوراً في مصر", en: "Egypt's Most Advanced Platform" },
    h1a:         { ar: "اجعل الواتساب",               en: "Turn WhatsApp Into" },
    h1highlight: { ar: "ماكينة مبيعات",               en: "a Sales Machine" },
    h1b:         { ar: "متكاملة",                     en: "— Fully Integrated" },
    subtitle:    {
      ar: "ليس مجرد إرسال رسائل ... بل منصة متكاملة لإدارة حملاتك التسويقية على الواتساب بدون فوضى، بدون تأخير وبأعلى كفاءة",
      en: "Not just messaging — a full platform to manage your WhatsApp marketing campaigns without chaos, without delays, and at peak efficiency.",
    },
    stat1: { ar: "إرسال سريع",   en: "Fast Delivery" },
    stat2: { ar: "تواصل مريح",   en: "Seamless Chat" },
    stat3: { ar: "آمن وموثوق",   en: "Safe & Reliable" },
    cta:        { ar: "ابدأ الآن مجاناً",   en: "Start Free Now" },
    ctaWatch:   { ar: "شاهد كيف يعمل",      en: "See How It Works" },
    // chat mockup
    chatHeader: { ar: "واتس برو",    en: "WhatsPro" },
    chatOnline: { ar: "متصل الآن",   en: "Online now" },
    msg1:       { ar: "ممكن تفاصيل لو سمحت؟", en: "Can I get more details please?" },
    msg2:       { ar: "بالتأكيد! سأرسل قائمة العروض فوراً", en: "Sure! Sending our offers list right away." },
    msg3:       { ar: "تم إرسال قائمة العروض بنجاح 📎",    en: "Offers list sent successfully 📎" },
    typing:     { ar: "يكتب...",      en: "typing..." },
    statMsg:    { ar: "رسائل مرسلة", en: "Messages Sent" },
    statCont:   { ar: "جهات الاتصال", en: "Contacts" },
    chatInput:  { ar: "اكتب رسالة...", en: "Type a message..." },
    floatSent:  { ar: "تم الإرسال",   en: "Delivered" },
    floatSentSub: { ar: "1,234 رسالة", en: "1,234 messages" },
    floatConts: { ar: "جهات اتصال",   en: "Contacts" },
    floatContsSub: { ar: "5,678 عميل", en: "5,678 clients" },
    floatRate:  { ar: "نسبة التسليم", en: "Delivery Rate" },
  },

  // ── Features ────────────────────────────────────────────────────────────────
  features: {
    badge:    { ar: "مميزات النظام",     en: "Platform Features" },
    h2a:      { ar: "مش بس أداة إرسال —", en: "Not just a messaging tool —" },
    h2b:      { ar: "نظام تشغيل كامل",   en: "A Complete Operating System" },
    subtitle: {
      ar: "كل ميزة اتبنت عشان تحل مشكلة حقيقية بتواجهها في تواصلك مع العملاء يومياً",
      en: "Every feature was built to solve a real problem you face in daily customer communication.",
    },
    stat1: { ar: "نسبة التسليم",        en: "Delivery Rate" },
    stat2: { ar: "وقت الإعداد",         en: "Setup Time" },
    stat2v:{ ar: "15 دقيقة",            en: "15 minutes" },
    stat3: { ar: "دعم فني",             en: "Support" },
    stat4: { ar: "واتساب بيزنس",        en: "WhatsApp Business" },
    items: [
      {
        hook:  { ar: "مش ضروري تبعت رسالة رسالة",    en: "No need to send one by one" },
        title: { ar: "آلاف الرسائل — بضغطة واحدة",  en: "Thousands of messages — one click" },
        desc:  { ar: "أنشئ حملة، ارفع جهات الاتصال، واضغط إرسال. واتس برو بيتولى الباقي ويبعت لكل عميل بشكل فردي — مش كإعلان جماعي.", en: "Create a campaign, upload contacts, hit send. WhatsPro handles the rest and sends to each client individually — not as a broadcast." },
      },
      {
        hook:  { ar: "مش كل العملاء زي بعض",         en: "Not all customers are the same" },
        title: { ar: "جمهورك منقسم — مش تل واحد",   en: "Segmented audience — not one pile" },
        desc:  { ar: "قسّم عملاءك لقوائم: VIP، مهتمين، غير مستجيبين، عملاء جدد. وكل قائمة تاخد الرسالة المناسبة لها.", en: "Segment your customers into lists: VIP, interested, non-responsive, new clients. Each list gets the right message." },
      },
      {
        hook:  { ar: "مش بس 'تم الإرسال'",           en: "Not just 'sent'" },
        title: { ar: "شوف مين قرأ ومين مش رد",       en: "See who read and who didn't reply" },
        desc:  { ar: "لكل رسالة حالة: مرسلة ✓ — وصلت ✓✓ — قُرئت ✓✓ زرقاء. وتقارير كاملة توريك مين يحتاج متابعة.", en: "Every message has a status: sent ✓ — delivered ✓✓ — read ✓✓ blue. Full reports show who needs follow-up." },
      },
      {
        hook:  { ar: "7 الصبح مش وقت رسائل",         en: "7 AM is not message time" },
        title: { ar: "الرسالة الصح في الوقت الصح",   en: "The right message at the right time" },
        desc:  { ar: "جدوّل حملاتك للوقت اللي عملاءك بيكونوا فيه نشطين. التقارير بتديك أفضل وقت للإرسال بالساعة.", en: "Schedule campaigns for when your customers are most active. Reports give you the best sending time by the hour." },
      },
      {
        hook:  { ar: "ما تتعب في إعادة الكتابة",     en: "Stop rewriting the same things" },
        title: { ar: "قوالب معتمدة — مش هترفض",     en: "Approved templates — won't get rejected" },
        desc:  { ar: "قوالبك بتتراجعها Meta مرة واحدة وتستخدمها مرات لا نهائية. ردود فعلية من صندوق الوارد بدون ما تترك النظام.", en: "Your templates get reviewed by Meta once and used unlimited times. Reply from the inbox without leaving the system." },
      },
      {
        hook:  { ar: "مش لازم تعمل كل حاجة لوحدك", en: "You don't have to do it all alone" },
        title: { ar: "فريقك يشتغل معاك — مش بدلك",  en: "Your team works with you — not instead of you" },
        desc:  { ar: "أضف موظفين بصلاحيات محددة. كل واحد يشوف بس اللي محتاج يشوفه — وإنت عارف مين بعت إيه ولمين.", en: "Add staff with specific permissions. Each sees only what they need — and you track who sent what to whom." },
      },
      {
        hook:  { ar: "مش أرقام ديكور",               en: "Not vanity metrics" },
        title: { ar: "تقارير تقولك اتكسبت إيه",     en: "Reports that tell you what you gained" },
        desc:  { ar: "أفضل حملة، أعلى وقت تفاعل، العملاء الأكثر استجابة. تصدر الكل بـ Excel وتبني قرارات مبنية على بيانات.", en: "Best campaign, peak engagement time, most responsive customers. Export everything to Excel and make data-driven decisions." },
      },
      {
        hook:  { ar: "أدوات الإرسال العشوائي بتضر",  en: "Unofficial tools damage your account" },
        title: { ar: "حسابك واتساب محمي — مش في خطر", en: "Your WhatsApp account is protected" },
        desc:  { ar: "إحنا بنشتغل على واتساب بيزنس API الرسمي — مش أدوات هاك. نسبة تسليم 98.5% بدون أي إيقاف للحسابات.", en: "We operate on the official WhatsApp Business API — not hack tools. 98.5% delivery rate with zero account bans." },
      },
      {
        hook:  { ar: "ما في setup معقد",             en: "No complex setup" },
        title: { ar: "جاهز في 15 دقيقة — مش أيام",  en: "Ready in 15 minutes — not days" },
        desc:  { ar: "سجّل، اربط واتساب بيزنس API بمساعدة دليل خطوة بخطوة، ارفع جهات اتصالك، وابدأ أول حملة. كل ده في ربع ساعة.", en: "Sign up, connect WhatsApp Business API with a step-by-step guide, upload contacts, and launch your first campaign — all in 15 minutes." },
      },
    ],
  },

  // ── HowItWorks ───────────────────────────────────────────────────────────────
  how: {
    badge:    { ar: "خطوات العمل",    en: "How It Works" },
    h2a:      { ar: "من التسجيل لأول رسالة —", en: "From signup to first message —" },
    h2b:      { ar: "في أقل من 15 دقيقة",      en: "in less than 15 minutes" },
    subtitle: { ar: "4 خطوات واضحة. مفيش setup معقد. مفيش كورس تتعلمه.", en: "4 clear steps. No complex setup. No course needed." },
    ctaTitle: { ar: "جاهز تبدأ؟ الخطوة الأولى مجانية",      en: "Ready to start? The first step is free." },
    ctaSub:   { ar: "100 رسالة مجانية — بدون بطاقة ائتمان — بدون التزام", en: "100 free messages — no credit card — no commitment." },
    ctaBtn:   { ar: "ابدأ مجاناً الآن",                      en: "Start Free Now" },
    steps: [
      {
        title: { ar: "ارفع جهات اتصالك",       en: "Upload your contacts" },
        what:  { ar: "Excel أو CSV أو إدخال يدوي", en: "Excel, CSV, or manual entry" },
        desc:  { ar: "النظام بيحلل الملف تلقائياً، بيميّز الأرقام الصحيحة من الغلط، وبيقسمهم لقوائم جاهزة للاستخدام.", en: "The system auto-analyses the file, filters valid numbers, and organises them into ready-to-use lists." },
        time:  { ar: "دقيقة واحدة", en: "1 minute" },
      },
      {
        title: { ar: "اختار أو اعمل قالبك",    en: "Choose or create your template" },
        what:  { ar: "قوالب جاهزة أو مخصصة",   en: "Ready-made or custom templates" },
        desc:  { ar: "اختار من قوالبك المعتمدة أو اعمل رسالة جديدة. القوالب بتترسل عبر واتساب API الرسمي — مش هترفض.", en: "Pick from your approved templates or write a new message. Templates go through the official WhatsApp API — won't get rejected." },
        time:  { ar: "دقيقتين", en: "2 minutes" },
      },
      {
        title: { ar: "أرسل أو جدوّل الحملة",   en: "Send or schedule the campaign" },
        what:  { ar: "فوري أو في الوقت اللي تختاره", en: "Instantly or at your chosen time" },
        desc:  { ar: "اختار الجمهور المستهدف، راجع الملخص، واضغط إرسال. واتس برو بيكمل الشغل حتى لو قفلت الجهاز.", en: "Choose your target audience, review the summary, and hit send. WhatsPro keeps going even if you close your device." },
        time:  { ar: "دقيقتين", en: "2 minutes" },
      },
      {
        title: { ar: "تابع وحسّن",              en: "Track & improve" },
        what:  { ar: "تقارير لحظية كاملة",      en: "Full real-time reports" },
        desc:  { ar: "شوف مين وصل ومين قرأ ومين رد — وعلى أساس كده خطط حملتك الجاية أذكى.", en: "See who received, who read, who replied — and plan your next campaign smarter." },
        time:  { ar: "مستمر", en: "Ongoing" },
      },
    ],
  },

  // ── Pricing ──────────────────────────────────────────────────────────────────
  pricing: {
    badge:    { ar: "خطط الأسعار",   en: "Pricing Plans" },
    h2a:      { ar: "ادفع على قد ما تحتاج —", en: "Pay for what you need —" },
    h2b:      { ar: "وكبّر وقت ما تكبر",       en: "and scale as you grow" },
    subtitle: { ar: "ابدأ مجاناً بدون بطاقة ائتمان. الترقية سهلة في أي وقت.", en: "Start free with no credit card. Upgrade anytime with ease." },
    saveBadge:{ ar: "وفّر ٢٠٪ مع الاشتراك السنوي", en: "Save 20% with annual billing" },
    currency: { ar: "ج / شهر",       en: "EGP / mo" },
    free:     { ar: "مجاني",         en: "Free" },
    annualSave: { ar: "وفّر",        en: "Save" },
    annualSaveSuffix: { ar: "ج سنوياً", en: "EGP/yr" },
    guar1:    { ar: "بدون بطاقة ائتمان للباقة المجانية", en: "No credit card for free plan" },
    guar2:    { ar: "إلغاء في أي وقت بدون رسوم",         en: "Cancel anytime, no fees" },
    guar3:    { ar: "ترقية فورية وبدون انقطاع",           en: "Instant upgrade, zero downtime" },
    enterprise:{ ar: "عندك متطلبات خاصة؟", en: "Have special requirements?" },
    enterpriseLink:{ ar: "تواصل معنا للحصول على عرض مخصص", en: "Contact us for a custom quote" },
    plans: [
      {
        name:    { ar: "مجاني",    en: "Free" },
        tagline: { ar: "جرّب بدون أي التزام", en: "Try with zero commitment" },
        cta:     { ar: "ابدأ مجاناً", en: "Start Free" },
        features:[
          { ar: "١٠٠ جهة اتصال",     en: "100 contacts" },
          { ar: "١ مستخدم",           en: "1 user" },
          { ar: "٣ حملات فقط",        en: "3 campaigns only" },
          { ar: "صندوق الوارد النصي", en: "Text inbox" },
          { ar: "تقارير أساسية",      en: "Basic reports" },
          { ar: "حملات مجدولة",       en: "Scheduled campaigns" },
          { ar: "أعضاء فريق",         en: "Team members" },
          { ar: "جماهير مخصصة",       en: "Custom audiences" },
          { ar: "تقارير متقدمة",      en: "Advanced reports" },
          { ar: "أتمتة الردود الذكية", en: "Smart auto-replies" },
        ],
      },
      {
        name:    { ar: "Starter",  en: "Starter" },
        tagline: { ar: "للمشاريع الناشئة والعمل الفردي", en: "For startups & solo work" },
        cta:     { ar: "ابدأ الآن", en: "Get Started" },
        features:[
          { ar: "٢٬٠٠٠ جهة اتصال",   en: "2,000 contacts" },
          { ar: "٢ مستخدمين",         en: "2 users" },
          { ar: "٥٠ حملة شهرياً",    en: "50 campaigns/month" },
          { ar: "نص + صور + ملفات",  en: "Text + images + files" },
          { ar: "حملات مجدولة",       en: "Scheduled campaigns" },
          { ar: "تقارير أساسية",      en: "Basic reports" },
          { ar: "أعضاء فريق إضافيين",en: "Extra team members" },
          { ar: "جماهير مخصصة",       en: "Custom audiences" },
          { ar: "تقارير متقدمة",      en: "Advanced reports" },
          { ar: "أتمتة الردود الذكية", en: "Smart auto-replies" },
        ],
      },
      {
        name:    { ar: "Professional", en: "Professional" },
        tagline: { ar: "للمتاجر والشركات الجادة", en: "For serious stores & businesses" },
        badge:   { ar: "الأكثر اختياراً", en: "Most Popular" },
        cta:     { ar: "ابدأ الآن", en: "Get Started" },
        features:[
          { ar: "١٥٬٠٠٠ جهة اتصال",     en: "15,000 contacts" },
          { ar: "حتى ٥ مستخدمين",        en: "Up to 5 users" },
          { ar: "حملات غير محدودة",      en: "Unlimited campaigns" },
          { ar: "كل أنواع الميديا",      en: "All media types" },
          { ar: "حملات مجدولة",          en: "Scheduled campaigns" },
          { ar: "جماهير مخصصة + VIP",    en: "Custom audiences + VIP" },
          { ar: "تقارير متقدمة + Export", en: "Advanced reports + Export" },
          { ar: "تقارير أداء الفريق",    en: "Team performance reports" },
          { ar: "صلاحيات متدرجة",        en: "Tiered permissions" },
          { ar: "أتمتة الردود الذكية",   en: "Smart auto-replies" },
        ],
      },
      {
        name:    { ar: "Enterprise", en: "Enterprise" },
        tagline: { ar: "للشركات الكبيرة والمؤسسات", en: "For large companies & enterprises" },
        cta:     { ar: "تواصل معنا", en: "Contact Us" },
        features:[
          { ar: "جهات اتصال غير محدودة",  en: "Unlimited contacts" },
          { ar: "مستخدمون غير محدودون",   en: "Unlimited users" },
          { ar: "حملات غير محدودة",       en: "Unlimited campaigns" },
          { ar: "API Access كامل",         en: "Full API access" },
          { ar: "قاعدة بيانات مخصصة",     en: "Dedicated database" },
          { ar: "Webhook مركزي",           en: "Centralized webhook" },
          { ar: "دعم VIP مباشر ٢٤/٧",     en: "24/7 VIP direct support" },
          { ar: "Onboarding مخصص",        en: "Custom onboarding" },
          { ar: "SLA ضمان ٩٩.٩%",         en: "99.9% SLA guarantee" },
          { ar: "أتمتة الردود الذكية",    en: "Smart auto-replies" },
        ],
      },
    ],
  },

  // ── Testimonials ────────────────────────────────────────────────────────────
  testimonials: {
    badge:      { ar: "العملاء يتكلموا",     en: "What clients say" },
    h2a:        { ar: "مش كلامنا،",          en: "Not our words," },
    h2b:        { ar: "كلامهم",              en: "theirs" },
    subtitle:   { ar: "تجارب حقيقية من أصحاب مشاريع بيستخدموا واتس برو يومياً", en: "Real experiences from business owners who use WhatsPro daily." },
    addBtn:     { ar: "أضف رأيك",            en: "Add Your Review" },
    empty:      { ar: "لا توجد آراء حتى الآن", en: "No reviews yet" },
    stats: [
      { value: "120+", label: { ar: "مستخدم نشط",        en: "Active Users" },        icon: "👥" },
      { value: "15K+", label: { ar: "رسالة مرسلة",       en: "Messages Sent" },       icon: "📨" },
      { value: "95%",  label: { ar: "نسبة نجاح الإرسال", en: "Delivery Success Rate"}, icon: "✅" },
      { value: "4.6",  label: { ar: "تقييم المستخدمين",  en: "User Rating" },         icon: "⭐" },
    ],
    form: {
      title:       { ar: "أضف رأيك",                  en: "Add Your Review" },
      name:        { ar: "اسمك",                       en: "Your name" },
      brand:       { ar: "اسم المشروع / البراند",      en: "Project / brand name" },
      phone:       { ar: "رقم الهاتف",                 en: "Phone number" },
      ratingLabel: { ar: "التقييم",                    en: "Rating" },
      content:     { ar: "شاركنا تجربتك (20 حرف على الأقل)...", en: "Share your experience (min 20 chars)..." },
      submit:      { ar: "إرسال للمراجعة",             en: "Submit for Review" },
      successMsg:  { ar: "شكراً! رأيك في انتظار المراجعة", en: "Thanks! Your review is pending approval." },
      error:       { ar: "حدث خطأ",                   en: "An error occurred" },
    },
  },

  // ── FAQ ──────────────────────────────────────────────────────────────────────
  faq: {
    badge:    { ar: "الأسئلة الشائعة",   en: "FAQ" },
    h2a:      { ar: "كل سؤال في دماغك", en: "Every question in your head" },
    h2b:      { ar: "إجابته هنا",        en: "answered here" },
    subtitle: { ar: "مش أسئلة شكلية — أسئلة حقيقية بتجيها قبل ما تقرر. إجابات صريحة بدون مبالغة.", en: "Not formal questions — real ones you have before deciding. Honest answers, no hype." },
    ctaBadge: { ar: "لسه مش متأكد؟",    en: "Still not sure?" },
    ctaTitle: { ar: "جرب مجاناً — وخلي النتائج تقنعك", en: "Try for free — let the results convince you" },
    ctaSub:   { ar: "100 رسالة مجانية بدون بطاقة ائتمان. لو مش عجبك بعد التجربة، مش هتخسر حاجة.", en: "100 free messages, no credit card. If you're not impressed after trying, you've lost nothing." },
    ctaBtn:   { ar: "ابدأ مجاناً الآن",  en: "Start Free Now" },
    ctaLink:  { ar: "أو تواصل مع الدعم", en: "Or contact support" },
    items: [
      {
        category: { ar: "النظام والإمكانيات", en: "System & Capabilities" },
        q: { ar: "واتس برو مجرد أداة إرسال ولا في أكثر من كده؟", en: "Is WhatsPro just a messaging tool or more?" },
        a: { ar: `واتس برو CRM متكامل يدير دورة حياة العميل بالكامل — من أول رسالة لحد ما يصبح عميل دائم.\n\nبتبدأ بـ إدارة جهات الاتصال المتقدمة: استيراد وتصنيف وتقسيم الجمهور بدقة.\n\nثم الحملات التسويقية بالجملة: بترسل لآلاف العملاء في دقائق بقوالب معتمدة من واتساب.\n\nوكمان صندوق الوارد الذكي: ترد على كل عميل بشكل شخصي مع تاريخ المحادثة الكامل.\n\nالفرق بيننا وبين أدوات الإرسال العادية؟ إنت شايف العميل مش بس رقم.`,
            en: `WhatsPro is a full CRM that manages the entire customer lifecycle — from the first message to becoming a loyal client.\n\nIt starts with advanced contact management: import, tag, and segment your audience precisely.\n\nThen bulk marketing campaigns: send to thousands of customers in minutes using Meta-approved templates.\n\nPlus a smart inbox: reply personally to each client with full conversation history.\n\nThe difference from regular tools? You see the customer, not just a number.` },
      },
      {
        category: { ar: "النظام والإمكانيات", en: "System & Capabilities" },
        q: { ar: "أنا شغال بمفردي — هل النظام ده مناسب لي؟", en: "I work solo — is this system right for me?" },
        a: { ar: `ده بالظبط الكلام اللي بيقوله كل عميل فردي قبل ما يشترك.\n\nالنظام اتصمم عشان يجعلك تشتغل بكفاءة فريق كامل وإنت لوحدك.\n\nقوالب جاهزة للرد على الأسئلة المتكررة ← بتوفر ساعات.\nحملة واحدة بتوصل لـ 5,000 عميل ← مش ممكن تعملها يدوي.\nتذكيرات تلقائية للمتابعة ← مش هتنسى عميل تاني.\n\nالشركات الكبيرة بتشتري لأنها عندها فريق — إنت بتشتري عشان مش عندك فريق.`,
            en: `That's exactly what every solo user says before signing up.\n\nThe system is designed to make you work with the efficiency of a full team — alone.\n\nReady templates for FAQs ← saves hours.\nOne campaign reaches 5,000 clients ← can't do that manually.\nAuto follow-up reminders ← never forget a client again.\n\nBig companies buy it because they have a team — you buy it because you don't.` },
      },
      {
        category: { ar: "الأمان والموثوقية", en: "Safety & Reliability" },
        q: { ar: "هل الإرسال ده هيضر حساب واتساب بتاعي؟", en: "Will sending through WhatsPro harm my WhatsApp account?" },
        a: { ar: `السؤال ده مهم جداً — والإجابة الصريحة: بيعتمد على الطريقة.\n\nإزاي واتس برو بيحميك:\n✓ بنشتغل من خلال واتساب بيزنس API الرسمي.\n✓ كل رسالة بتتبع قواعد Meta.\n✓ القوالب بتتراجعها Meta قبل الإرسال.\n✓ نسبة التسليم عندنا 98.5% بدون إيقاف حسابات.`,
            en: `Great question — the honest answer: it depends on the method.\n\nHow WhatsPro protects you:\n✓ We use the official WhatsApp Business API.\n✓ Every message follows Meta's guidelines.\n✓ Templates are reviewed by Meta before sending.\n✓ 98.5% delivery rate with zero account bans.` },
      },
      {
        category: { ar: "الأمان والموثوقية", en: "Safety & Reliability" },
        q: { ar: "بيانات عملائي هتكون آمنة؟", en: "Will my customer data be safe?" },
        a: { ar: `بنتعامل مع بيانات عملائك زي أسرارك التجارية — بحماية كاملة.\n\nAES-256 في التخزين وTLS 1.3 في النقل.\nمفيش تقاطع بين الحسابات أبداً.\nBackups تلقائية يومية.\nمفيش بيع لأي بيانات لأي طرف ثالث.`,
            en: `We treat your customer data like trade secrets — fully protected.\n\nAES-256 at rest, TLS 1.3 in transit.\nZero cross-account data mixing.\nAutomatic daily backups.\nWe never sell data to third parties.` },
      },
      {
        category: { ar: "التجربة والاشتراك", en: "Trial & Subscription" },
        q: { ar: "هل أقدر أجرب قبل ما أدفع؟", en: "Can I try before paying?" },
        a: { ar: `نعم — وبدون بطاقة ائتمان.\n\nالباقة المجانية بتديك:\n→ 100 رسالة فعلية\n→ الوصول لكل مميزات الداشبورد\n→ صندوق الوارد والتقارير من اليوم الأول\n→ دعم فني حقيقي مش روبوت`,
            en: `Yes — no credit card required.\n\nThe free plan gives you:\n→ 100 real messages\n→ Full dashboard access\n→ Inbox & reports from day one\n→ Real human support, not a bot` },
      },
      {
        category: { ar: "التجربة والاشتراك", en: "Trial & Subscription" },
        q: { ar: "كام وقت هيأخذ مني إني أبدأ فعلاً؟", en: "How long does it take to actually start?" },
        a: { ar: `العميل الأسرع عندنا بدأ حملته الأولى في 8 دقائق.\n\n1. إنشاء حساب ← 2 دقيقة\n2. ربط واتساب بيزنس API ← 5 دقائق\n3. رفع جهات اتصالك ← 1 دقيقة\n4. إرسال أول حملة ← 2 دقيقة`,
            en: `Our fastest user launched their first campaign in 8 minutes.\n\n1. Create account ← 2 minutes\n2. Connect WhatsApp Business API ← 5 minutes\n3. Upload contacts ← 1 minute\n4. Send first campaign ← 2 minutes` },
      },
      {
        category: { ar: "الفريق والإدارة", en: "Team & Management" },
        q: { ar: "عندي موظفين — ازاي يشتغلوا بدون ما يشوفوا الإعدادات الحساسة؟", en: "I have staff — how can they work without seeing sensitive settings?" },
        a: { ar: `نظام الصلاحيات عندك 3 مستويات:\n\nالمالك ← يشوف ويعدل كل حاجة.\nموظف وصول كامل ← حملات ومحادثات وتقارير.\nموظف دردشة فقط ← بيرد على العملاء بس.`,
            en: `The permissions system has 3 levels:\n\nOwner ← sees and edits everything.\nFull access staff ← campaigns, chats & reports.\nChat-only staff ← replies to customers only.` },
      },
      {
        category: { ar: "الفريق والإدارة", en: "Team & Management" },
        q: { ar: "ممكن أتابع أداء موظفيني؟", en: "Can I track my staff's performance?" },
        a: { ar: `مش بس ممكن — ده من أقوى مزايا النظام.\n\n📊 كام رسالة بعتها كل موظف\n💬 كام عميل رد عليه\n📈 معدل إغلاق المحادثات\n⏰ متوسط وقت الرد`,
            en: `Not only possible — it's one of the system's strongest features.\n\n📊 Messages sent per staff member\n💬 Clients replied to\n📈 Conversation close rate\n⏰ Average response time` },
      },
      {
        category: { ar: "التقارير والنتائج", en: "Reports & Results" },
        q: { ar: "هعرف أقيّم نتائج حملاتي بدقة؟", en: "Can I accurately evaluate my campaign results?" },
        a: { ar: `لكل حملة:\n✓ نسبة التسليم\n✓ نسبة الفتح\n✓ نسبة الرد\n✓ مقارنة بين الحملات\n✓ أفضل وقت للإرسال\n✓ تصدير Excel بضغطة زرار`,
            en: `Per campaign:\n✓ Delivery rate\n✓ Open rate\n✓ Reply rate\n✓ Campaign comparison\n✓ Best sending time\n✓ Excel export with one click` },
      },
      {
        category: { ar: "التقارير والنتائج", en: "Reports & Results" },
        q: { ar: "هل أقدر أوقف الاشتراك وأرجع وقتما أشاء؟", en: "Can I cancel and return whenever I want?" },
        a: { ar: `نعم — بدون أي عقوبة.\n\nإلغاء بضغطة زرار من الإعدادات.\nبياناتك موجودة 30 يوم بعد الإلغاء.\nمفيش رسوم إلغاء مسبق.\nلو رجعت — كل حاجاتك في مكانها.`,
            en: `Yes — no penalty whatsoever.\n\nCancel with one click from settings.\nYour data stays for 30 days after cancellation.\nNo early cancellation fees.\nIf you return — everything is right where you left it.` },
      },
    ],
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    desc:       { ar: "منصتك المتكاملة لإدارة وإرسال رسائل الواتساب. نساعدك على التواصل مع عملائك بكفاءة واحترافية.", en: "Your all-in-one platform to manage and send WhatsApp messages. We help you reach customers efficiently and professionally." },
    copyright:  { ar: "© 2025 واتس برو. جميع الحقوق محفوظة.", en: "© 2025 WhatsPro. All rights reserved." },
    col1:       { ar: "المنتج",   en: "Product" },
    col2:       { ar: "الشركة",  en: "Company" },
    col3:       { ar: "الموارد", en: "Resources" },
    col4:       { ar: "قانوني",  en: "Legal" },
    product: [
      { ar: "المميزات",   en: "Features",    href: "#features" },
      { ar: "كيف يعمل",  en: "How It Works", href: "#how-it-works" },
      { ar: "الأسعار",   en: "Pricing",      href: "#pricing" },
      { ar: "API",        en: "API",          href: "#" },
    ],
    company: [
      { ar: "من نحن",     en: "About Us",   href: "#" },
      { ar: "فريق العمل", en: "Team",       href: "#" },
      { ar: "الوظائف",    en: "Careers",    href: "#" },
      { ar: "اتصل بنا",   en: "Contact",    href: "#" },
    ],
    resources: [
      { ar: "مركز المساعدة",   en: "Help Center", href: "#" },
      { ar: "المدونة",          en: "Blog",        href: "#" },
      { ar: "الشروحات",         en: "Tutorials",   href: "#" },
      { ar: "الأسئلة الشائعة",  en: "FAQ",         href: "#faq" },
    ],
    legal: [
      { ar: "شروط الاستخدام", en: "Terms of Service", href: "/terms" },
      { ar: "سياسة الخصوصية", en: "Privacy Policy",   href: "/privacy" },
    ],
    location: { ar: "الإسكندرية، مصر", en: "Alexandria, Egypt" },
  },
} as const;

/** Helper — اجيب قيمة النص حسب اللغة */
export function tr<T extends { ar: string; en: string }>(obj: T, lang: Lang): string {
  return obj[lang];
}
