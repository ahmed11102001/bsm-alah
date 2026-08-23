import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import type { Lang } from "@/lib/translations";

function resolveLocale(cookieLocale?: string, acceptLanguage?: string | null): Lang {
  if (cookieLocale === "ar" || cookieLocale === "en") {
    return cookieLocale;
  }
  if (acceptLanguage) {
    const isArabic = acceptLanguage
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .some((item) => item.startsWith("ar"));
    if (isArabic) {
      return "ar";
    }
  }
  return "en";
}

export default async function RootPage() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const acceptLanguage = headerStore.get("accept-language");

  const targetLocale = resolveLocale(cookieLocale, acceptLanguage);

  redirect(`/${targetLocale}`);
}
