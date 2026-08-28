"use client";
// src/components/dashboard/EmbeddedSignupButton.tsx
// ─── WhatsApp Embedded Signup Button ──────────────────────────────────────────
//
// Compliant with official Meta Embedded Signup v3/v4 specifications:
// 1. Launches Facebook JS SDK FB.login with config_id, response_type: 'code', sessionInfoVersion: '3'
// 2. Captures WA_EMBEDDED_SIGNUP postMessage events for metadata confirmation (waba_id, phone_number_id)
// 3. Exchanges authorization code on backend (/api/meta/embedded-signup-complete) -> Meta token -> WABA -> Neon DB
// 4. Maintains clear state machine: waiting_for_meta -> received_signup_result -> received_auth_code -> sending_to_backend -> connected

import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GRAPH_API_VERSION } from "@/lib/meta-graph";

/* ── Props ──────────────────────────────────────────────────────────────────── */
interface EmbeddedSignupButtonProps {
  onSuccess: (data: {
    phone_number_id: string;
    waba_id: string;
    display_phone_number?: string;
  }) => void;
  locale?: string;
  endpoint?: string;
}

/* ── Flow State Machine ─────────────────────────────────────────────────────── */
export type SignupFlowStep =
  | "idle"
  | "waiting_for_meta"
  | "received_signup_result"
  | "received_auth_code"
  | "sending_to_backend"
  | "connected"
  | "failed";

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
  endpoint = "/api/meta/embedded-signup-complete",
}: EmbeddedSignupButtonProps) {
  const [sdkReady, setSdkReady] = useState(false);
  const [flowStep, setFlowStep] = useState<SignupFlowStep>("idle");
  const [error, setError] = useState<string | null>(null);

  const isLoading = flowStep === "waiting_for_meta" || flowStep === "received_signup_result" || flowStep === "received_auth_code" || flowStep === "sending_to_backend";

  // Store phone_number_id & waba_id received via postMessage from Meta popup
  const messageDataRef = useRef<{
    phone_number_id?: string;
    waba_id?: string;
    current_step?: string;
  }>({});

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Load Facebook SDK (once) ─────────────────────────────────────────────── */
  useEffect(() => {
    if (document.getElementById("facebook-jssdk")) {
      if (window.FB) setSdkReady(true);
      return;
    }

    window.fbAsyncInit = () => {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID!,
        autoLogAppEvents: true,
        xfbml: false,
        version: GRAPH_API_VERSION,
      });
      setSdkReady(true);
    };

    const js = document.createElement("script");
    js.id = "facebook-jssdk";
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    js.async = true;
    js.defer = true;
    js.crossOrigin = "anonymous";
    document.body.appendChild(js);
  }, []);

  /* ── Listen for Meta postMessage (WA_EMBEDDED_SIGNUP metadata) ───────────── */
  const handleMessageEvent = useCallback((event: MessageEvent) => {
    // Only accept messages from Facebook domains
    const isFacebookOrigin = typeof event.origin === "string" && (
      event.origin.endsWith("facebook.com") ||
      event.origin.endsWith("fb.com")
    );

    if (!isFacebookOrigin) return;

    try {
      const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

      if (data?.type === "WA_EMBEDDED_SIGNUP") {
        const payload = data?.data ?? {};

        console.log("[EmbeddedSignup][WA_EVENT]", {
          origin: event.origin,
          event: data?.event,
          type: data?.type,
          current_step: payload?.current_step,
          version: payload?.version,
          has_waba_id: Boolean(payload?.waba_id),
          has_phone_number_id: Boolean(payload?.phone_number_id),
        });

        if (data?.type === "WA_EMBEDDED_SIGNUP" && data?.event === "FINISH") {
          console.log("[EmbeddedSignup][FINISH]", {
            has_waba_id: Boolean(payload?.waba_id),
            has_phone_number_id: Boolean(payload?.phone_number_id),
            current_step: payload?.current_step,
          });
        }

        if (payload.phone_number_id) {
          messageDataRef.current.phone_number_id = payload.phone_number_id;
        }
        if (payload.waba_id) {
          messageDataRef.current.waba_id = payload.waba_id;
        }
        if (payload.current_step) {
          messageDataRef.current.current_step = payload.current_step;
        }

        setFlowStep((prev) => (prev === "waiting_for_meta" ? "received_signup_result" : prev));
      }
    } catch {
      // Non-JSON message — ignore safely
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessageEvent);
    return () => window.removeEventListener("message", handleMessageEvent);
  }, [handleMessageEvent]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  /* ── Execute backend token exchange & Neon storage ───────────────────────── */
  const completeSignupOnBackend = async (code: string, redirectUri: string) => {
    setFlowStep("sending_to_backend");

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          redirect_uri: redirectUri,
          phone_number_id: messageDataRef.current.phone_number_id,
          waba_id: messageDataRef.current.waba_id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFlowStep("failed");
        const errMsg = data.error ?? (locale === "ar" ? "فشل الربط" : "Connection failed");
        setError(errMsg);
        toast.error(errMsg);
        return;
      }

      setFlowStep("connected");
      setError(null);
      toast.success(
        locale === "ar"
          ? "✅ تم ربط Meta بنجاح"
          : "✅ Meta connected successfully",
      );

      onSuccess({
        phone_number_id: data.phone_number_id,
        waba_id: data.waba_id,
        display_phone_number: data.display_phone_number,
      });
    } catch (fetchErr: any) {
      console.error("[EmbeddedSignup] Backend exchange request failed:", fetchErr?.message || fetchErr);
      setFlowStep("failed");
      const netErrMsg = locale === "ar" ? "خطأ في الاتصال بالسيرفر" : "Server connection error";
      setError(netErrMsg);
      toast.error(netErrMsg);
    }
  };

  /* ── Launch the Embedded Signup popup ──────────────────────────────────── */
  const launchSignup = () => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;

    console.log("[EmbeddedSignup][LAUNCH]", {
      config_id_present: Boolean(configId),
      response_type: "code",
      sessionInfoVersion: "3",
      redirect_origin: typeof window !== "undefined" ? window.location.origin : "",
    });

    if (!sdkReady || !window.FB) {
      const message = locale === "ar"
        ? "Facebook SDK لم يتحمل بعد — حاول مجدداً"
        : "Facebook SDK not ready — please retry";
      setError(message);
      toast.error(message);
      return;
    }

    if (!appId || !configId) {
      const message = locale === "ar"
        ? "إعدادات Meta ناقصة: تأكد من NEXT_PUBLIC_META_APP_ID و NEXT_PUBLIC_META_CONFIG_ID"
        : "Meta setup is incomplete: check NEXT_PUBLIC_META_APP_ID and NEXT_PUBLIC_META_CONFIG_ID";
      setError(message);
      toast.error(message);
      return;
    }

    setError(null);
    messageDataRef.current = {};
    setFlowStep("waiting_for_meta");

    const redirectUri = typeof window !== "undefined"
      ? window.location.origin
      : "";

    // 60-second safety timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setFlowStep("failed");

      console.warn("[EmbeddedSignup][TIMEOUT]", {
        elapsed_ms: 60000,
        captured_waba_id: Boolean(messageDataRef.current.waba_id),
        captured_phone_number_id: Boolean(messageDataRef.current.phone_number_id),
        current_step: messageDataRef.current.current_step,
      });

      const message = locale === "ar"
        ? "انتهت مهلة الانتظار أو حظر المتصفح النافذة المنبثقة. تأكد من السماح بالـ Popup والمحاولة مجدداً."
        : "Timeout reached or popup was blocked. Please allow popups and retry.";
      setError(message);
      toast.error(message);
    }, 60000);

    // Official Meta Embedded Signup configuration
    window.FB.login(
      (response: any) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        console.log("[EmbeddedSignup][FB_CALLBACK]", {
          status: response?.status,
          has_authResponse: Boolean(response?.authResponse),
          has_code: Boolean(response?.authResponse?.code),
          authResponse_is_null: response?.authResponse === null,
        });

        const code: string | undefined = response?.authResponse?.code;

        if (!code) {
          setFlowStep("failed");
          console.warn("[EmbeddedSignup] FB.login callback returned without authorization code:", response);

          const message = response?.status === "unknown"
            ? (locale === "ar"
              ? "لم تتمكن المنصة من استلام Authorization Code من Meta. ده غالباً بسبب منع المتصفح لـ Third-Party Cookies (شائع في Chrome/Brave/Edge). اسمح بالـ Cookies أو جرّب من متصفح آخر."
              : "Could not receive Authorization Code from Meta. This is usually caused by third-party cookie restrictions in your browser. Please allow cookies or try a different browser.")
            : (locale === "ar"
              ? "Meta ألغت الربط أو لم تكتمل العملية. تأكد من اكتمال الخطوات داخل نافذة Meta."
              : "Meta cancelled or the flow was incomplete. Ensure all steps are completed in the Meta window.");

          setError(message);
          toast.error(message);
          return;
        }

        setFlowStep("received_auth_code");
        // Proceed directly with authorization code to backend
        completeSignupOnBackend(code, redirectUri);
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          sessionInfoVersion: "3",
        },
      },
    );
  };

  /* ── Render ───────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={launchSignup}
        disabled={!sdkReady || isLoading}
        className="w-full gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {flowStep === "sending_to_backend"
              ? (locale === "ar" ? "جاري الحفظ والربط..." : "Saving and connecting...")
              : (locale === "ar" ? "جاري الربط..." : "Connecting...")}
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            {locale === "ar" ? "ربط Meta تلقائياً" : "Connect Meta Automatically"}
          </>
        )}
      </Button>

      {error && (
        <p className="text-xs leading-5 text-red-500">
          {error}
        </p>
      )}

      {isLoading && (
        <button
          onClick={() => {
            setFlowStep("idle");
            setError(null);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }}
          className="w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition py-1"
        >
          {locale === "ar" ? "إلغاء الربط" : "Cancel"}
        </button>
      )}
    </div>
  );
}