export type Locale = "ar" | "en";

export const translations = {
  ar: {
    // ── Layout / Sidebar ──────────────────────────────────────────────────────
    appName: "واتس برو",
    sidebar: {
      home:       "الرئيسية",
      team:       "الفريق",
      contacts:   "جهات الاتصال",
      campaigns:  "الحملات",
      templates:  "القوالب",
      chat:       "المحادثات",
      reports:    "التقارير",
      automation: "الأتمتة الذكية",
      store:      "المتجر",
      api:        "API",
      admin:      "Admin",
    },
    theme: {
      dark:   "وضع داكن",
      light:  "وضع فاتح",
      system: "تلقائي",
    },
    signOut: "تسجيل الخروج",

    // ── Home Dashboard ────────────────────────────────────────────────────────
    home: {
      greeting:     (name: string) => `مرحباً، ${name} 👋`,
      subtitle:     "إليك نظرة عامة على أداء حسابك",
      settingsBtn:  "الإعدادات",
      newCampaign:  "حملة جديدة",

      kpi: {
        totalSent:      "إجمالي المرسل",
        delivered:      "تم التوصيل",
        totalReplies:   "إجمالي الردود",
        campaigns:      "الحملات",
        deliveryRate:   (rate: number) => `نسبة وصول ${rate}%`,
        deliveredOf:    (rate: number) => `${rate}% من المرسل`,
        replyRate:      (rate: number) => `معدل رد ${rate}%`,
        thisMonth:      (n: number) => `${n} هذا الشهر`,
      },

      plan: {
        title:          "باقتك الحالية",
        active:         "✓ نشطة",
        expired:        "منتهية",
        changePlan:     "تغيير الباقة",
        upgrade:        "ترقية",
        contacts:       "جهات الاتصال",
        campaignsMonth: "الحملات / شهر",
        teamMembers:    "أعضاء الفريق",
        features: {
          scheduledCampaigns: "جدولة",
          advancedReports:    "تقارير متقدمة",
          apiAccess:          "API",
          mediaMessages:      "وسائط",
          customAudiences:    "جمهور مخصص",
        },
      },

      campaigns: {
        title:      "آخر الحملات",
        viewAll:    "عرض الكل",
        empty:      "لا توجد حملات بعد",
        startFirst: "ابدأ أول حملة الآن",
        headers: {
          name:    "الحملة",
          date:    "التاريخ",
          sent:    "مرسل",
          delivered:"وصل",
          read:    "قُرئ",
          status:  "الحالة",
        },
        status: {
          completed: "مكتملة",
          running:   "قيد التنفيذ",
          scheduled: "مجدولة",
          failed:    "فشلت",
          draft:     "مسودة",
        },
      },
    },

    // ── Settings Modal ────────────────────────────────────────────────────────
    settings: {
      title:          "الإعدادات",
      description:    "إدارة بياناتك الشخصية وإعدادات الحساب",
      tabs: {
        profile:   "الملف الشخصي",
        password:  "كلمة المرور",
        whatsapp:  "واتساب API",
      },
      profile: {
        fullName:    "الاسم الكامل",
        phone:       "رقم الهاتف",
        email:       "البريد الإلكتروني",
        emailHint:   "البريد لا يمكن تغييره",
        saveBtn:     "حفظ التغييرات",
        saving:      "جاري الحفظ...",
        saved:       "تم الحفظ بنجاح",
      },
      password: {
        current:    "كلمة المرور الحالية",
        new:        "كلمة المرور الجديدة",
        confirm:    "تأكيد كلمة المرور",
        mismatch:   "كلمتا المرور غير متطابقتين",
        changeBtn:  "تغيير كلمة المرور",
      },
      whatsapp: {
        hint:           "هذه البيانات تُستخدم للإرسال عبر واتساب Business API الرسمي",
        accessToken:    "Access Token",
        phoneNumberId:  "Phone Number ID",
        wabaId:         "WABA ID",
        saveBtn:        "حفظ إعدادات واتساب",
      },
    },
  },

  // ── ENGLISH ──────────────────────────────────────────────────────────────────
  en: {
    appName: "Whats Pro",
    sidebar: {
      home:       "Home",
      team:       "Team",
      contacts:   "Contacts",
      campaigns:  "Campaigns",
      templates:  "Templates",
      chat:       "Conversations",
      reports:    "Reports",
      automation: "Smart Automation",
      store:      "Store",
      api:        "API",
      admin:      "Admin",
    },
    theme: {
      dark:   "Dark mode",
      light:  "Light mode",
      system: "System",
    },
    signOut: "Sign out",

    home: {
      greeting:     (name: string) => `Welcome, ${name} 👋`,
      subtitle:     "Here's an overview of your account performance",
      settingsBtn:  "Settings",
      newCampaign:  "New Campaign",

      kpi: {
        totalSent:    "Total Sent",
        delivered:    "Delivered",
        totalReplies: "Total Replies",
        campaigns:    "Campaigns",
        deliveryRate: (rate: number) => `${rate}% delivery rate`,
        deliveredOf:  (rate: number) => `${rate}% of sent`,
        replyRate:    (rate: number) => `${rate}% reply rate`,
        thisMonth:    (n: number) => `${n} this month`,
      },

      plan: {
        title:          "Your Current Plan",
        active:         "✓ Active",
        expired:        "Expired",
        changePlan:     "Change Plan",
        upgrade:        "Upgrade",
        contacts:       "Contacts",
        campaignsMonth: "Campaigns / mo",
        teamMembers:    "Team Members",
        features: {
          scheduledCampaigns: "Scheduling",
          advancedReports:    "Advanced Reports",
          apiAccess:          "API",
          mediaMessages:      "Media",
          customAudiences:    "Custom Audiences",
        },
      },

      campaigns: {
        title:      "Recent Campaigns",
        viewAll:    "View All",
        empty:      "No campaigns yet",
        startFirst: "Start your first campaign now",
        headers: {
          name:     "Campaign",
          date:     "Date",
          sent:     "Sent",
          delivered:"Delivered",
          read:     "Read",
          status:   "Status",
        },
        status: {
          completed: "Completed",
          running:   "Running",
          scheduled: "Scheduled",
          failed:    "Failed",
          draft:     "Draft",
        },
      },
    },

    settings: {
      title:       "Settings",
      description: "Manage your personal data and account settings",
      tabs: {
        profile:  "Profile",
        password: "Password",
        whatsapp: "WhatsApp API",
      },
      profile: {
        fullName:  "Full Name",
        phone:     "Phone Number",
        email:     "Email Address",
        emailHint: "Email cannot be changed",
        saveBtn:   "Save Changes",
        saving:    "Saving...",
        saved:     "Saved successfully",
      },
      password: {
        current:   "Current Password",
        new:       "New Password",
        confirm:   "Confirm Password",
        mismatch:  "Passwords do not match",
        changeBtn: "Change Password",
      },
      whatsapp: {
        hint:          "These credentials are used for sending via the official WhatsApp Business API",
        accessToken:   "Access Token",
        phoneNumberId: "Phone Number ID",
        wabaId:        "WABA ID",
        saveBtn:       "Save WhatsApp Settings",
      },
    },
  },
} as const;

export type Translations = typeof translations.ar;