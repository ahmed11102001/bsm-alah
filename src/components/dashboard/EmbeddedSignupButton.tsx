"use client";
// src/components/dashboard/EmbeddedSignupButton.tsx
// ─── WhatsApp Embedded Signup Button ──────────────────────────────────────────
//
// Loads Facebook JS SDK, launches the Embedded Signup popup, and sends the
// short-lived code (+ optional phone_number_id & waba_id from postMessage)
// to the backend for exchange.

import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, Zap }                             from "lucide-react";
import { Button }                                    from "@/components/ui/button";
import { toast }                                     from "sonner";

/* ── Props ──────────────────────────────────────────────────────────────────── */
interface EmbeddedSignupButtonProps {
  onSuccess: (data: { phone_number_id: string; waba_id: string }) => void;
  locale?: string;
}

/* ── FB SDK global types ────────────────────────────────────────────────────── */
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

/* ── Component ──────────────────────────────────────────────────────────────── */
export default function EmbeddedSignupButton({
  onSuccess,
  locale = "ar",
}: EmbeddedSignupButtonProps) {
  const [sdkReady, setSdkReady] = useState(false);
  const [loading,  setLoading]  = useState(false);

  // Store phone_number_id & waba_id received via postMessage from Meta popup
  const messageDataRef = useRef<{
    phone_number_id?: string;
    waba_id?: string;
  }>({});

  /* ── Load Facebook SDK (once) ─────────────────────────────────────────────── */
  useEffect(() => {
    // Already loaded
    if (document.getElementById("facebook-jssdk")) {
      if (window.FB) setSdkReady(true);
      return;
    }

    window.fbAsyncInit = () => {
      window.FB.init({
        appId:            process.env.NEXT_PUBLIC_META_APP_ID!,
        autoLogAppEvents: true,
        xfbml:            false,
        version:          process.env.NEXT_PUBLIC_GRAPH_API_VERSION ?? "v22.0",
      });
      setSdkReady(true);
    };

    const js    = document.createElement("script");
    js.id       = "facebook-jssdk";
    js.src      = "https://connect.facebook.net/en_US/sdk.js";
    js.async    = true;
    js.defer    = true;
    js.crossOrigin = "anonymous";
    document.body.appendChild(js);
  }, []);

  /* ── Listen for Meta postMessage (phone_number_id + waba_id) ──────────── */
  const handleMessageEvent = useCallback((event: MessageEvent) => {
    // Only accept messages from Facebook domains
    if (
      typeof event.origin !== "string" ||
      !event.origin.endsWith("facebook.com")
    ) {
      return;
    }

    try {
      const data =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;

      if (data?.type !== "WA_EMBEDDED_SIGNUP") return;

      const payload = data?.data ?? {};
      if (payload.phone_number_id) {
        messageDataRef.current.phone_number_id = payload.phone_number_id;
      }
      if (payload.waba_id) {
        messageDataRef.current.waba_id = payload.waba_id;
      }

      console.log("[EmbeddedSignup] message event:", payload);
    } catch {
      // Non-JSON message — safe to ignore
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessageEvent);
    return () => window.removeEventListener("message", handleMessageEvent);
  }, [handleMessageEvent]);

  /* ── Launch the Embedded Signup popup ──────────────────────────────────── */
  const launchSignup = () => {
    if (!sdkReady || !window.FB) {
      toast.error(
        locale === "ar"
          ? "Facebook SDK لم يتحمل بعد — حاول مجدداً"
          : "Facebook SDK not ready — please retry",
      );
      return;
    }

    // Reset any previously captured data
    messageDataRef.current = {};
    setLoading(true);

    window.FB.login(
      async (response: any) => {
        if (!response.authResponse) {
          setLoading(false);
          // "unknown" = user just closed the popup without interacting
          if (response.status !== "unknown") {
            toast.error(
              locale === "ar"
                ? "تم إلغاء الربط أو حدث خطأ"
                : "Signup cancelled or failed",
            );
          }
          return;
        }

        const code: string = response.authResponse.code;

        try {
          const res = await fetch("/api/meta/embedded-signup-complete", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              // Forward IDs captured from the message event (if available)
              phone_number_id: messageDataRef.current.phone_number_id,
              waba_id:         messageDataRef.current.waba_id,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            toast.error(
              data.error ??
                (locale === "ar" ? "فشل الربط" : "Connection failed"),
            );
            return;
          }

          toast.success(
            locale === "ar"
              ? "✅ تم ربط Meta بنجاح"
              : "✅ Meta connected successfully",
          );

          onSuccess({
            phone_number_id: data.phone_number_id,
            waba_id:         data.waba_id,
          });
        } catch {
          toast.error(
            locale === "ar"
              ? "خطأ في الاتصال بالسيرفر"
              : "Server connection error",
          );
        } finally {
          setLoading(false);
        }
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID!,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup:              {},
          featureType:        "",
          sessionInfoVersion: "2",
        },
      },
    );
  };

  /* ── Render ───────────────────────────────────────────────────────────────── */
  return (
    <Button
      type="button"
      onClick={launchSignup}
      disabled={!sdkReady || loading}
      className="w-full gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {locale === "ar" ? "جاري الربط..." : "Connecting..."}
        </>
      ) : (
        <>
          <Zap className="w-4 h-4" />
          {locale === "ar" ? "ربط Meta تلقائياً" : "Connect Meta Automatically"}
        </>
      )}
    </Button>
  );
}
