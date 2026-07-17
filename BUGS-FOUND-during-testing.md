# Bugs Found During Testing

أثناء كتابة وتشغيل الاختبارات، تم رصد الملاحظات التالية:

## 1. مشكلة في `src/lib/otp-redis.ts` (Replay Protection)
في دالة `verifyOtp`، إذا كانت حالة الـ OTP هي `VERIFIED`، الدالة ترجع `success: true` مع `alreadyVerified: true`، ولا ترفض إعادة الاستخدام بـ `success: false` كما هو متوقع:
```typescript
  // Already verified
  if (otp.status === "VERIFIED") {
    return { success: true, phone: otp.phone, alreadyVerified: true };
  }
```
هذا يعني أن منع إعادة الاستخدام يُترك للكود الذي يستدعي هذه الدالة، وإذا لم يتحقق من `alreadyVerified` فقد تحدث مشكلة Replay Attack. يُنصح برفض الكود المنتهي مباشرة بإرجاع `success: false`.

## 2. أخطاء في اختبارات موجودة مسبقاً (`npm run test`)
عند تشغيل كل الاختبارات في المشروع ظهرت أخطاء في ملفات أخرى لم يغطيها هذا الـ Task:
- **`src/tests/plan-guard.test.ts` و `src/tests/plans.test.ts`**: هناك تعارض في ميزة `apiAccess`. الاختبار يتوقع أنها متاحة لـ `enterprise` فقط، لكن الكود الفعلي يعطيها لـ `pro` أيضاً.
- **`src/tests/queue.test.ts`**: يرمي خطأ `TypeError: tx.message.upsert is not a function` لأن الـ mock الخاص بـ Prisma لم يعرّف `upsert` بشكل صحيح أو لوجود مشكلة في هيكلة `tx` داخل الدالة.
- **`src/tests/webhook.test.ts`**: يطبع تحذيرات حول الـ `accessToken` كونه `plain text`، ويرمي خطأ لعدم عمل mock لدوال `findStoreOrderByContext` وغيرها من دوال `smart-followup.ts` التي يعتمد عليها الـ webhook.

## 3. مشكلة Race Condition خطيرة في `src/lib/store-automation.ts`
لقد تم كتابة اختبار Integration لاختبار التزامن (Concurrency) على الـ Neon Branch. للأسف واجهت مشاكل تقنية تمنع Prisma Client من الاتصال بـ Neon على منفذ 5432 من بيئة التشغيل، لكن بعد الفحص الدقيق للكود تبين ما يلي:
- بالنسبة لـ `order_shipped`: التحقق في الـ Atomic Claim يتم عن طريق `shippedMessageId: null` بينما الـ `updateMany` يقوم بتحديث `shippedAt`. وبما أن `shippedMessageId` لا يتم تحديثه إلا بعد نجاح إرسال الـ WhatsApp API (وهو ما يستغرق وقتاً)، فإذا تم استدعاء `executeStoreAutomationSend` مرتين متزامنتين، فكلاهما سيرى أن `shippedMessageId` ما زال `null`، وسيحصل كل منهما على `claim.count === 1` ويقومان بإرسال رسالة متكررة.
- بالنسبة لـ `order_confirm` و `cart_abandon`: لا يوجد أي Atomic Claim إطلاقاً. يتم إرسال الرسالة مباشرة دون التأكد مسبقاً، مما يعرضهما لنفس مشكلة إرسال الرسائل المتكررة في حال التزامن.
