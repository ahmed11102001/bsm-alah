"use client";

// src/components/dashboard/PushNotificationPrompt.tsx
// ─── بانر ذكي لطلب إذن إشعارات الجهاز ──────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { Bell, X, Smartphone, CheckCircle } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { syncPushSubscriptionOnLogin, urlBase64ToUint8Array } from "@/lib/push-client";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// حالات البانر
type PromptState = "loading" | "show" | "subscribing" | "done" | "denied" | "hidden" | "unsupported";

export default function PushNotificationPrompt() {
  const { locale, dir } = useLanguage();
  const isAr = locale === "ar";
  const [state, setState] = useState<PromptState>("loading");

  useEffect(() => {
    // تحقق من دعم المتصفح
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    if (!VAPID_KEY) {
      setState("hidden");
      return;
    }

    // لو الإذن ممنوح بالفعل: نقوم بمزامنة الاشتراك تلقائيًا لربطه بالمستخدم الحالي
    if (Notification.permission === "granted") {
      syncPushSubscriptionOnLogin();
      setState("hidden"); // خلاص مش محتاج يظهر
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    // لو اختار يتجاهل البانر — نخزن في localStorage
    const dismissed = localStorage.getItem("push_prompt_dismissed");
    if (dismissed) {
      const diff = Date.now() - parseInt(dismissed, 10);
      // اعرضله تاني بعد 7 أيام
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        setState("hidden");
        return;
      }
    }

    setState("show");
  }, []);

  const subscribe = useCallback(async () => {
    setState("subscribing");
    try {
      // 1. سجّل الـ Service Worker
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // 2. اطلب الإذن
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "show");
        return;
      }

      // 3. اعمل subscribe
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as any,
      });

      const json = sub.toJSON();

      // 4. ابعت للسيرفر
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });

      if (res.ok) {
        setState("done");
        // اختفاء بعد 3 ثواني
        setTimeout(() => setState("hidden"), 3000);
      } else {
        console.error("[PUSH] Subscribe API failed:", await res.text());
        setState("show");
      }
    } catch (err) {
      console.error("[PUSH] Subscribe error:", err);
      setState("show");
    }
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem("push_prompt_dismissed", Date.now().toString());
    setState("hidden");
  }, []);

  // لا تعرض حاجة في الحالات دي
  if (state === "loading" || state === "hidden" || state === "unsupported") return null;

  if (state === "done") {
    return (
      <div dir={dir} className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <p className="text-sm font-medium text-green-800 dark:text-green-200">
          {isAr
            ? "تم تفعيل إشعارات الجهاز بنجاح! ✅ هتوصلك الإشعارات المهمة حتى لو التطبيق مغلق."
            : "Device notifications enabled successfully! ✅ You will receive important alerts even when the app is closed."}
        </p>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div dir={dir} className="mb-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {isAr ? "إشعارات الجهاز معطّلة" : "Device Notifications Disabled"}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
            {isAr
              ? "فعّل الإشعارات من إعدادات المتصفح → الموقع ده → الإشعارات → سماح"
              : "Enable notifications in browser settings → Site permissions → Notifications → Allow"}
          </p>
        </div>
        <button onClick={() => setState("hidden")} className="text-amber-400 hover:text-amber-600 p-1 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div dir={dir} className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/15 dark:to-indigo-900/15 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
        <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {isAr ? "🔔 فعّل إشعارات الجهاز" : "🔔 Enable Device Notifications"}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
          {isAr
            ? "هتوصلك تنبيهات مهمة زي: انتهاء الباقة، فشل الدفع، أو تحذيرات التوكن — حتى لو مش فاتح التطبيق."
            : "Get critical alerts like plan expiration, payment failures, or token warnings — even when the app is closed."}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={subscribe}
            disabled={state === "subscribing"}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all active:scale-[.97] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
          >
            {state === "subscribing" ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isAr ? "جاري التفعيل..." : "Enabling..."}
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5" />
                {isAr ? "فعّل الإشعارات" : "Enable Notifications"}
              </>
            )}
          </button>
          <button
            onClick={dismiss}
            className="px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            {isAr ? "لاحقاً" : "Later"}
          </button>
        </div>
      </div>
      <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
