// src/lib/translations.ts
// ─── Landing Page Translations (AR / EN) ─────────────────────────────────────

export type Lang = "ar" | "en";

export const t = {
  // ── Navbar ──────────────────────────────────────────────────────────────────
  nav: {
    logo: { ar: "واتس برو", en: "WhatsPro" },
    logoHighlight: { ar: "برو", en: "Pro" },
    features: { ar: "المميزات", en: "Features" },
    partners: { ar: "شركاؤنا", en: "Partners" },
    howItWorks: { ar: "كيف يعمل", en: "How It Works" },
    pricing: { ar: "الأسعار", en: "Pricing" },
    testimonials: { ar: "آراء العملاء", en: "Testimonials" },
    faq: { ar: "الأسئلة الشائعة", en: "FAQ" },
    login: { ar: "تسجيل الدخول", en: "Login" },
    langSwitch: { ar: "EN", en: "AR" },
  },

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: {
    badge: { ar: "🤖 مدعوم بالذكاء الاصطناعي", en: "🤖 Powered by AI" },
    h1a: { ar: "بيع أكثر بـ", en: "Sell More with" },
    h1highlight: { ar: "AI يبيع عنك", en: "AI That Sells For You" },
    h1b: { ar: "على الواتساب — ٢٤/٧", en: "on WhatsApp — 24/7" },
    subtitle: {
      ar: "مساعد ذكاء اصطناعي يرد على عملاءك، يتابع الطلبات، ويقفل الصفقات — كل ده على الواتساب وأنت نايم.",
      en: "An AI assistant that replies to customers, follows up on orders, and closes deals — all on WhatsApp while you sleep.",
    },
    stat1: { ar: "أتمتة كاملة", en: "Full Automation" },
    stat2: { ar: "AI يبيع ٢٤/٧", en: "AI Sells 24/7" },
    stat3: { ar: "ربط متجرك فوراً", en: "Connect Your Store" },
    cta: { ar: "جرّب مجاناً — بدون بطاقة", en: "Try Free — No Card Needed" },
    ctaWatch: { ar: "شاهد كيف يعمل", en: "See How It Works" },
    // chat mockup
    chatHeader: { ar: "واتس برو AI", en: "WhatsPro AI" },
    chatOnline: { ar: "يعمل الآن", en: "Active now" },
    msg1: { ar: "عاوز اعرف سعر المنتج ده؟", en: "What's the price of this product?" },
    msg2: { ar: "⚡ أهلاً! سعره ٢٩٩ج — ومتاح للشحن فوراً. هبعتلك رابط الطلب؟", en: "⚡ Hi! It's 299 EGP — available for immediate shipping. Want me to send the order link?" },
    msg3: { ar: "تم تأكيد طلبك تلقائياً ✅ — رقم التتبع: #4821", en: "Your order was auto-confirmed ✅ — Tracking: #4821" },
    typing: { ar: "AI يكتب...", en: "AI typing..." },
    statMsg: { ar: "رد تلقائي", en: "Auto Reply" },
    statCont: { ar: "صفقة أُغلقت", en: "Deal Closed" },
    chatInput: { ar: "اكتب رسالة...", en: "Type a message..." },
    floatSent: { ar: "صفقة أُغلقت! 🎉", en: "Deal Closed! 🎉" },
    floatSentSub: { ar: "بدون تدخل بشري", en: "Zero human effort" },
    floatConts: { ar: "أتمتة نشطة", en: "Automation Active" },
    floatContsSub: { ar: "٥٬٦٧٨ رسالة تلقائية", en: "5,678 auto messages" },
    floatRate: { ar: "معدل الإغلاق", en: "Close Rate" },
    // trust strip
    trust1: { ar: "إعداد في ١٥ دقيقة", en: "Setup in 15 minutes" },
    trust2: { ar: "تحديثات مستمرة", en: "Continuous updates" },
    trust3: { ar: "تحكم سلس", en: "Seamless control" },
  },

  // ── Features ────────────────────────────────────────────────────────────────
  features: {
    badge: { ar: "كل ما تحتاجه في مكان واحد", en: "Everything You Need" },
    h2a: { ar: "مش بس أداة إرسال —", en: "Not just a messaging tool —" },
    h2b: { ar: "منصة مبيعات ذكية كاملة", en: "A Complete AI Sales Platform" },
    subtitle: {
      ar: "من الرسائل الجماعية للـ AI اللي بيبيع — كل ميزة اتبنت عشان تزود مبيعاتك على الواتساب",
      en: "From bulk messaging to AI that sells — every feature built to grow your WhatsApp sales.",
    },
    stat1: { ar: "نسبة التسليم", en: "Delivery Rate" },
    stat2: { ar: "وقت الإعداد", en: "Setup Time" },
    stat2v: { ar: "١٥ دقيقة", en: "15 minutes" },
    stat3: { ar: "دعم فني", en: "Support" },
    stat4: { ar: "واتساب API رسمي", en: "Official WhatsApp API" },
    items: [
      {
        tag: { ar: "الأساس", en: "Core" },
        hook: { ar: "مش رسالة رسالة", en: "Not one by one" },
        title: { ar: "آلاف الرسائل — بضغطة واحدة", en: "Thousands of messages — one click" },
        desc: { ar: "أنشئ حملة، ارفع جهات الاتصال، واضغط إرسال. واتس برو بيبعت لكل عميل بشكل فردي — مش كإعلان جماعي.", en: "Create a campaign, upload contacts, hit send. WhatsPro sends to each client individually — not as a group broadcast." },
      },
      {
        tag: { ar: "AI ذكاء اصطناعي", en: "AI" },
        hook: { ar: "بيبيع وأنت نايم", en: "Sells while you sleep" },
        title: { ar: "AI Sales Assistant يرد ويقفل", en: "AI Sales Assistant that closes deals" },
        desc: { ar: "مساعد ذكي بيرد على العملاء، بيقترح منتجات بناءً على تاريخ الشراء، وبيتابع السلة المتروكة — كل ده تلقائياً.", en: "Smart assistant that replies to customers, suggests products based on purchase history, and follows up abandoned carts — all automatically." },
      },
      {
        tag: { ar: "المتجر", en: "Store" },
        hook: { ar: "ربط مباشر مع متجرك", en: "Direct store connection" },
        title: { ar: "Shopify و Woo Commerce و EasyOrders — متصلين", en: "Shopify & WooCommerce & EasyOrders — connected" },
        desc: { ar: "كل أوردر جديد بيوصل رسالة تأكيد تلقائي. وكل شحنة بتبعت تتبع فوري. ربط في دقائق بدون كودينج.", en: "Every new order triggers an auto-confirmation. Every shipment sends instant tracking. Connect in minutes with zero coding." },
      },
      {
        tag: { ar: "الأتمتة", en: "Automation" },
        hook: { ar: "مش لازم تتذكر", en: "No need to remember" },
        title: { ar: "أتمتة كاملة — تأكيد، شحن، متابعة", en: "Full automation — confirm, ship, follow up" },
        desc: { ar: "الأتمتة بتشتغل ٢٤/٧: تأكيد الطلب، إشعار الشحن، متابعة العميل بعد الاستلام. كل ده بدون ما تتدخل.", en: "Automation runs 24/7: order confirmation, shipping notification, post-delivery follow-up — all without you lifting a finger." },
      },
      {
        tag: { ar: "التقارير", en: "Analytics" },
        hook: { ar: "مش أرقام ديكور", en: "Not vanity metrics" },
        title: { ar: "Revenue Attribution — كم كسبت؟", en: "Revenue Attribution — what did you earn?" },
        desc: { ar: "شوف كل حملة كم أوردر أنتجت وكم إيراد جابت. تقارير مفصلة للمتجر، الحملات، والفريق — وExport بـ Excel.", en: "See exactly how many orders each campaign generated and how much revenue it brought. Detailed reports for store, campaigns, and team — export to Excel." },
      },
      {
        tag: { ar: "المحادثات", en: "Inbox" },
        hook: { ar: "ردود سريعة بدون فوضى", en: "Fast replies, zero chaos" },
        title: { ar: "صندوق وارد موحد للفريق كله", en: "Unified inbox for the whole team" },
        desc: { ar: "كل محادثات واتساب في مكان واحد. قسّم الردود على الفريق، تابع مين بيرد على مين، وما تفوتكش رسالة.", en: "All WhatsApp conversations in one place. Assign replies to team members, track who's handling who, and never miss a message." },
      },
      {
        tag: { ar: "الجمهور", en: "Audience" },
        hook: { ar: "مش كل العملاء زي بعض", en: "Not all customers are equal" },
        title: { ar: "قوائم ذكية — VIP، مهتمين، غير مستجيبين", en: "Smart lists — VIP, interested, non-responsive" },
        desc: { ar: "قسّم عملاءك تلقائياً أو يدوياً. كل شريحة تاخد الرسالة المناسبة في الوقت المناسب — وتشوف الفرق في التفاعل.", en: "Segment customers automatically or manually. Each segment gets the right message at the right time — and see the difference in engagement." },
      },
      {
        tag: { ar: "الفريق", en: "Team" },
        hook: { ar: "كل واحد يعمل دوره بالظبط", en: "Everyone does exactly their role" },
        title: { ar: "صلاحيات متدرجة — Owner، Admin، Agent", en: "Tiered permissions — Owner, Admin, Agent" },
        desc: { ar: "صاحب الحساب يتحكم في كل حاجة. الـ Admin يدير الحملات. الـ Agent يرد بس. وكلهم يشوفوا متجرك بدون إعداد تاني.", en: "Account owner controls everything. Admin manages campaigns. Agent replies only. And all of them share your store data without extra setup." },
      },
      {
        tag: { ar: "الأمان", en: "Security" },
        hook: { ar: "حسابك في أمان تام", en: "Your account is fully safe" },
        title: { ar: "واتساب API رسمي — مش أدوات هاك", en: "Official WhatsApp API — not hack tools" },
        desc: { ar: "بنشتغل على واتساب بيزنس API الرسمي فقط. ٩٨.٥٪ نسبة تسليم، صفر إيقاف للحسابات، وامتثال كامل لسياسة Meta.", en: "We operate exclusively on the official WhatsApp Business API. 98.5% delivery rate, zero account bans, full Meta policy compliance." },
      },
    ],
  },

  // ── Partners ────────────────────────────────────────────────────────────────
  partners: {
    badge: { ar: "شركاؤنا", en: "Our Partners" },
    h2a: { ar: "نعمل مع", en: "We work with" },
    h2b: { ar: "أفضل الأسماء", en: "the best names" },
    subtitle: { ar: "تكاملات قوية مع المنصات والخدمات الموثوقة التي تعتمد عليها الشركات", en: "Strong integrations with trusted platforms and services that companies rely on." },
  },

  // ── HowItWorks ───────────────────────────────────────────────────────────────
  how: {
    badge: { ar: "خطوات العمل", en: "How It Works" },
    h2a: { ar: "من التسجيل لأول رسالة —", en: "From signup to first message —" },
    h2b: { ar: "في أقل من 15 دقيقة", en: "in less than 15 minutes" },
    subtitle: { ar: "4 خطوات واضحة. مفيش setup معقد. مفيش كورس تتعلمه.", en: "4 clear steps. No complex setup. No course needed." },
    ctaTitle: { ar: "جاهز تبدأ؟ الخطوة الأولى مجانية", en: "Ready to start? The first step is free." },
    ctaSub: { ar: "100 رسالة مجانية — بدون بطاقة ائتمان — بدون التزام", en: "100 free messages — no credit card — no commitment." },
    ctaBtn: { ar: "ابدأ مجاناً الآن", en: "Start Free Now" },
    steps: [
      {
        title: { ar: "ارفع جهات اتصالك", en: "Upload your contacts" },
        what: { ar: "Excel أو CSV أو إدخال يدوي", en: "Excel, CSV, or manual entry" },
        desc: { ar: "النظام بيحلل الملف تلقائياً، بيميّز الأرقام الصحيحة من الغلط، وبيقسمهم لقوائم جاهزة للاستخدام.", en: "The system auto-analyses the file, filters valid numbers, and organises them into ready-to-use lists." },
        time: { ar: "دقيقة واحدة", en: "1 minute" },
      },
      {
        title: { ar: "اختار قالبك", en: "Choose your template" },
        what: { ar: "قوالب جاهزة ومعتمدة", en: "Ready & approved templates" },
        desc: { ar: "اختار من مكتبة قوالبك المعتمدة من Meta. كل قالب جاهز للإرسال فوراً — مش محتاج تعيد الاعتماد مرة تانية.", en: "Pick from your Meta-approved template library. Every template is ready to send immediately — no re-approval needed." },
        time: { ar: "دقيقتين", en: "2 minutes" },
      },
      {
        title: { ar: "أرسل أو جدوّل الحملة", en: "Send or schedule the campaign" },
        what: { ar: "فوري أو في الوقت اللي تختاره", en: "Instantly or at your chosen time" },
        desc: { ar: "اختار الجمهور المستهدف، راجع الملخص، واضغط إرسال. واتس برو بيكمل الشغل حتى لو قفلت الجهاز.", en: "Choose your target audience, review the summary, and hit send. WhatsPro keeps going even if you close your device." },
        time: { ar: "دقيقتين", en: "2 minutes" },
      },
      {
        title: { ar: "تابع وحسّن", en: "Track & improve" },
        what: { ar: "تقارير لحظية كاملة", en: "Full real-time reports" },
        desc: { ar: "شوف مين وصل ومين قرأ ومين رد — وعلى أساس كده خطط حملتك الجاية أذكى.", en: "See who received, who read, who replied — and plan your next campaign smarter." },
        time: { ar: "مستمر", en: "Ongoing" },
      },
    ],
  },

  // ── Pricing ──────────────────────────────────────────────────────────────────
  pricing: {
    badge: { ar: "خطط الأسعار", en: "Pricing Plans" },
    h2a: { ar: "ادفع على قد ما تحتاج —", en: "Pay for what you need —" },
    h2b: { ar: "وكبّر وقت ما تكبر", en: "and scale as you grow" },
    subtitle: { ar: "ابدأ مجاناً بدون بطاقة ائتمان. الترقية سهلة في أي وقت.", en: "Start free with no credit card. Upgrade anytime with ease." },
    saveBadge: { ar: "وفّر حتى ٢٥٪ مع الاشتراك السنوي", en: "Save up to 25% with annual billing" },
    currency: { ar: "ج / شهر", en: "EGP / mo" },
    free: { ar: "مجاني", en: "Free" },
    annualSave: { ar: "وفّر", en: "Save" },
    annualSaveSuffix: { ar: "ج سنوياً", en: "EGP/yr" },
    guar1: { ar: "بدون بطاقة ائتمان للباقة المجانية", en: "No credit card for free plan" },
    guar2: { ar: "إلغاء في أي وقت بدون رسوم", en: "Cancel anytime, no fees" },
    guar3: { ar: "ترقية فورية وبدون انقطاع", en: "Instant upgrade, zero downtime" },
    enterprise: { ar: "عندك متطلبات خاصة؟", en: "Have special requirements?" },
    enterpriseLink: { ar: "تواصل معنا للحصول على عرض مخصص", en: "Contact us for a custom quote" },
    plans: [
      {
        name: { ar: "مجاني", en: "Free" },
        tagline: { ar: "جرّب بدون أي التزام", en: "Try with zero commitment" },
        cta: { ar: "ابدأ مجاناً", en: "Start Free" },
        slug: "free",
        features: [
          { ar: "محادثات غير محدودة", en: "Unlimited conversations", ok: true },
          { ar: "١٠٠ جهة اتصال", en: "100 contacts", ok: true },
          { ar: "١ مستخدم", en: "1 user", ok: true },
          { ar: "٣ حملات فقط", en: "3 campaigns only", ok: true },
          { ar: "نص فقط", en: "Text only", ok: true },
          { ar: "تقارير عامة", en: "Basic reports", ok: true },
        ],
      },
      {
        name: { ar: "Starter", en: "Starter" },
        tagline: { ar: "للمشاريع الناشئة والعمل الفردي", en: "For startups & solo work" },
        cta: { ar: "ابدأ الآن", en: "Get Started" },
        slug: "starter",
        features: [

          { ar: "٢٬٠٠٠ جهة اتصال", en: "2,000 contacts", ok: true },
          { ar: "٢ مستخدمين", en: "2 users", ok: true },
          { ar: "٥٠ حملة شهرياً", en: "50 campaigns/month", ok: true },
          { ar: "نص + صور + ملفات", en: "Text + images + files", ok: true },
          { ar: "تقارير أساسية", en: "Basic reports", ok: true },
          { ar: "Chatbot بردود ثابتة", en: "Chatbot (fixed replies)", ok: true },
          { ar: "جماهير مخصصة", en: "Custom audiences", ok: true },
        ],
      },
      {
        name: { ar: "Professional", en: "Professional" },
        tagline: { ar: "للمتاجر والشركات الجادة", en: "For serious stores & businesses" },
        badge: { ar: "الأكثر اختياراً", en: "Most Popular" },
        cta: { ar: "ابدأ الآن", en: "Get Started" },
        slug: "pro",
        features: [

          { ar: "٢٠٬٠٠٠ جهة اتصال", en: "20,000 contacts", ok: true },
          { ar: "حتى ٥ مستخدمين", en: "Up to 5 users", ok: true },
          { ar: "حملات غير محدودة", en: "Unlimited campaigns", ok: true },
          { ar: "كل أنواع الميديا", en: "All media types", ok: true },
          { ar: "تقارير متقدمة + Export", en: "Advanced reports + Export", ok: true },
          { ar: "أتمة ذكية", en: "Smart automation", ok: true },
          { ar: "ربط متجر + أتمتة كاملة", en: "Store + full automation", ok: true },
          { ar: "كلود AI المساعد", en: "Claude AI Assistant", ok: true },
        ],
      },
      {
        name: { ar: "Enterprise", en: "Enterprise" },
        tagline: { ar: "للشركات الكبيرة والمؤسسات", en: "For large companies & enterprises" },
        badge: { ar: "ننصح بها", en: "Recommended" },
        cta: { ar: "تواصل معنا", en: "Contact Us" },
        slug: "enterprise",
        features: [

          { ar: "جهات اتصال غير محدودة", en: "Unlimited contacts", ok: true },
          { ar: "مستخدمون غير محدودون", en: "Unlimited users", ok: true },
          { ar: "حملات غير محدودة", en: "Unlimited campaigns", ok: true },
          { ar: "AI Sales Assistant ذكي", en: "Smart AI Sales Assistant", ok: true },
          { ar: "ربط متجر + أتمتة كاملة", en: "Store + full automation", ok: true },
          { ar: "كلود AI المساعد ", en: "Claude AI Assistant", ok: true },
          { ar: "API كامل", en: "Full API access", ok: true },
          { ar: "دعم VIP ٢٤/٧", en: "24/7 VIP support", ok: true },
        ],
      },
    ],
  },

  // ── Testimonials ────────────────────────────────────────────────────────────
  testimonials: {
    badge: { ar: "العملاء يتكلموا", en: "What clients say" },
    h2a: { ar: "مش كلامنا،", en: "Not our words," },
    h2b: { ar: "كلامهم", en: "theirs" },
    subtitle: { ar: "تجارب حقيقية من أصحاب مشاريع بيستخدموا واتس برو يومياً", en: "Real experiences from business owners who use WhatsPro daily." },
    addBtn: { ar: "أضف رأيك", en: "Add Your Review" },
    empty: { ar: "لا توجد آراء حتى الآن", en: "No reviews yet" },
    stats: [
      { value: "120+", label: { ar: "مستخدم نشط", en: "Active Users" }, icon: "👥" },
      { value: "15K+", label: { ar: "رسالة مرسلة", en: "Messages Sent" }, icon: "📨" },
      { value: "95%", label: { ar: "نسبة نجاح الإرسال", en: "Delivery Success Rate" }, icon: "✅" },
      { value: "4.6", label: { ar: "تقييم المستخدمين", en: "User Rating" }, icon: "⭐" },
    ],
    form: {
      title: { ar: "أضف رأيك", en: "Add Your Review" },
      name: { ar: "اسمك", en: "Your name" },
      brand: { ar: "اسم المشروع / البراند", en: "Project / brand name" },
      phone: { ar: "رقم الهاتف", en: "Phone number" },
      ratingLabel: { ar: "التقييم", en: "Rating" },
      content: { ar: "شاركنا تجربتك (20 حرف على الأقل)...", en: "Share your experience (min 20 chars)..." },
      submit: { ar: "إرسال للمراجعة", en: "Submit for Review" },
      successMsg: { ar: "شكراً! رأيك في انتظار المراجعة", en: "Thanks! Your review is pending approval." },
      error: { ar: "حدث خطأ", en: "An error occurred" },
    },
  },

  // ── FAQ ──────────────────────────────────────────────────────────────────────
  faq: {
    badge: { ar: "الأسئلة الشائعة", en: "FAQ" },
    h2a: { ar: "كل سؤال في دماغك", en: "Every question in your head" },
    h2b: { ar: "إجابته هنا", en: "answered here" },
    subtitle: { ar: "مش أسئلة شكلية — أسئلة حقيقية بتجيها قبل ما تقرر. إجابات صريحة بدون مبالغة.", en: "Not formal questions — real ones you have before deciding. Honest answers, no hype." },
    ctaBadge: { ar: "لسه مش متأكد؟", en: "Still not sure?" },
    ctaTitle: { ar: "جرب مجاناً — وخلي النتائج تقنعك", en: "Try for free — let the results convince you" },
    ctaSub: { ar: "100 رسالة مجانية بدون بطاقة ائتمان. لو مش عجبك بعد التجربة، مش هتخسر حاجة.", en: "100 free messages, no credit card. If you're not impressed after trying, you've lost nothing." },
    ctaBtn: { ar: "ابدأ مجاناً الآن", en: "Start Free Now" },
    ctaLink: { ar: "أو تواصل مع الدعم", en: "Or contact support" },
    items: [
      {
        category: { ar: "النظام والإمكانيات", en: "System & Capabilities" },
        q: { ar: "واتس برو مجرد أداة إرسال ولا في أكثر من كده؟", en: "Is WhatsPro just a messaging tool or more?" },
        a: {
          ar: `واتس برو CRM متكامل يدير دورة حياة العميل بالكامل — من أول رسالة لحد ما يصبح عميل دائم.\n\nبتبدأ بـ إدارة جهات الاتصال المتقدمة: استيراد وتصنيف وتقسيم الجمهور بدقة.\n\nثم الحملات التسويقية بالجملة: بترسل لآلاف العملاء في دقائق بقوالب معتمدة من واتساب.\n\nوكمان صندوق الوارد الذكي: ترد على كل عميل بشكل شخصي مع تاريخ المحادثة الكامل.\n\nالفرق بيننا وبين أدوات الإرسال العادية؟ إنت شايف العميل مش بس رقم.`,
          en: `WhatsPro is a full CRM that manages the entire customer lifecycle — from the first message to becoming a loyal client.\n\nIt starts with advanced contact management: import, tag, and segment your audience precisely.\n\nThen bulk marketing campaigns: send to thousands of customers in minutes using Meta-approved templates.\n\nPlus a smart inbox: reply personally to each client with full conversation history.\n\nThe difference from regular tools? You see the customer, not just a number.`
        },
      },
      {
        category: { ar: "النظام والإمكانيات", en: "System & Capabilities" },
        q: { ar: "أنا شغال بمفردي — هل النظام ده مناسب لي؟", en: "I work solo — is this system right for me?" },
        a: {
          ar: `ده بالظبط الكلام اللي بيقوله كل عميل فردي قبل ما يشترك.\n\nالنظام اتصمم عشان يجعلك تشتغل بكفاءة فريق كامل وإنت لوحدك.\n\nقوالب جاهزة للرد على الأسئلة المتكررة ← بتوفر ساعات.\nحملة واحدة بتوصل لـ 5,000 عميل ← مش ممكن تعملها يدوي.\nتذكيرات تلقائية للمتابعة ← مش هتنسى عميل تاني.\n\nالشركات الكبيرة بتشتري لأنها عندها فريق — إنت بتشتري عشان مش عندك فريق.`,
          en: `That's exactly what every solo user says before signing up.\n\nThe system is designed to make you work with the efficiency of a full team — alone.\n\nReady templates for FAQs ← saves hours.\nOne campaign reaches 5,000 clients ← can't do that manually.\nAuto follow-up reminders ← never forget a client again.\n\nBig companies buy it because they have a team — you buy it because you don't.`
        },
      },
      {
        category: { ar: "الأمان والموثوقية", en: "Safety & Reliability" },
        q: { ar: "هل الإرسال ده هيضر حساب واتساب بتاعي؟", en: "Will sending through WhatsPro harm my WhatsApp account?" },
        a: {
          ar: `السؤال ده مهم جداً — والإجابة الصريحة: بيعتمد على الطريقة.\n\nإزاي واتس برو بيحميك:\n✓ بنشتغل من خلال واتساب بيزنس API الرسمي.\n✓ كل رسالة بتتبع قواعد Meta.\n✓ القوالب بتتراجعها Meta قبل الإرسال.\n✓ نسبة التسليم عندنا 98.5% بدون إيقاف حسابات.`,
          en: `Great question — the honest answer: it depends on the method.\n\nHow WhatsPro protects you:\n✓ We use the official WhatsApp Business API.\n✓ Every message follows Meta's guidelines.\n✓ Templates are reviewed by Meta before sending.\n✓ 98.5% delivery rate with zero account bans.`
        },
      },
      {
        category: { ar: "الأمان والموثوقية", en: "Safety & Reliability" },
        q: { ar: "بيانات عملائي هتكون آمنة؟", en: "Will my customer data be safe?" },
        a: {
          ar: `بنتعامل مع بيانات عملائك زي أسرارك التجارية — بحماية كاملة.\n\nAES-256 في التخزين وTLS 1.3 في النقل.\nمفيش تقاطع بين الحسابات أبداً.\nBackups تلقائية يومية.\nمفيش بيع لأي بيانات لأي طرف ثالث.`,
          en: `We treat your customer data like trade secrets — fully protected.\n\nAES-256 at rest, TLS 1.3 in transit.\nZero cross-account data mixing.\nAutomatic daily backups.\nWe never sell data to third parties.`
        },
      },
      {
        category: { ar: "التجربة والاشتراك", en: "Trial & Subscription" },
        q: { ar: "هل أقدر أجرب قبل ما أدفع؟", en: "Can I try before paying?" },
        a: {
          ar: `نعم — وبدون بطاقة ائتمان.\n\nالباقة المجانية بتديك:\n→ 100 رسالة فعلية\n→ الوصول لكل مميزات الداشبورد\n→ صندوق الوارد والتقارير من اليوم الأول\n→ دعم فني حقيقي مش روبوت`,
          en: `Yes — no credit card required.\n\nThe free plan gives you:\n→ 100 real messages\n→ Full dashboard access\n→ Inbox & reports from day one\n→ Real human support, not a bot`
        },
      },
      {
        category: { ar: "التجربة والاشتراك", en: "Trial & Subscription" },
        q: { ar: "كام وقت هيأخذ مني إني أبدأ فعلاً؟", en: "How long does it take to actually start?" },
        a: {
          ar: `العميل الأسرع عندنا بدأ حملته الأولى في 8 دقائق.\n\n1. إنشاء حساب ← 2 دقيقة\n2. ربط واتساب بيزنس API ← 5 دقائق\n3. رفع جهات اتصالك ← 1 دقيقة\n4. إرسال أول حملة ← 2 دقيقة`,
          en: `Our fastest user launched their first campaign in 8 minutes.\n\n1. Create account ← 2 minutes\n2. Connect WhatsApp Business API ← 5 minutes\n3. Upload contacts ← 1 minute\n4. Send first campaign ← 2 minutes`
        },
      },
      {
        category: { ar: "الفريق والإدارة", en: "Team & Management" },
        q: { ar: "عندي موظفين — ازاي يشتغلوا بدون ما يشوفوا الإعدادات الحساسة؟", en: "I have staff — how can they work without seeing sensitive settings?" },
        a: {
          ar: `نظام الصلاحيات عندك 3 مستويات:\n\nالمالك ← يشوف ويعدل كل حاجة.\nموظف وصول كامل ← حملات ومحادثات وتقارير.\nموظف دردشة فقط ← بيرد على العملاء بس.`,
          en: `The permissions system has 3 levels:\n\nOwner ← sees and edits everything.\nFull access staff ← campaigns, chats & reports.\nChat-only staff ← replies to customers only.`
        },
      },
      {
        category: { ar: "الفريق والإدارة", en: "Team & Management" },
        q: { ar: "ممكن أتابع أداء موظفيني؟", en: "Can I track my staff's performance?" },
        a: {
          ar: `مش بس ممكن — ده من أقوى مزايا النظام.\n\n📊 كام رسالة بعتها كل موظف\n💬 كام عميل رد عليه\n📈 معدل إغلاق المحادثات\n⏰ متوسط وقت الرد`,
          en: `Not only possible — it's one of the system's strongest features.\n\n📊 Messages sent per staff member\n💬 Clients replied to\n📈 Conversation close rate\n⏰ Average response time`
        },
      },
      {
        category: { ar: "التقارير والنتائج", en: "Reports & Results" },
        q: { ar: "هعرف أقيّم نتائج حملاتي بدقة؟", en: "Can I accurately evaluate my campaign results?" },
        a: {
          ar: `لكل حملة:\n✓ نسبة التسليم\n✓ نسبة الفتح\n✓ نسبة الرد\n✓ مقارنة بين الحملات\n✓ أفضل وقت للإرسال\n✓ تصدير Excel بضغطة زرار`,
          en: `Per campaign:\n✓ Delivery rate\n✓ Open rate\n✓ Reply rate\n✓ Campaign comparison\n✓ Best sending time\n✓ Excel export with one click`
        },
      },
      {
        category: { ar: "الأتمتة والذكاء الاصطناعي", en: "Automation & AI" },
        q: { ar: "الأتمتة دي بتعمل إيه بالظبط؟", en: "What exactly does the automation do?" },
        a: {
          ar: `الأتمتة بتشتغل من غير ما تتدخل خالص — ٢٤/٧.

كل ما وصلك أوردر جديد من متجرك (Shopify أو EasyOrders)، النظام بيبعت:
→ رسالة تأكيد فورية للعميل بتفاصيل الطلب
→ رسالة شحن لما الأوردر يتشحن مع رقم التتبع
→ متابعة بعد الاستلام لطلب تقييم أو عرض منتجات مشابهة

كل ده بيحصل تلقائياً بقوالب واتساب معتمدة من Meta — مش بيتعطل، مش بيتأخر.`,
          en: `Automation runs without any intervention — 24/7.

Every time a new order arrives from your store (Shopify or EasyOrders), the system sends:
→ Instant confirmation message with order details
→ Shipping notification with tracking number
→ Post-delivery follow-up for reviews or related product offers

All of this happens automatically with Meta-approved WhatsApp templates — no delays, no downtime.` },
      },
      {
        category: { ar: "الأتمتة والذكاء الاصطناعي", en: "Automation & AI" },
        q: { ar: "AI Sales Assistant ده بيعمل إيه وبيتكلم بأسلوبي؟", en: "What does the AI Sales Assistant do and does it talk in my style?" },
        a: {
          ar: `الـ AI Sales Assistant مش مجرد رد تلقائي — ده موظف مبيعات بيشتغل على بياناتك.

بيعمل إيه:\\n→ بيرد على استفسارات العملاء بذكاء بناءً على Catalog منتجاتك
→ بيقترح منتجات بناءً على تاريخ الشراء
→ بيتابع السلة المتروكة ويعمل follow-up بعد فترة
→ بيحول الاستفسار لأوردر من غير تدخل بشري

بخصوص الأسلوب — إنت بتحدد tone المحادثة وبتضيف معلومات منتجاتك، والـ AI بيتكيف معاها. مش هيكتب بأسلوب غريب.`,
          en: `The AI Sales Assistant isn't just auto-reply — it's a sales employee running on your data.

What it does:
→ Responds to customer inquiries intelligently based on your product catalog
→ Suggests products based on purchase history
→ Follows up on abandoned carts after a set period
→ Converts inquiries into orders without human intervention

As for style — you define the conversation tone and add your product info, and the AI adapts. It won't sound generic or off-brand.` },
      },
      {
        category: { ar: "الأتمتة والذكاء الاصطناعي", en: "Automation & AI" },
        q: { ar: "الـ AI ممكن يقول معلومة غلط لعميل؟", en: "Can the AI give a customer wrong information?" },
        a: {
          ar: `السؤال ده وجيه — والإجابة فيها شفافية كاملة.

الـ AI بيشتغل بس على المعلومات اللي إنت بتحطها: Catalog، أسعار، سياسة شحن. مش بيخترع معلومات.

الضمانات:\\n✓ لو العميل سأل عن حاجة مش في الـ Catalog — بيحوّله لموظف بشري فوراً
✓ ممكن تحدد نطاق الردود بالظبط
✓ كل المحادثات موجودة في صندوق الوارد للمراجعة

الـ AI عندنا مش موجود عشان يستبدل فريقك — موجود عشان يتعامل مع الأسئلة المتكررة ويوفر وقتهم للحالات الصعبة.`,
          en: `That's a fair question — and the honest answer is full transparency.

The AI only works with the information you provide: catalog, prices, shipping policy. It doesn't invent information.

Safeguards:
✓ If a customer asks about something not in the catalog — it immediately routes to a human
✓ You can define the exact scope of replies
✓ All conversations are available in the inbox for review

Our AI isn't there to replace your team — it handles repetitive questions so your team can focus on complex cases.` },
      },
      {
        category: { ar: "الأتمتة والذكاء الاصطناعي", en: "Automation & AI" },
        q: { ar: "لو ربطت متجري — هيبان للعميل إن في نظام بيرد عنيا؟", en: "If I connect my store — will customers know a system is replying for me?" },
        a: {
          ar: `ده بيرجع لإنت — وعندك تحكم كامل.

الـ AI بيرد بالاسم اللي إنت تحدده — "خدمة عملاء [اسم متجرك]" مثلاً — مش بيعرّف نفسه كـ AI لو إنت ما طلبتش كده.

بس الحقيقة؟ معظم العملاء ما بيسألوش "هل إنت AI؟" — بيهتموا بالرد السريع والمعلومة الصحيحة. والـ AI بيديهم الاتنين.

لو العميل سأل مباشرة — بنوصي بالشفافية، وفي إعدادات بتحدد فيها كيفية الرد على السؤال ده.`,
          en: `That's entirely up to you — you have full control.

The AI replies under whatever name you set — "Customer Service [Your Store Name]" for example — it doesn't identify itself as AI unless you want it to.

But honestly? Most customers don't ask "are you AI?" — they care about fast replies and accurate info. The AI delivers both.

If a customer asks directly — we recommend transparency, and there's a setting where you define how that question gets handled.` },
      },
      {
        category: { ar: "التجربة والاشتراك", en: "Trial & Subscription" },
        q: { ar: "هل أقدر أوقف الاشتراك وأرجع وقتما أشاء؟", en: "Can I cancel and return whenever I want?" },
        a: {
          ar: `نعم — بدون أي عقوبة.\n\nإلغاء بضغطة زرار من الإعدادات.\nبياناتك موجودة 30 يوم بعد الإلغاء.\nمفيش رسوم إلغاء مسبق.\nلو رجعت — كل حاجاتك في مكانها.`,
          en: `Yes — no penalty whatsoever.\n\nCancel with one click from settings.\nYour data stays for 30 days after cancellation.\nNo early cancellation fees.\nIf you return — everything is right where you left it.`
        },
      },
    ],
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    desc: { ar: "منصتك المتكاملة لإدارة وإرسال رسائل الواتساب. نساعدك على التواصل مع عملائك بكفاءة واحترافية.", en: "Your all-in-one platform to manage and send WhatsApp messages. We help you reach customers efficiently and professionally." },
    copyright: { ar: "© 2025 واتس برو. جميع الحقوق محفوظة.", en: "© 2025 WhatsPro. All rights reserved." },
    col1: { ar: "المنتج", en: "Product" },
    col2: { ar: "الشركة", en: "Company" },
    col3: { ar: "الموارد", en: "Resources" },
    col4: { ar: "قانوني", en: "Legal" },
    product: [
      { ar: "المميزات", en: "Features", href: "#features" },
      { ar: "كيف يعمل", en: "How It Works", href: "#how-it-works" },
      { ar: "الأسعار", en: "Pricing", href: "#pricing" },
      { ar: "API", en: "API", href: "#" },
    ],
    company: [
      { ar: "من نحن", en: "About Us", href: "#" },
      { ar: "فريق العمل", en: "Team", href: "#" },
      { ar: "الوظائف", en: "Careers", href: "#" },
      { ar: "اتصل بنا", en: "Contact", href: "#" },
    ],
    resources: [
      { ar: "مركز المساعدة", en: "Help Center", href: "#" },
      { ar: "المدونة", en: "Blog", href: "/articles" },
      { ar: "الشروحات", en: "Tutorials", href: "#how-it-works" },
      { ar: "الأسئلة الشائعة", en: "FAQ", href: "#faq" },
    ],
    legal: [
      { ar: "شروط الاستخدام", en: "Terms of Service", href: "/terms" },
      { ar: "سياسة الخصوصية", en: "Privacy Policy", href: "/privacy" },
    ],
    location: { ar: "الأسكندرية، مصر", en: "Alexandria, Egypt" },
  },
} as const;

/** Helper — اجيب قيمة النص حسب اللغة */
export function tr<T extends { ar: string; en: string }>(obj: T, lang: Lang): string {
  return obj[lang];
}