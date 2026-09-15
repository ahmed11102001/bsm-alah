import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, "./src");

export default defineConfig({
  resolve: {
    alias: { "@": src },
  },
  test: {
    environment: "node",
    globals: true,
    alias: { "@/": src + "/" },
    // الـ SDK حزمة مستقلة لها runner خاص (node --test داخل sdk/) —
    // لا تُشغَّل اختباراتها ضمن suite التطبيق الرئيسي.
    exclude: ["**/node_modules/**", "**/sdk/**"],
  },
});