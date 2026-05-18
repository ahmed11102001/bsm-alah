// scripts/migrate-encrypt-tokens.ts
// ─── Migration: تشفير الـ accessToken الموجودة في DB ─────────────────────────
//
// شغّل مرة واحدة بس بعد إضافة ENCRYPTION_KEY للـ .env:
//   npx tsx scripts/migrate-encrypt-tokens.ts
//
// الـ script ده آمن — بيتحقق إن القيمة مش مشفرة خلاص قبل ما يشفّرها.

import prisma from "../src/lib/prisma";
import { encryptToken, isEncrypted } from "../src/lib/crypto";

async function main() {
  console.log("🔐 بدء migration تشفير الـ accessTokens...\n");

  const accounts = await prisma.whatsAppAccount.findMany({
    select: { id: true, userId: true, accessToken: true },
  });

  console.log(`📊 عدد الحسابات الموجودة: ${accounts.length}`);

  let migrated = 0;
  let alreadyEncrypted = 0;
  let failed = 0;

  for (const acc of accounts) {
    try {
      if (isEncrypted(acc.accessToken)) {
        alreadyEncrypted++;
        console.log(`  ✅ [${acc.id}] مشفّر خلاص — skip`);
        continue;
      }

      const encrypted = encryptToken(acc.accessToken);
      await prisma.whatsAppAccount.update({
        where: { id: acc.id },
        data: { accessToken: encrypted },
      });

      migrated++;
      console.log(`  🔒 [${acc.id}] تم التشفير`);
    } catch (err) {
      failed++;
      console.error(`  ❌ [${acc.id}] فشل:`, err);
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ تم تشفير   : ${migrated} حساب
⏭️  كانت مشفّرة: ${alreadyEncrypted} حساب
❌ فشل        : ${failed} حساب
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
