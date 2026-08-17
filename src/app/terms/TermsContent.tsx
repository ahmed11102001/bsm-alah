"use client";

import Link from "next/link";
import { useState } from "react";

type Bi = { ar: string; en: string };

const sections: { id: string; title: Bi; content: Bi }[] = [
  {
    id: "acceptance",
    title: { ar: "القبول والموافقة", en: "Acceptance & Agreement" },
    content: {
      ar: `يُعد تسجيلك في Wani أو استخدامك للمنصة بأي شكل موافقةً صريحة منك على هذه الشروط وعلى سياسة الخصوصية المرتبطة بها.

إذا كنت تسجّل أو تستخدم Wani نيابةً عن شركة أو مؤسسة، فإنك تُقرّ بأنك تملك الصلاحية القانونية الكاملة للموافقة على هذه الشروط نيابةً عنها، وأن الكيان نفسه يصبح ملزمًا بها.

تحتفظ Wani بحقها في تعديل هذه الشروط من وقت لآخر. في حال إجراء تغييرات جوهرية، سيتم إخطارك قبل سريانها بمدة لا تقل عن 7 أيام، ما لم يستدعِ الأمر تغييرًا فوريًا لأسباب قانونية أو أمنية.

استمرار استخدامك للمنصة بعد سريان أي تعديل يُعد قبولًا منك للشروط المُحدَّثة.`,
      en: `By registering for or using the Wani platform in any way, you confirm your explicit agreement to these terms and to the associated Privacy Policy.

If you are registering or using Wani on behalf of a company or organization, you confirm that you have full legal authority to accept these terms on its behalf, and that entity becomes bound by them.

Wani reserves the right to modify these terms from time to time. In the case of material changes, you will be notified at least 7 days before they take effect, unless an immediate change is required for legal or security reasons.

Continuing to use the platform after any amendment takes effect constitutes your acceptance of the updated terms.`,
    },
  },
  {
    id: "service-description",
    title: { ar: "وصف الخدمة", en: "Service Description" },
    content: {
      ar: `Wani منصة SaaS (برمجيات كخدمة) لإدارة WhatsApp Business Platform الرسمية. تشمل الخدمة، حسب الخطة والميزات المتاحة:

— إدارة المحادثات مع العملاء
— إرسال واستقبال الرسائل
— إرسال قوالب الرسائل (Templates) المعتمدة من Meta
— إنشاء وإدارة الحملات التسويقية
— إدارة جهات الاتصال والجماهير (Audiences)
— بناء الأتمتة (Automations)
— الرسائل التفاعلية والأزرار
— التقارير والإحصائيات
— التكاملات الخارجية المتاحة (Shopify، WooCommerce، EasyOrders، Google Sheets، حسب الخطة)

Wani لا تضمن وصول الرسائل المُرسَلة إلى مستلميها بنسبة 100%، ولا تضمن عدم تعرّض حساب WhatsApp Business الخاص بك لأي قيود من جانب Meta. تعتمد بعض خدمات Wani على WhatsApp Business Platform وMeta وخدمات تابعة لجهات خارجية أخرى، وقد يتأثر توفرها بالتغيرات أو القرارات الصادرة عن تلك الجهات، خارج نطاق سيطرة Wani.`,
      en: `Wani is a SaaS platform for managing the official WhatsApp Business Platform. Depending on your plan and available features, the service includes:

— Managing conversations with customers
— Sending and receiving messages
— Sending Meta-approved message templates
— Creating and managing marketing campaigns
— Managing contacts and audiences
— Building automations
— Interactive messages and buttons
— Reports and analytics
— Available external integrations (Shopify, WooCommerce, EasyOrders, Google Sheets, depending on plan)

Wani does not guarantee that sent messages will reach 100% of their recipients, nor that your WhatsApp Business account will be free from restrictions imposed by Meta. Some Wani services depend on the WhatsApp Business Platform, Meta, and other third-party services, and their availability may be affected by changes or decisions made by those parties, outside Wani's control.`,
    },
  },
  {
    id: "account",
    title: { ar: "الحساب والمسؤولية", en: "Account & Responsibility" },
    content: {
      ar: `**إنشاء الحساب:**
— يجوز إنشاء حساب واحد لكل شركة أو كيان تجاري، مع إمكانية إضافة مستخدمين وأعضاء فريق للحساب نفسه وفق حدود وصلاحيات الخطة المشترك بها
— يجب أن يكون عمرك 18 سنة أو أكثر
— يجب تقديم معلومات دقيقة وحديثة عند التسجيل، وتحديثها عند تغيّرها

**مسؤوليتك:**
— أنت مسؤول عن الحفاظ على سرية بيانات تسجيل دخولك
— أي نشاط يتم من خلال حسابك، بما في ذلك عبر أعضاء الفريق المُصرَّح لهم، هو مسؤوليتك الكاملة
— يجب إخطارنا فوراً في حال الاشتباه في أي وصول غير مصرح به
— لا يجوز مشاركة الحساب أو بيانات الدخول مع أطراف غير مصرح لها`,
      en: `**Creating an account:**
— One account may be created per company or business entity, with the ability to add users and team members under the same account according to your plan's limits and permissions
— You must be 18 years of age or older
— You must provide accurate and current information at sign-up, and update it when it changes

**Your responsibility:**
— You are responsible for keeping your login credentials confidential
— Any activity through your account, including via authorized team members, is your full responsibility
— You must notify us immediately if you suspect unauthorized access
— The account or login credentials must not be shared with unauthorized parties`,
    },
  },
  {
    id: "meta-compliance",
    title: { ar: "الامتثال لسياسات Meta وواتساب", en: "Compliance with Meta & WhatsApp Policies" },
    content: {
      ar: `يخضع استخدامك لـ Wani، باعتبارها منصة مبنية فوق WhatsApp Business Platform، لسياسات Meta وWhatsApp السارية في كل وقت. يجب عليك استيفاء المتطلبات التي تفرضها Meta وWhatsApp على نوع الحساب والخدمة التي تستخدمها.

**ما يجب عليك فعله:**
— الحصول على موافقة مسبقة (Opt-in) مناسبة من كل مستلم قبل إرسال رسائل تسويقية له، والاحتفاظ بما يثبت ذلك
— توفير آلية واضحة لإلغاء الاشتراك (Opt-out) والالتزام بتنفيذها فوراً
— استخدام قوالب Meta المعتمدة في الحالات التي تستوجب ذلك
— الالتزام بنافذة خدمة العملاء ذات الـ24 ساعة عند إرسال رسائل حرة خارج نطاق القوالب
— الالتزام بحدود الإرسال ومعايير الجودة وكافة سياسات WhatsApp

**ما لا يُسمح به إطلاقاً:**
— إرسال Spam أو رسائل غير مرغوب فيها
— إرسال محتوى مضلل أو مخادع أو احتيالي أو غير قانوني
— شراء قوائم أرقام هاتفية وإرسال رسائل بدون موافقة أصحابها
— محاولة التحايل على أنظمة Meta أو WhatsApp أو تجاوز القيود المفروضة عليها

**تبعات المخالفة:**
Meta هي الجهة الوحيدة التي تملك سلطة اتخاذ قرارات تعليق أو تقييد أو حظر أرقام وحسابات WhatsApp Business، وفق سياساتها الخاصة. Wani لا تستطيع، ولا تضمن، منع حدوث ذلك. مع ذلك، فإن هذا لا يُضعف الحقوق الممنوحة لك بموجب Wani Protection Guarantee الموضح في القسم التالي، والتي تخضع لشروطها الخاصة المستقلة.`,
      en: `As a platform built on top of the WhatsApp Business Platform, your use of Wani is subject to Meta's and WhatsApp's policies in effect at all times. You must meet the requirements Meta and WhatsApp impose based on your account and service type.

**What you must do:**
— Obtain appropriate prior opt-in consent from each recipient before sending them marketing messages, and retain proof of it
— Provide a clear opt-out mechanism and honor it immediately
— Use Meta-approved templates where required
— Honor the 24-hour customer service window when sending free-form messages outside of templates
— Stay within sending limits, quality standards, and all applicable WhatsApp policies

**What is never allowed:**
— Sending spam or unsolicited messages
— Sending misleading, deceptive, fraudulent, or unlawful content
— Purchasing phone number lists and messaging them without consent
— Attempting to circumvent Meta's or WhatsApp's systems or bypass their restrictions

**Consequences of violations:**
Meta alone has the authority to suspend, restrict, or disable WhatsApp Business numbers and accounts under its own policies. Wani cannot, and does not, guarantee this will not happen. This does not, however, diminish the rights granted to you under the Wani Protection Guarantee described in the next section, which is governed by its own independent terms.`,
    },
  },
  {
    id: "protection-guarantee",
    title: { ar: "ضمان الحماية — Wani Protection Guarantee", en: "Wani Protection Guarantee" },
    content: {
      ar: `تقدّم Wani لعملائها المؤهلين ضمان استرداد مشروط يُعرف بـ "Wani Protection Guarantee". هذا ضمان استرداد مشروط، وليس ضمانًا ضد الحظر — Wani لا تستطيع أن تضمن عدم تعرّض رقمك للحظر من Meta، ولا أن تحدد بشكل مطلق سبب أي قرار تتخذه Meta. ما تقدمه Wani هو التزام باسترداد جزء من قيمة الاشتراك للحالات المؤهلة، بعد مراجعة الحالة.

**شروط الاستحقاق (يجب استيفاء الجميع):**
— أن يكون رقم WhatsApp محل المطالبة متصلًا فعليًا بحساب Wani وقت الحظر
— أن يكون الحظر قد وقع أثناء فترة اشتراك سارٍ في Wani
— ألا يكون الرقم نفسه مستخدَمًا على منصة أو مزود WhatsApp API آخر خلال فترة المراجعة
— الالتزام الكامل بسياسات Meta وWhatsApp، بما في ذلك Opt-in ونافذة الـ24 ساعة والقوالب المعتمدة وحدود الإرسال
— عدم إرسال Spam أو محتوى محظور أو استخدام قوائم أرقام مُشتراة
— إبلاغ Wani بواقعة الحظر خلال 48–72 ساعة من علمك بها
— تقديم ما يثبت الحظر، والسماح لفريق Wani بمراجعة سجلات الحساب المتعلقة بالمطالبة

**آلية المراجعة:**
يراجع فريق Wani ما هو متاح لديه من بيانات الحساب (معرّفات الرسائل، أوقات الإرسال، الحملات، الأتمتة، القوالب، حالة الالتزام بنافذة الـ24 ساعة، وسجل الأنشطة قبل الحظر مباشرةً). عدم وجود نشاط معيّن في سجلات Wani قد يكون دليلًا على أن هذا النشاط لم يتم من خلال المنصة، لكنه لا يمثّل وحده إثباتًا نهائيًا لسبب قرار Meta.

**قيمة ومدة الاسترداد:**
الاسترداد يكون بقيمة الجزء المتبقي غير المُستخدَم من الاشتراك الشهري المدفوع، ولا يشمل مدفوعات أشهر سابقة منقضية بالكامل. تتم معالجة الطلبات المؤهلة خلال 5 إلى 15 يوم عمل من تاريخ اكتمال المراجعة والموافقة عليها.

**حالات عدم الاستحقاق:**
— استخدام منصة أخرى على نفس الرقم خلال فترة المراجعة
— مخالفة سياسات Meta أو WhatsApp، أو إرسال Spam، أو عدم وجود Opt-in مطلوب
— استخدام قوائم مشتراة أو تجاوز حدود الإرسال أو استخدام قوالب غير معتمدة عند الحاجة إليها
— عدم تقديم المعلومات المطلوبة، أو تقديم معلومات غير صحيحة
— ثبوت أن سبب الحظر نشاط تم خارج Wani، أو عدم توفر معلومات كافية لربط الحظر بفترة استخدام Wani`,
      en: `Wani offers eligible customers a conditional refund guarantee known as the "Wani Protection Guarantee." This is a conditional refund guarantee — not a guarantee against being banned. Wani cannot guarantee your number will not be blocked by Meta, nor can it definitively determine the reason behind any Meta decision. What Wani commits to is refunding part of your subscription value for eligible cases, following a case review.

**Eligibility requirements (all must be met):**
— The WhatsApp number in question must be actively connected to a Wani account at the time of the ban
— The ban must have occurred during an active Wani subscription period
— The same number must not have been used on another WhatsApp API platform or provider during the review period
— Full compliance with Meta and WhatsApp policies, including opt-in, the 24-hour window, approved templates, and sending limits
— No spam, prohibited content, or purchased number lists
— Notifying Wani of the ban within 48–72 hours of becoming aware of it
— Providing proof of the ban and allowing Wani's team to review the account records related to the claim

**Review process:**
Wani's team reviews the account data available to it (message IDs, sending times, campaigns, automations, templates, 24-hour window compliance status, and the activity log immediately preceding the ban). The absence of a particular activity in Wani's records may indicate that activity did not occur through the platform, but it does not by itself constitute conclusive proof of the reason for Meta's decision.

**Refund value and timeline:**
The refund covers the unused remaining portion of the paid monthly subscription and does not include payments for fully elapsed prior months. Eligible claims are processed within 5 to 15 business days from the date the review is completed and approved.

**Cases of ineligibility:**
— Using another platform on the same number during the review period
— Violating Meta or WhatsApp policies, sending spam, or lacking required opt-in
— Using purchased lists, exceeding sending limits, or using unapproved templates where required
— Failing to provide requested information, or providing false information
— A determined cause outside of Wani, or insufficient information to link the ban to the Wani usage period`,
    },
  },
  {
    id: "plans-payments",
    title: { ar: "الخطط والدفع", en: "Plans & Payment" },
    content: {
      ar: `**الخطط المتاحة:**
— خطة مجانية: 100 جهة اتصال، 3 حملات، مستخدم واحد
— خطة Starter: 249 جنيه/شهر — 2,000 جهة اتصال، 50 حملة
— خطة Professional: 599 جنيه/شهر — 15,000 جهة اتصال، حملات غير محدودة
— خطة Enterprise: 1199 جنيه/شهر — جهات اتصال غير محدودة، حملات غير محدودة

قد تختلف الحدود والمزايا التفصيلية، وتخضع بشكل نهائي للحدود الموضحة فعليًا داخل لوحة تحكم Wani وقت الاشتراك.

**شروط الدفع:**
— الاشتراك يُجدَّد تلقائياً كل شهر ما لم يُلغَ قبل موعد التجديد
— لا تُستَرد المبالغ المدفوعة عن الفترات المنقضية، إلا في الحالات التي تنص عليها سياسات Wani صراحةً، بما فيها الحالات المؤهلة بموجب Wani Protection Guarantee
— في حال إلغاء الاشتراك، تظل الخدمة متاحة حتى نهاية الفترة المدفوعة
— نحتفظ بحق تغيير الأسعار مع إخطار مسبق 30 يوماً

في حال فشل عملية الدفع، يجوز تعليق بعض الميزات المدفوعة أو تحويل الحساب إلى وضع محدود، وفق السياسة المعمول بها.`,
      en: `**Available plans:**
— Free plan: 100 contacts, 3 campaigns, 1 user
— Starter plan: 249 EGP/month — 2,000 contacts, 50 campaigns
— Professional plan: 599 EGP/month — 15,000 contacts, unlimited campaigns
— Enterprise plan: 1199 EGP/month — unlimited contacts, unlimited campaigns

Detailed limits and features may vary and are ultimately governed by the limits shown to you inside the Wani dashboard at the time of subscription.

**Payment terms:**
— Subscriptions renew automatically each month unless cancelled before the renewal date
— Amounts paid for elapsed periods are non-refundable, except where Wani's policies explicitly state otherwise, including cases eligible under the Wani Protection Guarantee
— If you cancel, the service remains available until the end of the paid period
— We reserve the right to change prices with 30 days' advance notice

If a payment fails, some paid features may be suspended, or the account may be moved to a limited status, per the applicable policy.`,
    },
  },
  {
    id: "prohibited",
    title: { ar: "الاستخدامات المحظورة", en: "Prohibited Uses" },
    content: {
      ar: `يُحظر استخدام المنصة في أي مما يلي:

— إرسال رسائل غير مرغوب فيها (Spam)
— الاحتيال أو التصيد الإلكتروني أو انتحال الهوية
— نشر محتوى مخالف للقانون المصري أو الدولي
— التشهير أو انتهاك حقوق الملكية الفكرية للغير
— إرسال فيروسات أو برمجيات خبيثة
— محاولة اختراق المنصة أو التلاعب بأنظمتها
— إعادة بيع الخدمة دون إذن كتابي مسبق منا
— استخدام الخدمة لأغراض سياسية أو انتخابية بالمخالفة للقوانين أو سياسات الجهات المعنية

في حال ظهور أي نشاط يمثّل خطرًا محتملًا على الحساب أو على المنصة، يحق لـ Wani تقييد الحملات أو الإرسال مؤقتًا، دون أن يقتصر الإجراء على إنهاء الحساب فقط.`,
      en: `Using the platform for any of the following is prohibited:

— Sending spam or unsolicited messages
— Fraud, phishing, or impersonation
— Publishing content that violates Egyptian or international law
— Defamation or infringement of others' intellectual property rights
— Sending viruses or malicious software
— Attempting to breach the platform or tamper with its systems
— Reselling the service without our prior written permission
— Using the service for political or electoral purposes in violation of applicable laws or relevant policies

If any activity emerges that poses a potential risk to the account or the platform, Wani may temporarily restrict campaigns or sending, not limited to account termination alone.`,
    },
  },
  {
    id: "data-ownership",
    title: { ar: "ملكية البيانات", en: "Data Ownership" },
    content: {
      ar: `**بياناتك ملكك:**
— تظل جميع بيانات العميل ومحتواه — جهات الاتصال، الرسائل، القوالب، الحملات، وأي محتوى آخر — ملكًا خالصًا للمستخدم
— لا ندّعي أي ملكية على المحتوى الذي تنشئه أو ترسله

**ترخيص الاستخدام:**
تحصل Wani فقط على الحقوق اللازمة لاستضافة ومعالجة بياناتك بغرض تقديم الخدمة نيابةً عنك، وفق ما هو موضح في سياسة الخصوصية. لا تمتلك Wani أي حقوق إضافية على محتواك خارج هذا النطاق.`,
      en: `**Your data is yours:**
— All customer data and content — contacts, messages, templates, campaigns, and any other content — remains solely owned by the user
— We claim no ownership over content you create or send

**License to us:**
Wani only obtains the rights necessary to host and process your data for the purpose of providing the service on your behalf, as described in the Privacy Policy. Wani has no additional rights over your content beyond this scope.`,
    },
  },
  {
    id: "privacy",
    title: { ar: "الخصوصية ومعالجة البيانات", en: "Privacy & Data Processing" },
    content: {
      ar: `تخضع كافة عمليات جمع ومعالجة البيانات الشخصية على منصة Wani لسياسة الخصوصية الخاصة بنا، والتي تُعد وثيقة منفصلة ومكمّلة لهذه الشروط وليست بديلًا عنها.

تغطي سياسة الخصوصية بالتفصيل: البيانات التي تجمعها Wani، بيانات الحساب وجهات الاتصال، محتوى الرسائل، البيانات المتبادلة مع WhatsApp وMeta، بيانات التكاملات الخارجية (Google Sheets، Shopify، WooCommerce، EasyOrders)، الملفات والوسائط، بيانات الدفع، ملفات تعريف الارتباط، مزودي الخدمات الخارجيين، مدة الاحتفاظ بالبيانات، آلية الحذف، وحقوقك المتعلقة ببياناتك.

يُرجى مراجعة سياسة الخصوصية كاملة للاطلاع على التفاصيل الكاملة.`,
      en: `All collection and processing of personal data on the Wani platform is governed by our Privacy Policy, a separate document that complements these terms rather than replacing them.

The Privacy Policy covers in detail: the data Wani collects, account and contact data, message content, data exchanged with WhatsApp and Meta, external integration data (Google Sheets, Shopify, WooCommerce, EasyOrders), files and media, payment data, cookies, third-party service providers, data retention periods, deletion mechanisms, and your rights regarding your data.

Please review the full Privacy Policy for complete details.`,
    },
  },
  {
    id: "service-availability",
    title: { ar: "توفر الخدمة والصيانة", en: "Service Availability & Maintenance" },
    content: {
      ar: `تسعى Wani إلى توفير الخدمة بأعلى درجة ممكنة من الاستمرارية، لكنها لا تقدم ضمانًا قانونيًا (SLA) بتوفر متواصل أو خالٍ من الانقطاعات، ما لم ينص اتفاق منفصل ومكتوب على خلاف ذلك.

**حالات قد تنقطع فيها الخدمة:**
— صيانة دورية مجدولة (سنخطرك مسبقاً)
— أعطال تقنية غير متوقعة
— تغيرات أو انقطاعات في خدمات Meta أو WhatsApp Business Platform
— أعطال لدى مزودي الخدمات الخارجيين المتكاملين مع Wani
— قوة قاهرة خارجة عن إرادتنا`,
      en: `Wani strives to provide the service with the highest possible level of continuity, but does not offer a legal SLA guaranteeing uninterrupted availability unless a separate written agreement states otherwise.

**Situations that may cause interruptions:**
— Scheduled routine maintenance (we'll notify you in advance)
— Unexpected technical failures
— Changes or outages in Meta or WhatsApp Business Platform services
— Outages at third-party service providers integrated with Wani
— Force majeure events beyond our control`,
    },
  },
  {
    id: "liability",
    title: { ar: "حدود المسؤولية", en: "Limitation of Liability" },
    content: {
      ar: `**نخلي مسؤوليتنا من:**
— قرارات Meta المتعلقة بتعليق أو تقييد أو حظر أي حساب أو رقم WhatsApp
— فقدان عملاء أو صفقات نتيجة عدم وصول رسائلك
— محتوى الرسائل التي ترسلها أنت عبر المنصة
— الأعطال أو الانقطاعات الناتجة عن خدمات خارجية (Meta، WhatsApp، مزودي التكامل، خدمات الدفع)
— الأضرار غير المباشرة أو التبعية أو العرضية، حيثما يسمح القانون بذلك

هذا القسم لا يتعارض مع الالتزامات المنصوص عليها في Wani Protection Guarantee. أي حقوق استرداد تنشأ بموجبه تخضع لشروطها الخاصة الموضحة أعلاه، ولا تتأثر بمجرد وجود هذا القسم العام.

**الحد الأقصى للتعويض:**
في جميع الأحوال، لا تتجاوز مسؤولية Wani تجاهك قيمة ما دفعته فعليًا خلال آخر 3 أشهر، دون الإخلال بأي حقوق لا يجوز التنازل عنها قانونيًا.`,
      en: `**We disclaim liability for:**
— Meta's decisions regarding suspending, restricting, or banning any WhatsApp account or number
— Loss of customers or deals due to messages not being delivered
— The content of messages you send through the platform
— Outages or interruptions caused by third-party services (Meta, WhatsApp, integration providers, payment services)
— Indirect, consequential, or incidental damages, wherever the law permits such exclusion

This section does not conflict with the commitments set out in the Wani Protection Guarantee. Any refund rights arising under it are governed by its own terms described above, and are not affected merely by the existence of this general liability section.

**Maximum compensation:**
In all cases, Wani's liability to you will not exceed the amount you actually paid in the last 3 months, without prejudice to any rights that cannot be legally waived.`,
    },
  },
  {
    id: "termination",
    title: { ar: "إنهاء الخدمة", en: "Termination" },
    content: {
      ar: `**من جانبك:**
يمكنك إلغاء حسابك في أي وقت من إعدادات الحساب. تظل بياناتك متاحة للتصدير لمدة 30 يوماً بعد الإلغاء.

**من جانبنا:**
نحتفظ بحق تعليق أو إنهاء حسابك في حال:
— مخالفة جسيمة لهذه الشروط
— نشاط احتيالي مؤكد
— خطر أمني على المنصة أو مستخدمين آخرين
— مخالفة صريحة لسياسات Meta أو WhatsApp
— عدم سداد المستحقات المالية

قد تُطبَّق بعض القيود فورًا في حالات الخطر الجسيم، مع إخطارك في أقرب وقت ممكن بعد ذلك.`,
      en: `**On your part:**
You can cancel your account at any time from your account settings. Your data remains available for export for 30 days after cancellation.

**On our part:**
We reserve the right to suspend or terminate your account in the event of:
— A serious violation of these terms
— Confirmed fraudulent activity
— A security risk to the platform or other users
— A clear violation of Meta or WhatsApp policies
— Non-payment of amounts due

Some restrictions may apply immediately in cases of serious risk, with notification to you as soon as possible afterward.`,
    },
  },
  {
    id: "governing-law",
    title: { ar: "القانون المعمول به", en: "Governing Law" },
    content: {
      ar: `تخضع هذه الشروط وتُفسَّر وفقاً لقوانين جمهورية مصر العربية.

في حال نشوء أي نزاع، يكون الاختصاص القضائي لمحاكم الاسكندرية، دون الإخلال بأي حقوق إلزامية أخرى قد تكون مقررة للمستخدم بموجب القانون.`,
      en: `These terms are governed by and construed in accordance with the laws of the Arab Republic of Egypt.

Should any dispute arise, the courts of Cairo shall have jurisdiction, without prejudice to any other mandatory rights the user may have under the law.`,
    },
  },
  {
    id: "contact",
    title: { ar: "تواصل معنا", en: "Contact Us" },
    content: {
      ar: `لأي استفسارات حول هذه الشروط:

البريد الإلكتروني: support@aiwni.com
سيتم الرد خلال 72 ساعة من أيام العمل.`,
      en: `For any questions about these terms:

Email: support@aiwni.com
We aim to respond within 72 business hours.`,
    },
  },
];

function renderBody(text: string) {
  return text.split("\n").map((line, j) => {
    if (line.startsWith("**") && line.endsWith("**")) {
      return (
        <p key={j} className="font-semibold text-gray-800 mt-4 mb-1">
          {line.replace(/\*\*/g, "")}
        </p>
      );
    }
    if (line.startsWith("— ")) {
      return (
        <div key={j} className="flex items-start gap-2 py-0.5">
          <span className="text-[#25D366] mt-1.5 text-xs flex-shrink-0">●</span>
          <span>{line.slice(2)}</span>
        </div>
      );
    }
    if (line === "") return <div key={j} className="h-2" />;
    return <p key={j}>{line}</p>;
  });
}

export default function TermsContent() {
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const dir = locale === "ar" ? "rtl" : "ltr";
  const isAr = locale === "ar";

  return (
    <div className="min-h-screen bg-white" dir={dir}>
      {/* شريط علوي */}
      <div className="bg-[#075E54]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ transform: isAr ? "none" : "rotate(180deg)" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {isAr ? "الرجوع للرئيسية" : "Back to home"}
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#25D366] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <span className="text-white font-bold text-sm">Wani</span>
            </div>

            <button
              onClick={() => setLocale(isAr ? "en" : "ar")}
              className="text-xs text-white/80 hover:text-white border border-white/25 hover:border-white/50 rounded-full px-3 py-1 transition-colors"
            >
              {isAr ? "English" : "العربية"}
            </button>
          </div>
        </div>
      </div>

      {/* الهيدر */}
      <div className="bg-gradient-to-b from-[#075E54] to-[#0d7a6e] pb-16 pt-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
            <svg className="w-4 h-4 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-white/90 text-sm">
              {isAr ? "يُرجى القراءة بعناية" : "Please read carefully"}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            {isAr ? "شروط الاستخدام" : "Terms of Use"}
          </h1>
          <p className="text-white/70 text-sm">
            {isAr ? "آخر تحديث: " : "Last updated: "}
            {new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* المحتوى */}
      <div className="max-w-4xl mx-auto px-6 -mt-8 pb-20">

        {/* تنبيه Meta */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-amber-800 text-sm mb-1">
              {isAr ? "تنبيه مهم بشأن سياسات Meta" : "Important notice about Meta policies"}
            </p>
            <p className="text-amber-700 text-sm leading-relaxed">
              {isAr ? (
                <>
                  استخدام هذه المنصة يلزمك بالامتثال الكامل لـ{" "}
                  <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    سياسة WhatsApp Business
                  </a>{" "}
                  و{" "}
                  <a href="https://developers.facebook.com/terms" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    شروط Meta للمطورين
                  </a>
                  . المخالفة قد تؤدي إلى إيقاف رقمك من Meta.
                </>
              ) : (
                <>
                  Using this platform requires full compliance with the{" "}
                  <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    WhatsApp Business Policy
                  </a>{" "}
                  and{" "}
                  <a href="https://developers.facebook.com/terms" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    Meta's Developer Terms
                  </a>
                  . Violations may result in Meta disabling your number.
                </>
              )}
            </p>
          </div>
        </div>

        {/* بطاقة الفهرس */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <p className="text-xs font-semibold text-[#075E54] uppercase tracking-wider mb-4">
            {isAr ? "المحتويات" : "Contents"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#075E54] transition-colors py-1"
              >
                <span className="text-[#25D366] font-mono text-xs w-5">{String(i + 1).padStart(2, "0")}</span>
                {s.title[locale]}
              </a>
            ))}
          </div>
        </div>

        {/* الأقسام */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <div
              key={section.id}
              id={section.id}
              className={`bg-white rounded-2xl border shadow-sm p-8 scroll-mt-6 ${section.id === "meta-compliance"
                  ? "border-amber-200 bg-amber-50/30"
                  : section.id === "prohibited"
                    ? "border-red-100 bg-red-50/20"
                    : section.id === "protection-guarantee"
                      ? "border-[#25D366]/30 bg-[#f0fdf4] ring-1 ring-[#25D366]/20"
                      : "border-gray-100"
                }`}
            >
              <div className="flex items-start gap-4 mb-5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${section.id === "meta-compliance"
                      ? "bg-amber-100"
                      : section.id === "prohibited"
                        ? "bg-red-100"
                        : section.id === "protection-guarantee"
                          ? "bg-[#25D366]"
                          : "bg-[#f0fdf4]"
                    }`}
                >
                  {section.id === "protection-guarantee" ? (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ) : (
                    <span
                      className={`font-bold text-sm ${section.id === "meta-compliance"
                          ? "text-amber-600"
                          : section.id === "prohibited"
                            ? "text-red-500"
                            : "text-[#25D366]"
                        }`}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>
                <div className="pt-1">
                  <h2 className="text-xl font-bold text-gray-900">{section.title[locale]}</h2>
                  {section.id === "protection-guarantee" && (
                    <span className="inline-block mt-1 text-xs font-semibold text-[#0d7a6e] bg-white border border-[#25D366]/30 rounded-full px-2.5 py-0.5">
                      {isAr ? "ميزة حصرية من Wani" : "Exclusive Wani feature"}
                    </span>
                  )}
                </div>
              </div>
              <div className={`text-gray-600 leading-relaxed text-[15px] ${isAr ? "pr-13" : "pl-13"}`}>
                {renderBody(section.content[locale])}
              </div>
            </div>
          ))}
        </div>

        {/* فوتر الصفحة */}
        <div className="mt-10 p-6 bg-[#f0fdf4] rounded-2xl border border-[#dcfce7] text-center">
          <p className="text-sm text-gray-600 mb-3">
            {isAr ? "لديك سؤال حول شروط الاستخدام؟" : "Have a question about these terms?"}
          </p>
          <a
            href="mailto:support@aiwni.com"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-[#20bb5a] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {isAr ? "تواصل معنا" : "Contact us"}
          </a>
          <div className="mt-4 pt-4 border-t border-[#dcfce7] flex justify-center gap-6 text-xs text-gray-500">
            <Link href="/privacy" className="hover:text-[#075E54] transition-colors">
              {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
            </Link>
            <span>•</span>
            <Link href="/" className="hover:text-[#075E54] transition-colors">
              {isAr ? "الصفحة الرئيسية" : "Home"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}