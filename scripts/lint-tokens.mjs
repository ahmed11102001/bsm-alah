// scripts/lint-tokens.mjs
// ─── Design System pilot: فحص الالتزام بالـtokens ────────────────────────────
// يمنع القيم المخترعة خارج النظام (حاليًا: rounded-2xl/rounded-3xl).
// الوضع الافتراضي استشاري (exit 0) حتى يكتمل pilot الـHome + الـrollout،
// ثم يُفعّل الوضع الصارم: `node scripts/lint-tokens.mjs --strict` (exit 1).
//
// الاستخدام: npm run lint:tokens [-- --strict]

import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";

const ROOTS = [
  join(process.cwd(), "src", "app", "dashboard"),
  join(process.cwd(), "src", "app", "demo"), // مقر الـpilot — يجب أن يبقى نظيفًا
];
const STRICT = process.argv.includes("--strict");

// القيم المعتمدة (أسماء Tailwind القائمة — لا قيم مخترعة):
//   inputs/badges  → rounded-lg
//   cards/tables   → rounded-xl
//   major containers/modals → rounded-2xl
// الممنوع: rounded-3xl فأعلى (تُستبدل بـ rounded-2xl)، وأي rounded-2xl
// على كارت/جدول (يُستبدل بـ rounded-xl) — يُطبق أثناء الـrollout صفحةً صفحة.
const BANNED = [
  { pattern: /rounded-3xl/g, instead: "rounded-2xl (major containers max)" },
  { pattern: /rounded-2xl/g, instead: "rounded-xl (cards/tables) — review context" },
];

let violations = 0;

function scan(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      scan(full);
      continue;
    }
    if (![".tsx", ".ts"].includes(extname(full))) continue;
    const content = readFileSync(full, "utf8");
    for (const { pattern, instead } of BANNED) {
      const matches = content.match(pattern);
      if (matches) {
        violations += matches.length;
        console.log(`  ${full} — ${pattern.source} ×${matches.length} → use ${instead}`);
      }
    }
  }
}

console.log("Design tokens check (dashboard + demo):");
for (const root of ROOTS) scan(root);

if (violations === 0) {
  console.log("✓ No violations.");
} else {
  console.log(`\n${violations} violation(s) found.`);
  if (STRICT) {
    console.error("STRICT mode: failing.");
    process.exit(1);
  } else {
    console.log("(advisory mode — will fail in --strict after the rollout)");
  }
}
