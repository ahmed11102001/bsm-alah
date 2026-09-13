"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { DashboardThemeProvider } from "@/lib/theme-context";
import { Toaster } from "@/components/ui/sonner";

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
      >
        <DashboardThemeProvider>
          {children}
          <Toaster />
        </DashboardThemeProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
