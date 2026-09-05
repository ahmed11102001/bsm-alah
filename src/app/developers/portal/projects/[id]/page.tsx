"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Key,
  FileText,
  Wifi,
  WifiOff,
  Share2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useLanguage } from "../../../_components/LanguageProvider";
import { useDevPath } from "@/lib/dev-links";
import { GRAPH_API_VERSION } from "@/lib/meta-graph";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  metaConnection: {
    id: string;
    wabaId: string;
    phoneNumberId: string;
    displayPhone: string;
    isVerified: boolean;
    connectedAt: string;
  } | null;
  _count: {
    apiKeys: number;
    otpTemplates: number;
  };
  otpToday: number;
  viewerRole?: "owner" | "developer";
}

interface ApiKeyPreview {
  id: string;
  keyPrefix: string;
  name: string | null;
  status: "ACTIVE" | "REVOKED";
  createdAt: string;
}

interface TemplatePreview {
  id: string;
  name: string;
  status: string;
  language: string;
}

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params.id as string;

  const { language, t } = useLanguage();
  const devPath = useDevPath();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [keys, setKeys] = useState<ApiKeyPreview[]>([]);
  const [templates, setTemplates] = useState<TemplatePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // Meta connect form
  const [showMetaForm, setShowMetaForm] = useState(false);
  const [metaForm, setMetaForm] = useState({
    accessToken: "",
    phoneNumberId: "",
    wabaId: "",
    displayPhone: "",
  });
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState("");

  // ── Embedded Signup test state ───────────────────────────────────────────
  const [embeddedSdkReady, setEmbeddedSdkReady] = useState(false);
  const [embeddedLoading, setEmbeddedLoading] = useState(false);
  const [embeddedError, setEmbeddedError] = useState("");
  const [embeddedStep, setEmbeddedStep] = useState<
    "idle" | "waiting" | "received_event" | "received_code" | "saving" | "failed" | "connected"
  >("idle");

  const embeddedDataRef = useRef<{
    phone_number_id?: string;
    waba_id?: string;
    current_step?: string;
  }>({});

  const embeddedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchAll();
  }, [projectId]);

  // ── Load Facebook JS SDK for Embedded Signup test ────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.FB) {
      setEmbeddedSdkReady(true);
      return;
    }

    const existing = document.getElementById("facebook-jssdk");

    if (existing) {
      window.fbAsyncInit = () => {
        if (window.FB) {
          window.FB.init({
            appId: process.env.NEXT_PUBLIC_META_APP_ID!,
            autoLogAppEvents: true,
            xfbml: false,
            version: GRAPH_API_VERSION,
          });
          setEmbeddedSdkReady(true);
        }
      };

      if (window.FB) {
        setEmbeddedSdkReady(true);
      }

      return;
    }

    window.fbAsyncInit = () => {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID!,
        autoLogAppEvents: true,
        xfbml: false,
        version: GRAPH_API_VERSION,
      });

      console.log("[DeveloperPortal][EmbeddedSignup][SDK_READY]", {
        app_id_present: Boolean(process.env.NEXT_PUBLIC_META_APP_ID),
        graph_version: GRAPH_API_VERSION,
      });

      setEmbeddedSdkReady(true);
    };

    const js = document.createElement("script");
    js.id = "facebook-jssdk";
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    js.async = true;
    js.defer = true;
    js.crossOrigin = "anonymous";

    document.body.appendChild(js);
  }, []);

  // ── Receive WA_EMBEDDED_SIGNUP events from Meta ──────────────────────────
  const handleEmbeddedMessage = useCallback((event: MessageEvent) => {
    const isFacebookOrigin =
      typeof event.origin === "string" &&
      (event.origin.endsWith("facebook.com") ||
        event.origin.endsWith("fb.com"));

    if (!isFacebookOrigin) return;

    try {
      const data =
        typeof event.data === "string"
          ? JSON.parse(event.data)
          : event.data;

      if (data?.type !== "WA_EMBEDDED_SIGNUP") return;

      const payload = data?.data ?? {};

      console.log("[DeveloperPortal][EmbeddedSignup][WA_EVENT]", {
        origin: event.origin,
        event: data?.event,
        current_step: payload?.current_step,
        has_waba_id: Boolean(payload?.waba_id),
        has_phone_number_id: Boolean(payload?.phone_number_id),
      });

      if (payload.phone_number_id) {
        embeddedDataRef.current.phone_number_id =
          payload.phone_number_id;
      }

      if (payload.waba_id) {
        embeddedDataRef.current.waba_id = payload.waba_id;
      }

      if (payload.current_step) {
        embeddedDataRef.current.current_step = payload.current_step;
      }

      if (data?.event === "FINISH") {
        console.log("[DeveloperPortal][EmbeddedSignup][FINISH]", {
          has_waba_id: Boolean(payload?.waba_id),
          has_phone_number_id: Boolean(payload?.phone_number_id),
          current_step: payload?.current_step,
        });
      }

      setEmbeddedStep((previous) =>
        previous === "waiting" || previous === "idle"
          ? "received_event"
          : previous
      );
    } catch {
      // Ignore unrelated/non-JSON messages.
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleEmbeddedMessage);

    return () => {
      window.removeEventListener("message", handleEmbeddedMessage);

      if (embeddedTimeoutRef.current) {
        clearTimeout(embeddedTimeoutRef.current);
      }
    };
  }, [handleEmbeddedMessage]);

  async function fetchAll() {
    setLoading(true);

    try {
      const [projRes, keysRes, tmplRes] = await Promise.all([
        fetch(`/api/developers/projects/${projectId}`),
        fetch(`/api/developers/projects/${projectId}/api-keys`),
        fetch(`/api/developers/projects/${projectId}/otp-templates`),
      ]);

      if (projRes.ok) {
        setProject(await projRes.json().then((d) => d.project));
      }

      if (keysRes.ok) {
        setKeys((await keysRes.json()).keys?.slice(0, 3) || []);
      }

      if (tmplRes.ok) {
        setTemplates(
          (await tmplRes.json()).templates?.slice(0, 3) || []
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function connectMeta() {
    setMetaLoading(true);
    setMetaError("");

    try {
      const res = await fetch(
        `/api/developers/projects/${projectId}/meta`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metaForm),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMetaError(
          data.error || t("An error occurred", "حصل خطأ")
        );
        return;
      }

      setShowMetaForm(false);
      fetchAll();
    } catch {
      setMetaError(
        t(
          "An error occurred, try again",
          "حصل خطأ، حاول تاني"
        )
      );
    } finally {
      setMetaLoading(false);
    }
  }

  // ── Embedded Signup → Developer Portal backend ───────────────────────────
  async function completeEmbeddedSignup(code: string) {
    setEmbeddedStep("saving");

    const redirectUri =
      typeof window !== "undefined"
        ? window.location.origin
        : "";

    console.log(
      "[DeveloperPortal][EmbeddedSignup][BACKEND_REQUEST]",
      {
        endpoint: `/api/developers/projects/${projectId}/meta/embedded-signup-complete`,
        has_code: Boolean(code),
        code_length: code.length,
        redirect_uri: redirectUri,
        has_waba_id: Boolean(
          embeddedDataRef.current.waba_id
        ),
        has_phone_number_id: Boolean(
          embeddedDataRef.current.phone_number_id
        ),
      }
    );

    try {
      const res = await fetch(
        `/api/developers/projects/${projectId}/meta/embedded-signup-complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            redirect_uri: redirectUri,
            phone_number_id:
              embeddedDataRef.current.phone_number_id,
            waba_id: embeddedDataRef.current.waba_id,
          }),
        }
      );

      const data = await res.json();

      console.log(
        "[DeveloperPortal][EmbeddedSignup][BACKEND_RESPONSE]",
        {
          status: res.status,
          ok: res.ok,
          has_error: Boolean(data?.error),
          has_waba_id: Boolean(data?.waba_id),
          has_phone_number_id: Boolean(
            data?.phone_number_id
          ),
        }
      );

      if (!res.ok) {
        const message =
          data?.error ||
          t(
            "فشل إكمال ربط Meta",
            "Failed to complete Meta connection"
          );

        setEmbeddedError(message);
        setEmbeddedStep("failed");
        setEmbeddedLoading(false);
        return;
      }

      setEmbeddedError("");
      setEmbeddedStep("connected");
      setEmbeddedLoading(false);

      await fetchAll();
    } catch (error) {
      console.error(
        "[DeveloperPortal][EmbeddedSignup][BACKEND_ERROR]",
        error
      );

      setEmbeddedError(
        t(
          "حصل خطأ أثناء الاتصال بالسيرفر",
          "Server connection error"
        )
      );

      setEmbeddedStep("failed");
      setEmbeddedLoading(false);
    }
  }

  // ── Launch Embedded Signup test ──────────────────────────────────────────
  function launchEmbeddedSignup() {
    const configId =
      process.env.NEXT_PUBLIC_META_CONFIG_ID;

    const redirectUri =
      typeof window !== "undefined"
        ? window.location.origin
        : "";

    console.log(
      "[DeveloperPortal][EmbeddedSignup][LAUNCH]",
      {
        config_id_present: Boolean(configId),
        response_type: "code",
        sessionInfoVersion: "3",
        redirect_origin: redirectUri,
        sdk_ready: embeddedSdkReady,
        fb_present: Boolean(
          typeof window !== "undefined" && window.FB
        ),
      }
    );

    if (!configId) {
      const message = t(
        "NEXT_PUBLIC_META_CONFIG_ID مش موجود",
        "NEXT_PUBLIC_META_CONFIG_ID is missing"
      );

      setEmbeddedError(message);
      setEmbeddedStep("failed");
      return;
    }

    if (!embeddedSdkReady || !window.FB) {
      const message = t(
        "Facebook SDK لسه مش جاهز — حاول تاني",
        "Facebook SDK is not ready yet — try again"
      );

      setEmbeddedError(message);
      setEmbeddedStep("failed");
      return;
    }

    embeddedDataRef.current = {};
    setEmbeddedError("");
    setEmbeddedLoading(true);
    setEmbeddedStep("waiting");

    if (embeddedTimeoutRef.current) {
      clearTimeout(embeddedTimeoutRef.current);
    }

    embeddedTimeoutRef.current = setTimeout(() => {
      console.warn(
        "[DeveloperPortal][EmbeddedSignup][TIMEOUT]",
        {
          step: embeddedStep,
          captured_waba_id: Boolean(
            embeddedDataRef.current.waba_id
          ),
          captured_phone_number_id: Boolean(
            embeddedDataRef.current.phone_number_id
          ),
        }
      );

      setEmbeddedLoading(false);
      setEmbeddedStep("failed");

      setEmbeddedError(
        t(
          "انتهت مهلة انتظار Meta. راجع الـConsole لمعرفة آخر مرحلة وصل لها الفلو.",
          "Meta signup timed out. Check the console for the last flow stage."
        )
      );
    }, 60000);

    window.FB.login(
      (response: any) => {
        console.log(
          "[DeveloperPortal][EmbeddedSignup][FB_CALLBACK]",
          {
            status: response?.status,
            has_authResponse: Boolean(
              response?.authResponse
            ),
            authResponse_is_null:
              response?.authResponse === null,
            has_code: Boolean(
              response?.authResponse?.code
            ),
          }
        );

        const code =
          response?.authResponse?.code;

        if (!code) {
          if (embeddedTimeoutRef.current) {
            clearTimeout(embeddedTimeoutRef.current);
          }

          console.warn(
            "[DeveloperPortal][EmbeddedSignup][NO_CODE]",
            {
              status: response?.status,
              authResponse: response?.authResponse,
              captured_waba_id: Boolean(
                embeddedDataRef.current.waba_id
              ),
              captured_phone_number_id: Boolean(
                embeddedDataRef.current.phone_number_id
              ),
            }
          );

          setEmbeddedLoading(false);
          setEmbeddedStep("failed");

          setEmbeddedError(
            t(
              "Meta قفلت الفلو بدون Authorization Code. راجع الـConsole — ده الاختبار اللي بنعمله دلوقتي.",
              "Meta closed the flow without an Authorization Code. Check the console — this is exactly what we are testing."
            )
          );

          return;
        }

        if (embeddedTimeoutRef.current) {
          clearTimeout(embeddedTimeoutRef.current);
        }

        console.log(
          "[DeveloperPortal][EmbeddedSignup][CODE_RECEIVED]",
          {
            code_length: code.length,
            has_waba_id: Boolean(
              embeddedDataRef.current.waba_id
            ),
            has_phone_number_id: Boolean(
              embeddedDataRef.current.phone_number_id
            ),
          }
        );

        setEmbeddedStep("received_code");

        void completeEmbeddedSignup(code);
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          sessionInfoVersion: "3",
        },
      }
    );
  }

  async function disconnectMeta() {
    if (
      !confirm(
        t(
          "You are about to disconnect Meta from this project — are you sure?",
          "هتقطع ربط Meta من المشروع ده — متأكد؟"
        )
      )
    ) {
      return;
    }

    await fetch(
      `/api/developers/projects/${projectId}/meta`,
      { method: "DELETE" }
    );

    fetchAll();
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  const statusColor: Record<string, string> = {
    APPROVED: "#20d378",
    PENDING: "#f59e0b",
    REJECTED: "#ef4444",
    LOCAL_DRAFT: "rgba(255,255,255,0.3)",
    DISABLED: "rgba(255,255,255,0.2)",
  };

  const statusLabel: Record<string, string> = {
    APPROVED: t("Approved", "موافق عليه"),
    PENDING: t("Pending", "قيد المراجعة"),
    REJECTED: t("Rejected", "مرفوض"),
    LOCAL_DRAFT: t("Draft", "مسودة"),
    DISABLED: t("Disabled", "معطل"),
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          color: "rgba(255,255,255,0.3)",
          fontFamily: "IBM Plex Sans Arabic, sans-serif",
          direction:
            language === "ar" ? "rtl" : "ltr",
        }}
      >
        {t("Loading...", "جاري التحميل...")}
      </div>
    );
  }

  if (!project) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          color: "rgba(255,255,255,0.3)",
          fontFamily: "IBM Plex Sans Arabic, sans-serif",
          direction:
            language === "ar" ? "rtl" : "ltr",
        }}
      >
        {t(
          "Project not found",
          "المشروع مش موجود"
        )}
      </div>
    );
  }

  const metaConnected = !!project.metaConnection;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');

        .pov-root {
          max-width: 1000px; margin: 0 auto;
          padding: 36px 28px;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          direction: ${language === "ar" ? "rtl" : "ltr"}; color: #fff;
        }

        .pov-header { margin-bottom: 28px; }
        .pov-title { font-size: 22px; font-weight: 600; color: #fff; margin-bottom: 4px; }
        .pov-sub { font-size: 13px; color: rgba(255,255,255,0.4); }

        .pov-stats {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
          margin-bottom: 28px;
        }

        .stat-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 18px 20px;
        }

        .stat-label {
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 30px;
          font-weight: 600;
          color: #fff;
        }

        .stat-value.green { color: #20d378; }

        .pov-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        @media (max-width: 700px) {
          .pov-grid { grid-template-columns: 1fr; }
        }

        .pov-section {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 20px;
        }

        .pov-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .pov-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          color: rgba(255,255,255,0.7);
        }

        .pov-section-link {
          font-size: 12px;
          color: rgba(32,211,120,0.7);
          text-decoration: none;
        }

        .pov-section-link:hover { color: #20d378; }

        .key-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-family: 'Fira Code', monospace;
        }

        .key-row:last-child { border-bottom: none; }

        .key-prefix {
          font-size: 12px;
          color: #20d378;
          flex: 1;
        }

        .key-name {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          font-family: inherit;
        }

        .copy-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.3);
          padding: 4px;
          border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }

        .copy-btn:hover {
          color: #20d378;
          background: rgba(32,211,120,0.08);
        }

        .tmpl-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .tmpl-row:last-child { border-bottom: none; }

        .tmpl-name {
          font-size: 13px;
          color: rgba(255,255,255,0.7);
          font-family: 'Fira Code', monospace;
        }

        .tmpl-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 20px;
        }

        .empty-row {
          font-size: 13px;
          color: rgba(255,255,255,0.25);
          padding: 16px 0;
          text-align: center;
        }

        .meta-section {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .meta-connected-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .meta-connected-row:last-child {
          border-bottom: none;
        }

        .meta-field-label {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          margin-bottom: 2px;
        }

        .meta-field-value {
          font-size: 13px;
          color: rgba(255,255,255,0.7);
          font-family: 'Fira Code', monospace;
        }

        .btn-connect-meta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 18px;
          background: rgba(32,211,120,0.08);
          border: 1px solid rgba(32,211,120,0.2);
          border-radius: 10px;
          color: #20d378;
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-connect-meta:hover {
          background: rgba(32,211,120,0.14);
        }

        .btn-connect-meta:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .embedded-test-status {
          margin-top: 10px;
          padding: 9px 12px;
          border-radius: 9px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.45);
          font-size: 11px;
          font-family: 'Fira Code', monospace;
        }

        .embedded-test-error {
          margin-top: 10px;
          padding: 9px 12px;
          border-radius: 9px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #f87171;
          font-size: 12px;
        }

        .btn-disconnect {
          padding: 6px 14px;
          border-radius: 8px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: rgba(239,68,68,0.7);
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
          font-family: inherit;
        }

        .btn-disconnect:hover {
          background: rgba(239,68,68,0.15);
        }

        .meta-form { margin-top: 16px; }

        .form-field { margin-bottom: 14px; }

        .form-label {
          display: block;
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          margin-bottom: 6px;
        }

        .form-input {
          width: 100%;
          padding: 10px 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #fff;
          font-size: 13px;
          font-family: 'Fira Code', monospace;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }

        .form-input::placeholder {
          color: rgba(255,255,255,0.2);
        }

        .form-input:focus {
          border-color: rgba(32,211,120,0.4);
        }

        .form-error {
          font-size: 12px;
          color: #f87171;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px;
          padding: 8px 12px;
          margin-bottom: 12px;
        }

        .form-actions {
          display: flex;
          gap: 8px;
        }

        .btn-submit {
          flex: 1;
          padding: 10px;
          background: #20d378;
          color: #060810;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-cancel-form {
          padding: 10px 18px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: rgba(255,255,255,0.5);
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-cancel-form:hover {
          background: rgba(255,255,255,0.08);
        }

        .btn-connect-meta-manual {
          display: block;
          margin-top: 10px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.35);
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
          padding: 4px 0;
          transition: color 0.2s;
        }

        .btn-connect-meta-manual:hover {
          color: rgba(255,255,255,0.6);
        }

        .transfer-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(32,211,120,0.05);
          border: 1px solid rgba(32,211,120,0.12);
          border-radius: 14px;
          padding: 16px 20px;
        }

        .transfer-banner-text {
          font-size: 13px;
          color: rgba(255,255,255,0.6);
        }

        .transfer-banner-title {
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 4px;
        }

        .btn-transfer {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 16px;
          background: rgba(32,211,120,0.1);
          border: 1px solid rgba(32,211,120,0.2);
          border-radius: 10px;
          color: #20d378;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.2s;
        }

        .btn-transfer:hover {
          background: rgba(32,211,120,0.15);
        }
      `}</style>

      <div className="pov-root">
        <div
          className="pov-header"
          style={{
            textAlign:
              language === "ar" ? "right" : "left",
          }}
        >
          <h1 className="pov-title">
            {t("Overview — ", "نظرة عامة — ")}
            {project.name}
          </h1>

          <p className="pov-sub">
            {t(
              "All of this data is specific to this project only",
              "كل البيانات دي خاصة بالمشروع ده بس"
            )}
          </p>
        </div>

        <div className="pov-stats">
          <div
            className="stat-card"
            style={{
              textAlign:
                language === "ar" ? "right" : "left",
            }}
          >
            <div className="stat-label">
              {t("Active API Keys", "API Keys نشطة")}
            </div>
            <div className="stat-value green">
              {project._count.apiKeys}
            </div>
          </div>

          <div
            className="stat-card"
            style={{
              textAlign:
                language === "ar" ? "right" : "left",
            }}
          >
            <div className="stat-label">
              {t(
                "Approved Templates",
                "قوالب موافق عليها"
              )}
            </div>
            <div className="stat-value">
              {project._count.otpTemplates}
            </div>
          </div>

          <div
            className="stat-card"
            style={{
              textAlign:
                language === "ar" ? "right" : "left",
            }}
          >
            <div className="stat-label">
              {t("OTP Today", "OTP اليوم")}
            </div>
            <div className="stat-value">
              {project.otpToday}
            </div>
          </div>
        </div>

        <div className="pov-grid">
          <div className="pov-section">
            <div
              className="pov-section-header"
              style={{
                flexDirection:
                  language === "ar"
                    ? "row"
                    : "row-reverse",
              }}
            >
              <span className="pov-section-title">
                <Key size={14} />
                API Keys
              </span>

              <Link
                href={devPath(`/portal/projects/${projectId}/api-keys`)}
                className="pov-section-link"
              >
                {t("View All ←", "عرض الكل ←")}
              </Link>
            </div>

            {keys.length === 0 ? (
              <div className="empty-row">
                {t(
                  "No API Keys — create one now",
                  "لا توجد API Keys — أنشئ واحد الآن"
                )}
              </div>
            ) : (
              keys.map((k) => (
                <div
                  key={k.id}
                  className="key-row"
                  style={{
                    flexDirection:
                      language === "ar"
                        ? "row"
                        : "row-reverse",
                  }}
                >
                  <span className="key-prefix">
                    {k.keyPrefix}...
                  </span>

                  {k.name && (
                    <span className="key-name">
                      {k.name}
                    </span>
                  )}

                  <button
                    className="copy-btn"
                    onClick={() =>
                      copyText(k.keyPrefix, k.id)
                    }
                    title={t(
                      "Copy prefix",
                      "نسخ الـ prefix"
                    )}
                  >
                    {copied === k.id ? (
                      <Check size={12} />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="pov-section">
            <div
              className="pov-section-header"
              style={{
                flexDirection:
                  language === "ar"
                    ? "row"
                    : "row-reverse",
              }}
            >
              <span className="pov-section-title">
                <FileText size={14} />
                {t("Templates", "القوالب")}
              </span>

              <Link
                href={devPath(`/portal/projects/${projectId}/otp-templates`)}
                className="pov-section-link"
              >
                {t("View All ←", "عرض الكل ←")}
              </Link>
            </div>

            {templates.length === 0 ? (
              <div className="empty-row">
                {t(
                  "No templates — create an OTP template now",
                  "لا توجد قوالب — أنشئ قالب OTP الآن"
                )}
              </div>
            ) : (
              templates.map((tData) => (
                <div
                  key={tData.id}
                  className="tmpl-row"
                  style={{
                    flexDirection:
                      language === "ar"
                        ? "row"
                        : "row-reverse",
                  }}
                >
                  <span className="tmpl-name">
                    {tData.name}
                  </span>

                  <span
                    className="tmpl-badge"
                    style={{
                      color:
                        statusColor[tData.status] ||
                        "rgba(255,255,255,0.3)",
                      background:
                        `${
                          statusColor[tData.status]
                        }18` ||
                        "rgba(255,255,255,0.05)",
                      border:
                        `1px solid ${
                          statusColor[tData.status]
                        }30` ||
                        "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {statusLabel[tData.status] ||
                      tData.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Meta Connection */}
        <div className="meta-section">
          <div
            className="pov-section-header"
            style={{
              flexDirection:
                language === "ar"
                  ? "row"
                  : "row-reverse",
            }}
          >
            <span
              className="pov-section-title"
              style={{ fontSize: 15 }}
            >
              {metaConnected ? (
                <Wifi
                  size={15}
                  style={{ color: "#20d378" }}
                />
              ) : (
                <WifiOff
                  size={15}
                  style={{ color: "#f59e0b" }}
                />
              )}

              {t(
                "Meta WhatsApp Connection",
                "ربط Meta WhatsApp"
              )}
            </span>

            {metaConnected && (
              <button
                className="btn-disconnect"
                onClick={disconnectMeta}
              >
                {t("Disconnect", "قطع الاتصال")}
              </button>
            )}
          </div>

          {metaConnected && project.metaConnection ? (
            <>
              <div
                className="meta-connected-row"
                style={{
                  flexDirection:
                    language === "ar"
                      ? "row"
                      : "row-reverse",
                }}
              >
                <div
                  style={{
                    textAlign:
                      language === "ar"
                        ? "right"
                        : "left",
                  }}
                >
                  <div className="meta-field-label">
                    WABA ID
                  </div>
                  <div className="meta-field-value">
                    {project.metaConnection.wabaId}
                  </div>
                </div>

                <button
                  className="copy-btn"
                  onClick={() =>
                    copyText(
                      project.metaConnection!.wabaId,
                      "waba"
                    )
                  }
                >
                  {copied === "waba" ? (
                    <Check size={12} />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>

              <div
                className="meta-connected-row"
                style={{
                  flexDirection:
                    language === "ar"
                      ? "row"
                      : "row-reverse",
                }}
              >
                <div
                  style={{
                    textAlign:
                      language === "ar"
                        ? "right"
                        : "left",
                  }}
                >
                  <div className="meta-field-label">
                    Phone Number ID
                  </div>

                  <div className="meta-field-value">
                    {
                      project.metaConnection
                        .phoneNumberId
                    }
                  </div>
                </div>

                <button
                  className="copy-btn"
                  onClick={() =>
                    copyText(
                      project.metaConnection!
                        .phoneNumberId,
                      "phone_id"
                    )
                  }
                >
                  {copied === "phone_id" ? (
                    <Check size={12} />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>

              {project.metaConnection.displayPhone && (
                <div
                  className="meta-connected-row"
                  style={{
                    flexDirection:
                      language === "ar"
                        ? "row"
                        : "row-reverse",
                  }}
                >
                  <div
                    style={{
                      textAlign:
                        language === "ar"
                          ? "right"
                          : "left",
                    }}
                  >
                    <div className="meta-field-label">
                      {t(
                        "Phone Number",
                        "رقم الهاتف"
                      )}
                    </div>

                    <div className="meta-field-value">
                      {
                        project.metaConnection
                          .displayPhone
                      }
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : !showMetaForm ? (
            <div
              className="meta-connect-options"
              style={{
                textAlign:
                  language === "ar"
                    ? "right"
                    : "left",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "rgba(245,158,11,0.8)",
                  flexDirection:
                    language === "ar"
                      ? "row"
                      : "row-reverse",
                  marginBottom: 14,
                }}
              >
                <AlertTriangle size={14} />

                {t(
                  "This project is not connected to Meta — it won't be able to send OTPs",
                  "المشروع ده مش مربوط بـ Meta — مش هيقدر يرسل OTP"
                )}
              </div>

              {/* ── Embedded Signup TEST BUTTON ─────────────────────── */}
              <button
                className="btn-connect-meta"
                onClick={launchEmbeddedSignup}
                disabled={
                  embeddedLoading ||
                  !embeddedSdkReady
                }
              >
                {embeddedLoading ? (
                  <Loader2
                    size={15}
                    style={{
                      animation:
                        "spin 1s linear infinite",
                    }}
                  />
                ) : (
                  <Wifi size={15} />
                )}

                {embeddedLoading
                  ? t(
                      "جاري فتح Meta...",
                      "Opening Meta..."
                    )
                  : !embeddedSdkReady
                    ? t(
                        "جاري تحميل Meta...",
                        "Loading Meta..."
                      )
                    : t(
                        "ربط Meta تلقائيًا",
                        "Connect Meta automatically"
                      )}
              </button>

              <div className="embedded-test-status">
                {t(
                  `Embedded Signup test — SDK: ${
                    embeddedSdkReady
                      ? "READY"
                      : "LOADING"
                  } — Step: ${embeddedStep}`,
                  `اختبار Embedded Signup — SDK: ${
                    embeddedSdkReady
                      ? "READY"
                      : "LOADING"
                  } — المرحلة: ${embeddedStep}`
                )}
              </div>

              {embeddedError && (
                <div className="embedded-test-error">
                  {embeddedError}
                </div>
              )}

              {/* Manual connection stays below the test button */}
              <button
                className="btn-connect-meta-manual"
                onClick={() => setShowMetaForm(true)}
              >
                {t(
                  "Or enter details manually",
                  "أو أدخل البيانات يدويًا"
                )}
              </button>
            </div>
          ) : (
            <div
              className="meta-form"
              style={{
                textAlign:
                  language === "ar"
                    ? "right"
                    : "left",
              }}
            >
              {metaError && (
                <div className="form-error">
                  {metaError}
                </div>
              )}

              <div className="form-field">
                <label
                  className="form-label"
                  style={{
                    textAlign:
                      language === "ar"
                        ? "right"
                        : "left",
                  }}
                >
                  Access Token *
                </label>

                <input
                  className="form-input"
                  type="password"
                  placeholder="EAAxxxxxxxxxxxxxxx..."
                  value={metaForm.accessToken}
                  onChange={(e) =>
                    setMetaForm((f) => ({
                      ...f,
                      accessToken: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-field">
                <label
                  className="form-label"
                  style={{
                    textAlign:
                      language === "ar"
                        ? "right"
                        : "left",
                  }}
                >
                  WABA ID *
                </label>

                <input
                  className="form-input"
                  placeholder="123456789012345"
                  value={metaForm.wabaId}
                  onChange={(e) =>
                    setMetaForm((f) => ({
                      ...f,
                      wabaId: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-field">
                <label
                  className="form-label"
                  style={{
                    textAlign:
                      language === "ar"
                        ? "right"
                        : "left",
                  }}
                >
                  Phone Number ID *
                </label>

                <input
                  className="form-input"
                  placeholder="987654321098765"
                  value={metaForm.phoneNumberId}
                  onChange={(e) =>
                    setMetaForm((f) => ({
                      ...f,
                      phoneNumberId: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-field">
                <label
                  className="form-label"
                  style={{
                    textAlign:
                      language === "ar"
                        ? "right"
                        : "left",
                  }}
                >
                  {t(
                    "Display Phone Number (Optional)",
                    "رقم الهاتف المعروض (اختياري)"
                  )}
                </label>

                <input
                  className="form-input"
                  placeholder="+20 10 xxxx xxxx"
                  value={metaForm.displayPhone}
                  onChange={(e) =>
                    setMetaForm((f) => ({
                      ...f,
                      displayPhone: e.target.value,
                    }))
                  }
                />
              </div>

              <div
                className="form-actions"
                style={{
                  flexDirection:
                    language === "ar"
                      ? "row"
                      : "row-reverse",
                }}
              >
                <button
                  className="btn-cancel-form"
                  onClick={() =>
                    setShowMetaForm(false)
                  }
                >
                  {t("Cancel", "إلغاء")}
                </button>

                <button
                  className="btn-submit"
                  onClick={connectMeta}
                  disabled={metaLoading}
                >
                  {metaLoading
                    ? t(
                        "Connecting...",
                        "جاري الربط..."
                      )
                    : t(
                        "Connect Meta",
                        "ربط Meta"
                      )}
                </button>
              </div>
            </div>
          )}
        </div>

        {project.viewerRole !== "owner" && (
          <div
            className="transfer-banner"
            style={{
              flexDirection:
                language === "ar"
                  ? "row"
                  : "row-reverse",
              textAlign:
                language === "ar"
                  ? "right"
                  : "left",
            }}
          >
            <div>
              <div className="transfer-banner-title">
                {t(
                  "Hand over project to a client",
                  "تسليم المشروع لعميل"
                )}
              </div>

              <div className="transfer-banner-text">
                {t(
                  "After completing the project, hand it over to the client using their email so they can manage it from their account",
                  "بعد خلاص المشروع — سلّمه للعميل بإيميله عشان يتحكم فيه من حسابه"
                )}
              </div>
            </div>

            <Link
              href={devPath(`/portal/projects/${projectId}/transfer`)}
              className="btn-transfer"
            >
              <Share2 size={14} />
              {t(
                "Hand over project",
                "تسليم المشروع"
              )}
            </Link>
          </div>
        )}
      </div>
    </>
  );
}