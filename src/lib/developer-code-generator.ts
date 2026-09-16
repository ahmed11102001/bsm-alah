export type IntegrationOperation = "send" | "verify" | "send-verify" | "status";
export type IntegrationLanguage = "javascript" | "typescript" | "python" | "php" | "curl";

export type QuickStartOperation = "send" | "verify" | "status";

export interface IntegrationCodeOptions {
  operation: IntegrationOperation;
  language: IntegrationLanguage;
  // Framework/runtime id (see LANGUAGE_FRAMEWORKS). Unknown values fall back
  // to the default framework of the language, so only tested generators ship.
  framework: string;
  templateId?: string;
  baseUrl: string;
}

// ─── Language → Framework/Runtime registry ────────────────────────────────
// Only frameworks with a real, tested generator are listed here. The Quick
// Start page renders the framework dropdown exclusively from this registry,
// so an option only appears when it produces verified, production-safe code.
export interface FrameworkOption {
  id: string;
  label: string;
}

export const LANGUAGES: { id: IntegrationLanguage; label: string }[] = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "php", label: "PHP" },
  { id: "curl", label: "cURL" },
];

export const LANGUAGE_FRAMEWORKS: Record<IntegrationLanguage, FrameworkOption[]> = {
  javascript: [
    { id: "node", label: "Node.js" },
    { id: "next", label: "Next.js (App Router)" },
    { id: "react", label: "React (via server endpoint)" },
  ],
  typescript: [
    { id: "node", label: "Node.js" },
    { id: "next", label: "Next.js (App Router)" },
    { id: "react", label: "React (via server endpoint)" },
  ],
  python: [
    { id: "django", label: "Django" },
    { id: "flask", label: "Flask" },
    { id: "fastapi", label: "FastAPI" },
  ],
  php: [
    { id: "laravel", label: "Laravel" },
    { id: "symfony", label: "Symfony" },
  ],
  curl: [{ id: "shell", label: "Shell" }],
};

export function frameworksForLanguage(language: IntegrationLanguage): FrameworkOption[] {
  return LANGUAGE_FRAMEWORKS[language] ?? [];
}

function frameworkLabel(language: IntegrationLanguage, framework: string): string {
  return frameworksForLanguage(language).find((f) => f.id === framework)?.label ?? framework;
}

function normalizeFramework(language: IntegrationLanguage, framework: string): string {
  if (frameworksForLanguage(language).some((f) => f.id === framework)) return framework;
  return frameworksForLanguage(language)[0]?.id ?? framework;
}

// ─── Single source of truth for the OTP HTTP contract ─────────────────────
// Every snippet on the Quick Start page (endpoint line, request/response
// examples, and all generated code below) must derive from this contract so
// an endpoint/parameter change only needs one edit.
export interface OtpApiContract {
  method: "POST" | "GET";
  path: string;
  requestBody: Record<string, unknown> | null;
  responseExample: Record<string, unknown>;
}

export function getOtpApiContract(
  operation: QuickStartOperation,
  templateId?: string
): OtpApiContract {
  if (operation === "send") {
    return {
      method: "POST",
      path: "/send",
      requestBody: {
        phone: "+201234567890",
        templateId: templateId ?? "YOUR_TEMPLATE_ID",
        expiryMinutes: 10,
      },
      responseExample: {
        ok: true,
        token: "otp_abc123…",
        expiresAt: "2026-01-01T00:10:00.000Z",
      },
    };
  }
  if (operation === "verify") {
    return {
      method: "POST",
      path: "/verify",
      requestBody: { token: "TOKEN_FROM_SEND", code: "123456" },
      responseExample: { ok: true, verified: true },
    };
  }
  return {
    method: "GET",
    path: "/status/:token",
    requestBody: null,
    responseExample: { ok: true, status: "verified" },
  };
}

const jsQuote = (value: string) => JSON.stringify(value);

// ═══════════════════════════════════════════════════════════════════════════
// JavaScript / TypeScript
// ═══════════════════════════════════════════════════════════════════════════

function jsNodeCode(options: IntegrationCodeOptions, typed: boolean): string {
  const label = frameworkLabel(options.language, "node");
  const templateId = options.templateId ? jsQuote(options.templateId) : `"YOUR_TEMPLATE_ID"`;
  const type = typed ? ": string" : "";
  const includeSend = options.operation === "send" || options.operation === "send-verify";
  const includeVerify = options.operation === "verify" || options.operation === "send-verify";
  const includeStatus = options.operation === "status";
  const send = includeSend ? `
export async function sendOtp(phone${type}) {
  return getWani().otp.send({ phone, templateId: ${templateId}, expiryMinutes: 10 });
}` : "";
  const verify = includeVerify ? `
export async function verifyOtp(token${type}, code${type}) {
  return getWani().otp.verify({ token, code });
}` : "";
  const status = includeStatus ? `
export async function getOtpStatus(token${type}) {
  return getWani().otp.status(token);
}` : "";
  const flow = options.operation === "send-verify"
    ? `
// Connect to your form:
// const sent = await sendOtp(phone);
// const result = await verifyOtp(String(sent.token), codeEnteredByUser);
`
    : "";
  return `// Wani OTP integration (${label}) — powered by @aiwni/sdk
// npm install @aiwni/sdk
// Keep WANI_API_KEY on your server. Never put it in browser/client code.
import { Wani } from "@aiwni/sdk";

function getWani() {
  const apiKey = process.env.WANI_API_KEY;
  if (!apiKey) throw new Error("WANI_API_KEY is not configured");
  return new Wani({ apiKey });
}
${send}
${verify}
${status}
${flow}`;
}

function jsNextRouteFile(
  options: IntegrationCodeOptions,
  typed: boolean,
  operation: "send" | "verify" | "status"
): string {
  const ext = typed ? "ts" : "js";
  const header = (file: string) => `// ${file} — Wani OTP via Next.js App Router (server-only)
// Powered by @aiwni/sdk (npm install @aiwni/sdk).
// Keep WANI_API_KEY in your server environment. It never reaches the browser.`;
  const imports = `${typed ? "import { NextRequest } from \"next/server\";\n" : ""}import { Wani, WaniError } from "@aiwni/sdk";`;
  const helper = `function getWani() {
  const apiKey = process.env.WANI_API_KEY;
  if (!apiKey) throw new Error("WANI_API_KEY is not configured");
  return new Wani({ apiKey });
}

function waniErrorResponse(err: unknown) {
  if (err instanceof WaniError) {
    return Response.json(
      { ok: false, error: err.message, ...(err.code ? { code: err.code } : {}) },
      { status: err.status ?? 502 },
    );
  }
  return Response.json({ ok: false, error: "Wani request failed" }, { status: 502 });
}`;
  const reqParam = typed ? "request: NextRequest" : "request";
  const unknownDecl = typed ? ": unknown" : "";

  if (operation === "send") {
    const tid = options.templateId ? jsQuote(options.templateId) : `"YOUR_TEMPLATE_ID"`;
    return `${header(`app/api/otp/send/route.${ext}`)}
${imports}

${helper}

export async function POST(${reqParam}) {
  let phone${unknownDecl};
  try {
    ({ phone } = await request.json());
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  if (${typed ? "typeof phone !== \"string\" || phone === \"\"" : "!phone"}) return Response.json({ ok: false, error: "phone is required" }, { status: 400 });
  try {
    const sent = await getWani().otp.send({ phone, templateId: ${tid}, expiryMinutes: 10 });
    return Response.json(sent);
  } catch (err) {
    return waniErrorResponse(err);
  }
}`;
  }
  if (operation === "verify") {
    return `${header(`app/api/otp/verify/route.${ext}`)}
${imports}

${helper}

export async function POST(${reqParam}) {
  let token${unknownDecl}, code${unknownDecl};
  try {
    ({ token, code } = await request.json());
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  if (${typed ? "typeof token !== \"string\" || !token || typeof code !== \"string\" || !code" : "!token || !code"}) return Response.json({ ok: false, error: "token and code are required" }, { status: 400 });
  try {
    const result = await getWani().otp.verify({ token, code });
    return Response.json(result);
  } catch (err) {
    return waniErrorResponse(err);
  }
}`;
  }
  return `${header(`app/api/otp/status/route.${ext}`)}
${imports}

${helper}

export async function GET(${reqParam}) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return Response.json({ ok: false, error: "token is required" }, { status: 400 });
  try {
    const result = await getWani().otp.status(token);
    return Response.json(result);
  } catch (err) {
    return waniErrorResponse(err);
  }
}`;
}

function jsNextCode(options: IntegrationCodeOptions, typed: boolean): string {
  const label = frameworkLabel(options.language, "next");
  const parts: string[] = [`// Wani OTP integration (${label})`];
  if (options.operation === "send" || options.operation === "send-verify") {
    parts.push(jsNextRouteFile(options, typed, "send"));
  }
  if (options.operation === "verify" || options.operation === "send-verify") {
    parts.push(jsNextRouteFile(options, typed, "verify"));
  }
  if (options.operation === "status") {
    parts.push(jsNextRouteFile(options, typed, "status"));
  }
  return parts.join("\n\n");
}

function jsReactCode(options: IntegrationCodeOptions, typed: boolean): string {
  const label = frameworkLabel(options.language, "react");
  const formEvent = typed ? "(event: React.FormEvent)" : "(event)";
  const strState = (initial: string) => typed ? `useState<string>(${jsQuote(initial)})` : `useState(${jsQuote(initial)})`;
  const statusState = typed ? "useState<string | null>(null)" : "useState(null)";
  const head = `// Wani OTP (${label}) — client component
// Never put WANI_API_KEY here. This component calls YOUR server endpoints
// (/api/otp/send, /api/otp/verify, /api/otp/status), which forward to Wani
// with the server-side key. See the Node.js / Next.js tab for the server half.
import { useState } from "react";`;

  if (options.operation === "send") {
    return `${head}

export function SendOtpForm() {
  const [phone, setPhone] = ${strState("")};
  const [status, setStatus] = ${statusState};

  async function sendOtp${formEvent} {
    event.preventDefault();
    setStatus("sending");
    const response = await fetch("/api/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setStatus("error: " + (data.error ?? "Send failed"));
      return;
    }
    setStatus("sent");
  }

  return (
    <form onSubmit={sendOtp}>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+201234567890" />
      <button type="submit">Send OTP</button>
      {status && <p>{status}</p>}
    </form>
  );
}`;
  }

  if (options.operation === "verify") {
    const tokenProp = typed ? "({ token }: { token: string })" : "({ token })";
    return `${head}

export function VerifyOtpForm${tokenProp} {
  const [code, setCode] = ${strState("")};
  const [status, setStatus] = ${statusState};

  async function verifyOtp${formEvent} {
    event.preventDefault();
    setStatus("verifying");
    const response = await fetch("/api/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, code }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setStatus("error: " + (data.error ?? "Verification failed"));
      return;
    }
    setStatus("verified");
  }

  return (
    <form onSubmit={verifyOtp}>
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" inputMode="numeric" />
      <button type="submit">Verify code</button>
      {status && <p>{status}</p>}
    </form>
  );
}`;
  }

  if (options.operation === "status") {
    return `${head}

export function OtpStatusChecker() {
  const [token, setToken] = ${strState("")};
  const [status, setStatus] = ${statusState};

  async function checkStatus${formEvent} {
    event.preventDefault();
    setStatus("checking");
    const response = await fetch("/api/otp/status?token=" + encodeURIComponent(token));
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setStatus("error: " + (data.error ?? "Status check failed"));
      return;
    }
    setStatus(String(data.status ?? "ok"));
  }

  return (
    <form onSubmit={checkStatus}>
      <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="TOKEN_FROM_SEND" />
      <button type="submit">Check status</button>
      {status && <p>{status}</p>}
    </form>
  );
}`;
  }

  // send-verify: full client flow (send, then verify with the returned token).
  return `${head}

export function OtpFlow() {
  const [phone, setPhone] = ${strState("")};
  const [token, setToken] = ${statusState};
  const [code, setCode] = ${strState("")};
  const [status, setStatus] = ${statusState};

  async function sendOtp${formEvent} {
    event.preventDefault();
    setStatus("sending");
    const response = await fetch("/api/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setStatus("error: " + (data.error ?? "Send failed"));
      return;
    }
    setToken(String(data.token));
    setStatus("sent");
  }

  async function verifyOtp${formEvent} {
    event.preventDefault();
    setStatus("verifying");
    const response = await fetch("/api/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, code }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setStatus("error: " + (data.error ?? "Verification failed"));
      return;
    }
    setStatus("verified");
  }

  return token ? (
    <form onSubmit={verifyOtp}>
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" inputMode="numeric" />
      <button type="submit">Verify code</button>
      {status && <p>{status}</p>}
    </form>
  ) : (
    <form onSubmit={sendOtp}>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+201234567890" />
      <button type="submit">Send OTP</button>
      {status && <p>{status}</p>}
    </form>
  );
}`;
}

function jsCode(options: IntegrationCodeOptions, typed: boolean, framework: string): string {
  if (framework === "next") return jsNextCode(options, typed);
  if (framework === "react") return jsReactCode(options, typed);
  return jsNodeCode(options, typed);
}

// ═══════════════════════════════════════════════════════════════════════════
// Python: Django / Flask / FastAPI
// ═══════════════════════════════════════════════════════════════════════════

function pythonDjangoCode(options: IntegrationCodeOptions): string {
  const label = frameworkLabel(options.language, "django");
  const tid = options.templateId ? jsQuote(options.templateId) : `"YOUR_TEMPLATE_ID"`;
  const includeSend = options.operation === "send" || options.operation === "send-verify";
  const includeVerify = options.operation === "verify" || options.operation === "send-verify";
  const includeStatus = options.operation === "status";
  const imports = includeStatus && !includeSend && !includeVerify
    ? "from django.views.decorators.http import require_GET"
    : "from django.views.decorators.http import require_POST, require_GET";
  const send = includeSend ? `

@require_POST
def send_otp(request):
    """POST /api/otp/send — JSON body: {"phone": "+201234567890"}."""
    try:
        payload = json.loads(request.body or "{}")
    except ValueError:
        return JsonResponse({"ok": False, "error": "Invalid JSON body"}, status=400)
    phone = payload.get("phone")
    if not phone:
        return JsonResponse({"ok": False, "error": "phone is required"}, status=400)
    try:
        data = _wani_post("/send", {"phone": phone, "templateId": ${tid}, "expiryMinutes": 10})
    except RuntimeError as exc:
        return JsonResponse({"ok": False, "error": str(exc)}, status=502)
    return JsonResponse(data)` : "";
  const verify = includeVerify ? `

@require_POST
def verify_otp(request):
    """POST /api/otp/verify — JSON body: {"token": "...", "code": "123456"}."""
    try:
        payload = json.loads(request.body or "{}")
    except ValueError:
        return JsonResponse({"ok": False, "error": "Invalid JSON body"}, status=400)
    if not payload.get("token") or not payload.get("code"):
        return JsonResponse({"ok": False, "error": "token and code are required"}, status=400)
    try:
        data = _wani_post("/verify", {"token": payload["token"], "code": payload["code"]})
    except RuntimeError as exc:
        return JsonResponse({"ok": False, "error": str(exc)}, status=502)
    return JsonResponse(data)` : "";
  const status = includeStatus ? `

@require_GET
def otp_status(request):
    """GET /api/otp/status?token=..."""
    token = request.GET.get("token")
    if not token:
        return JsonResponse({"ok": False, "error": "token is required"}, status=400)
    try:
        response = requests.get(BASE_URL + "/status/" + token, headers={"x-api-key": API_KEY}, timeout=TIMEOUT)
        data = response.json()
        if not response.ok or not data.get("ok"):
            raise RuntimeError(data.get("error", "Wani request failed"))
    except RuntimeError as exc:
        return JsonResponse({"ok": False, "error": str(exc)}, status=502)
    return JsonResponse(data)` : "";
  return `# views.py — Wani OTP via ${label} (server-only)
# Keep WANI_API_KEY in your server environment. Never expose it to templates/JS.
import json
import os

import requests
from django.http import JsonResponse
${imports}

BASE_URL = ${jsQuote(options.baseUrl)}
API_KEY = os.environ["WANI_API_KEY"]
TIMEOUT = 10


def _wani_post(path: str, body: dict) -> dict:
    response = requests.post(
        BASE_URL + path,
        headers={"Content-Type": "application/json", "x-api-key": API_KEY},
        json=body,
        timeout=TIMEOUT,
    )
    data = response.json()
    if not response.ok or not data.get("ok"):
        raise RuntimeError(data.get("error", "Wani request failed"))
    return data
${send}${verify}${status}

# urls.py: add one path() per view defined above.
# from django.urls import path
# from . import views
# urlpatterns = [...]
`;
}

function pythonFlaskCode(options: IntegrationCodeOptions): string {
  const label = frameworkLabel(options.language, "flask");
  const tid = options.templateId ? jsQuote(options.templateId) : `"YOUR_TEMPLATE_ID"`;
  const includeSend = options.operation === "send" || options.operation === "send-verify";
  const includeVerify = options.operation === "verify" || options.operation === "send-verify";
  const includeStatus = options.operation === "status";
  const send = includeSend ? `

@app.post("/api/otp/send")
def send_otp():
    """JSON body: {"phone": "+201234567890"}."""
    phone = (request.get_json(silent=True) or {}).get("phone")
    if not phone:
        return jsonify(ok=False, error="phone is required"), 400
    try:
        data = _wani_post("/send", {"phone": phone, "templateId": ${tid}, "expiryMinutes": 10})
    except RuntimeError as exc:
        return jsonify(ok=False, error=str(exc)), 502
    return jsonify(data)` : "";
  const verify = includeVerify ? `

@app.post("/api/otp/verify")
def verify_otp():
    """JSON body: {"token": "...", "code": "123456"}."""
    payload = request.get_json(silent=True) or {}
    if not payload.get("token") or not payload.get("code"):
        return jsonify(ok=False, error="token and code are required"), 400
    try:
        data = _wani_post("/verify", {"token": payload["token"], "code": payload["code"]})
    except RuntimeError as exc:
        return jsonify(ok=False, error=str(exc)), 502
    return jsonify(data)` : "";
  const status = includeStatus ? `

@app.get("/api/otp/status")
def otp_status():
    """Query string: ?token=..."""
    token = request.args.get("token")
    if not token:
        return jsonify(ok=False, error="token is required"), 400
    try:
        response = requests.get(BASE_URL + "/status/" + token, headers={"x-api-key": API_KEY}, timeout=TIMEOUT)
        data = response.json()
        if not response.ok or not data.get("ok"):
            raise RuntimeError(data.get("error", "Wani request failed"))
    except RuntimeError as exc:
        return jsonify(ok=False, error=str(exc)), 502
    return jsonify(data)` : "";
  return `# app.py — Wani OTP via ${label} (server-only)
# Keep WANI_API_KEY in your server environment. Never expose it to templates/JS.
import os

import requests
from flask import Flask, jsonify, request

app = Flask(__name__)

BASE_URL = ${jsQuote(options.baseUrl)}
API_KEY = os.environ["WANI_API_KEY"]
TIMEOUT = 10


def _wani_post(path: str, body: dict) -> dict:
    response = requests.post(
        BASE_URL + path,
        headers={"Content-Type": "application/json", "x-api-key": API_KEY},
        json=body,
        timeout=TIMEOUT,
    )
    data = response.json()
    if not response.ok or not data.get("ok"):
        raise RuntimeError(data.get("error", "Wani request failed"))
    return data
${send}${verify}${status}
`;
}

function pythonFastApiCode(options: IntegrationCodeOptions): string {
  const label = frameworkLabel(options.language, "fastapi");
  const tid = options.templateId ? jsQuote(options.templateId) : `"YOUR_TEMPLATE_ID"`;
  const includeSend = options.operation === "send" || options.operation === "send-verify";
  const includeVerify = options.operation === "verify" || options.operation === "send-verify";
  const includeStatus = options.operation === "status";
  const models = `${includeSend ? `
class SendRequest(BaseModel):
    phone: str
` : ""}${includeVerify ? `
class VerifyRequest(BaseModel):
    token: str
    code: str
` : ""}`;
  const send = includeSend ? `

@app.post("/api/otp/send")
async def send_otp(payload: SendRequest):
    """JSON body: {"phone": "+201234567890"}."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            BASE_URL + "/send",
            headers={"Content-Type": "application/json", "x-api-key": API_KEY},
            json={"phone": payload.phone, "templateId": ${tid}, "expiryMinutes": 10},
        )
    data = response.json()
    if response.status_code >= 400 or not data.get("ok"):
        raise HTTPException(status_code=502, detail=data.get("error", "Wani request failed"))
    return data` : "";
  const verify = includeVerify ? `

@app.post("/api/otp/verify")
async def verify_otp(payload: VerifyRequest):
    """JSON body: {"token": "...", "code": "123456"}."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            BASE_URL + "/verify",
            headers={"Content-Type": "application/json", "x-api-key": API_KEY},
            json={"token": payload.token, "code": payload.code},
        )
    data = response.json()
    if response.status_code >= 400 or not data.get("ok"):
        raise HTTPException(status_code=502, detail=data.get("error", "Wani request failed"))
    return data` : "";
  const status = includeStatus ? `

@app.get("/api/otp/status")
async def otp_status(token: str):
    """Query string: ?token=..."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(BASE_URL + "/status/" + token, headers={"x-api-key": API_KEY})
    data = response.json()
    if response.status_code >= 400 or not data.get("ok"):
        raise HTTPException(status_code=502, detail=data.get("error", "Wani request failed"))
    return data` : "";
  return `# main.py — Wani OTP via ${label} (server-only)
# Keep WANI_API_KEY in your server environment. Requires: pip install fastapi httpx
import os

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

BASE_URL = ${jsQuote(options.baseUrl)}
API_KEY = os.environ["WANI_API_KEY"]
TIMEOUT = 10
${models}${send}${verify}${status}
`;
}

function pythonCode(options: IntegrationCodeOptions, framework: string): string {
  if (framework === "flask") return pythonFlaskCode(options);
  if (framework === "fastapi") return pythonFastApiCode(options);
  return pythonDjangoCode(options);
}

// ═══════════════════════════════════════════════════════════════════════════
// PHP: Laravel / Symfony
// ═══════════════════════════════════════════════════════════════════════════

function phpLaravelCode(options: IntegrationCodeOptions): string {
  const label = frameworkLabel(options.language, "laravel");
  const tid = options.templateId ? `'${options.templateId.replace(/'/g, "\\'")}'` : `"YOUR_TEMPLATE_ID"`;
  const includeSend = options.operation === "send" || options.operation === "send-verify";
  const includeVerify = options.operation === "verify" || options.operation === "send-verify";
  const includeStatus = options.operation === "status";
  const send = includeSend ? `
    public function send(Request $request)
    {
        $validated = $request->validate(["phone" => "required|string"]);
        $response = Http::timeout(10)->withHeaders([
            "x-api-key" => config("services.wani.key"),
        ])->post(config("services.wani.base_url") . "/send", [
            "phone" => $validated["phone"],
            "templateId" => ${tid},
            "expiryMinutes" => 10,
        ]);
        $data = $response->json();
        if (!$response->successful() || !($data["ok"] ?? false)) {
            return response()->json(["ok" => false, "error" => $data["error"] ?? "Wani request failed"], 502);
        }
        return response()->json($data);
    }` : "";
  const verify = includeVerify ? `
    public function verify(Request $request)
    {
        $validated = $request->validate(["token" => "required|string", "code" => "required|string"]);
        $response = Http::timeout(10)->withHeaders([
            "x-api-key" => config("services.wani.key"),
        ])->post(config("services.wani.base_url") . "/verify", [
            "token" => $validated["token"],
            "code" => $validated["code"],
        ]);
        $data = $response->json();
        if (!$response->successful() || !($data["ok"] ?? false)) {
            return response()->json(["ok" => false, "error" => $data["error"] ?? "Wani request failed"], 502);
        }
        return response()->json($data);
    }` : "";
  const status = includeStatus ? `
    public function status(Request $request)
    {
        $validated = $request->validate(["token" => "required|string"]);
        $response = Http::timeout(10)->withHeaders([
            "x-api-key" => config("services.wani.key"),
        ])->get(config("services.wani.base_url") . "/status/" . urlencode($validated["token"]));
        $data = $response->json();
        if (!$response->successful() || !($data["ok"] ?? false)) {
            return response()->json(["ok" => false, "error" => $data["error"] ?? "Wani request failed"], 502);
        }
        return response()->json($data);
    }` : "";
  return `<?php
// app/Http/Controllers/OtpController.php — Wani OTP via ${label} (server-only)
// config/services.php: 'wani' => ['base_url' => env('WANI_BASE_URL', '${options.baseUrl}'), 'key' => env('WANI_API_KEY')],
// Never expose the key to Blade/JS.

namespace App\\Http\\Controllers;

use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Http;

class OtpController extends Controller
{${send}${verify}${status}
}`;
}

function phpSymfonyCode(options: IntegrationCodeOptions): string {
  const label = frameworkLabel(options.language, "symfony");
  const tid = options.templateId ? `'${options.templateId.replace(/'/g, "\\'")}'` : `"YOUR_TEMPLATE_ID"`;
  const includeSend = options.operation === "send" || options.operation === "send-verify";
  const includeVerify = options.operation === "verify" || options.operation === "send-verify";
  const includeStatus = options.operation === "status";
  const send = includeSend ? `
    #[Route('/api/otp/send', methods: ['POST'])]
    public function send(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent(), true) ?? [];
        if (empty($payload['phone'])) {
            return $this->json(['ok' => false, 'error' => 'phone is required'], 400);
        }
        $response = $this->waniClient->request('POST', '/send', [
            'headers' => ['x-api-key' => $this->waniApiKey],
            'json' => ['phone' => $payload['phone'], 'templateId' => ${tid}, 'expiryMinutes' => 10],
            'timeout' => 10,
        ]);
        $data = $response->toArray(false);
        if ($response->getStatusCode() >= 400 || !($data['ok'] ?? false)) {
            return $this->json(['ok' => false, 'error' => $data['error'] ?? 'Wani request failed'], 502);
        }
        return $this->json($data);
    }` : "";
  const verify = includeVerify ? `
    #[Route('/api/otp/verify', methods: ['POST'])]
    public function verify(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent(), true) ?? [];
        if (empty($payload['token']) || empty($payload['code'])) {
            return $this->json(['ok' => false, 'error' => 'token and code are required'], 400);
        }
        $response = $this->waniClient->request('POST', '/verify', [
            'headers' => ['x-api-key' => $this->waniApiKey],
            'json' => ['token' => $payload['token'], 'code' => $payload['code']],
            'timeout' => 10,
        ]);
        $data = $response->toArray(false);
        if ($response->getStatusCode() >= 400 || !($data['ok'] ?? false)) {
            return $this->json(['ok' => false, 'error' => $data['error'] ?? 'Wani request failed'], 502);
        }
        return $this->json($data);
    }` : "";
  const status = includeStatus ? `
    #[Route('/api/otp/status', methods: ['GET'])]
    public function status(Request $request): JsonResponse
    {
        $token = $request->query->get('token');
        if (!$token) {
            return $this->json(['ok' => false, 'error' => 'token is required'], 400);
        }
        $response = $this->waniClient->request('GET', '/status/' . urlencode((string) $token), [
            'headers' => ['x-api-key' => $this->waniApiKey],
            'timeout' => 10,
        ]);
        $data = $response->toArray(false);
        if ($response->getStatusCode() >= 400 || !($data['ok'] ?? false)) {
            return $this->json(['ok' => false, 'error' => $data['error'] ?? 'Wani request failed'], 502);
        }
        return $this->json($data);
    }` : "";
  return `<?php
// src/Controller/OtpController.php — Wani OTP via ${label} (server-only)
// services.yaml: bind HttpClient scoped to '${options.baseUrl}' and string $waniApiKey: '%env(WANI_API_KEY)%'.
// Never expose the key to Twig/JS.

namespace App\\Controller;

use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;
use Symfony\\Contracts\\HttpClient\\HttpClientInterface;

class OtpController extends AbstractController
{
    public function __construct(
        private HttpClientInterface $waniClient,
        private string $waniApiKey,
    ) {}
${send}${verify}${status}
}`;
}

function phpCode(options: IntegrationCodeOptions, framework: string): string {
  if (framework === "symfony") return phpSymfonyCode(options);
  return phpLaravelCode(options);
}

// ═══════════════════════════════════════════════════════════════════════════
// cURL / Shell
// ═══════════════════════════════════════════════════════════════════════════

function curlCode(options: IntegrationCodeOptions): string {
  const includeSend = options.operation === "send" || options.operation === "send-verify";
  const includeVerify = options.operation === "verify" || options.operation === "send-verify";
  const includeStatus = options.operation === "status";
  const send = includeSend ? `curl -X POST "$WANI_BASE_URL/send" \\
  -H "Content-Type: application/json" -H "x-api-key: $WANI_API_KEY" \\
  -d '{"phone":"+201234567890","templateId":"${options.templateId ?? "TEMPLATE_ID"}","expiryMinutes":10}'` : "";
  const verify = includeVerify ? `curl -X POST "$WANI_BASE_URL/verify" \\
  -H "Content-Type: application/json" -H "x-api-key: $WANI_API_KEY" \\
  -d '{"token":"TOKEN_FROM_SEND","code":"123456"}'` : "";
  const status = includeStatus ? `curl "$WANI_BASE_URL/status/TOKEN_FROM_SEND" \\
  -H "x-api-key: $WANI_API_KEY"` : "";
  return `export WANI_API_KEY="your_project_api_key"
export WANI_BASE_URL="${options.baseUrl}"
${send}
${verify}
${status}`;
}

export function generateIntegrationCode(options: IntegrationCodeOptions): string {
  const framework = normalizeFramework(options.language, options.framework);
  switch (options.language) {
    case "javascript": return jsCode(options, false, framework);
    case "typescript": return jsCode(options, true, framework);
    case "python": return pythonCode(options, framework);
    case "php": return phpCode(options, framework);
    case "curl": return curlCode(options);
  }
}
