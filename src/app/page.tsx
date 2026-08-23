import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { resolveLocale } from "@/lib/locale-resolver";

export default async function RootPage() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const acceptLanguage = headerStore.get("accept-language");

  const targetLocale = resolveLocale({ cookieLocale, acceptLanguage });

  redirect(`/${targetLocale}`);
}
