import { config } from "dotenv";
import path from "path";

// اللي كانت موجودة في DATABASE_URL قبل ما نحمّل .env.test (لو أي حاجة تانية
// حمّلتها قبل كده، زي .env العادي) — بنحتفظ بيها عشان نقارن بيها تحت.
const preExistingDatabaseUrl = process.env.DATABASE_URL;

// Load .env.test
config({ path: path.resolve(process.cwd(), ".env.test") });

// ── حماية أساسية: لازم DATABASE_URL_TEST يكون موجود، وإلا نوقف كل حاجة ──────
// السلوك القديم كان بيسيب DATABASE_URL زي ما هي لو DATABASE_URL_TEST مش موجودة،
// يعني ممكن الـ integration tests تشتغل صامتة على الـ DB الحقيقي من غير أي تحذير.
if (!process.env.DATABASE_URL_TEST || process.env.DATABASE_URL_TEST.trim() === "") {
  throw new Error(
    "[integration setup] DATABASE_URL_TEST مش موجودة أو فاضية. " +
    "تأكد إن ملف .env.test موجود في جذر المشروع وفيه DATABASE_URL_TEST " +
    "بيشاور على Neon test branch منفصل. الاختبارات دي بتكتب فعليًا على DB " +
    "فمرفوض تشتغل من غير الفحص ده."
  );
}

// ── حماية إضافية: لو DATABASE_URL_TEST نفس DATABASE_URL الأصلي (اللي كان ──
// محمّل قبل كده من .env العادي)، يبقى غالبًا حصل نسخ غلط لنفس الـ connection
// string الحقيقي بدل الـ test branch. نوقف فورًا.
if (
  preExistingDatabaseUrl &&
  preExistingDatabaseUrl.trim() !== "" &&
  process.env.DATABASE_URL_TEST === preExistingDatabaseUrl
) {
  throw new Error(
    "[integration setup] DATABASE_URL_TEST نفس قيمة DATABASE_URL الأصلي. " +
    "ده يعني على الأغلب انك حاطط الـ connection string الحقيقي (production/dev) " +
    "بالغلط بدل الـ Neon test branch المنفصل. راجع .env.test."
  );
}

// دلوقتي آمن نبدّل DATABASE_URL بقيمة الـ test branch المؤكدة
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

// eslint-disable-next-line no-console
console.log(
  `[integration setup] DATABASE_URL_TEST متأكد ومختلف عن القيمة الأصلية — الاختبارات هتشتغل على test branch.`
);