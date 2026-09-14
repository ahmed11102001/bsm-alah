export type IntegrationOperation = "send" | "verify" | "send-verify";
export type IntegrationLanguage = "javascript" | "typescript" | "python" | "php" | "curl";

export interface IntegrationCodeOptions {
  operation: IntegrationOperation;
  language: IntegrationLanguage;
  framework: string;
  templateId?: string;
  baseUrl: string;
}

const jsQuote = (value: string) => JSON.stringify(value);

function javascriptCode(options: IntegrationCodeOptions, typed: boolean): string {
  const templateId = options.templateId ? jsQuote(options.templateId) : "undefined";
  const type = typed ? ": string" : "";
  const send = options.operation === "verify" ? "" : `
export async function sendOtp(phone${type}) {
  return waniRequest("/send", { phone, templateId: ${templateId}, expiryMinutes: 10 });
}`;
  const verify = options.operation === "send" ? "" : `
export async function verifyOtp(token${type}, code${type}) {
  return waniRequest("/verify", { token, code });
}`;
  const flow = options.operation === "send-verify"
    ? `
// Connect to your form:
// const sent = await sendOtp(phone);
// const result = await verifyOtp(String(sent.token), codeEnteredByUser);
`
    : "";
  const bodyType = typed ? ": Record<string, unknown>" : "";
  return `// Wani OTP integration (${options.framework})
// Keep WANI_API_KEY on your server. Never put it in browser/client code.
const WANI_API_KEY = process.env.WANI_API_KEY;
const WANI_BASE_URL = ${jsQuote(options.baseUrl)};

async function waniRequest(path${type}, body${bodyType}) {
  if (!WANI_API_KEY) throw new Error("WANI_API_KEY is not configured");
  const response = await fetch(WANI_BASE_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": WANI_API_KEY },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error ?? "Wani request failed");
  return data;
}
${send}
${verify}
${flow}`;
}

function pythonCode(options: IntegrationCodeOptions): string {
  const templateId = options.templateId ? jsQuote(options.templateId) : "None";
  const send = options.operation === "verify" ? "" : `
def send_otp(phone: str) -> dict:
    return wani_request("/send", {"phone": phone, "templateId": ${templateId}, "expiryMinutes": 10})
`;
  const verify = options.operation === "send" ? "" : `
def verify_otp(token: str, code: str) -> dict:
    return wani_request("/verify", {"token": token, "code": code})
`;
  return `import os
import requests

BASE_URL = ${jsQuote(options.baseUrl)}
API_KEY = os.environ["WANI_API_KEY"]  # server environment only

def wani_request(path: str, body: dict) -> dict:
    response = requests.post(BASE_URL + path, headers={"Content-Type": "application/json", "x-api-key": API_KEY}, json=body, timeout=10)
    data = response.json()
    if not response.ok or not data.get("ok"):
        raise RuntimeError(data.get("error", "Wani request failed"))
    return data
${send}${verify}
  ${options.operation === "send-verify" ? '# For send & verify: call send_otp(phone), then verify_otp(result["token"], code).' : ""}
`;
}

function phpCode(options: IntegrationCodeOptions): string {
  const templateId = options.templateId ? `'${options.templateId.replace(/'/g, "\\'")}'` : "null";
  const send = options.operation === "verify" ? "" : `
function sendOtp(string $phone): array {
    return waniRequest('/send', ['phone' => $phone, 'templateId' => ${templateId}, 'expiryMinutes' => 10]);
}`;
  const verify = options.operation === "send" ? "" : `
function verifyOtp(string $token, string $code): array {
    return waniRequest('/verify', ['token' => $token, 'code' => $code]);
}`;
  return `<?php
// Store WANI_API_KEY in the server environment; do not expose it to the browser.
$baseUrl = '${options.baseUrl}';
$apiKey = getenv('WANI_API_KEY');
function waniRequest(string $path, array $body): array {
    global $baseUrl, $apiKey;
    $ch = curl_init($baseUrl . $path);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-api-key: ' . $apiKey], CURLOPT_POSTFIELDS => json_encode($body), CURLOPT_TIMEOUT => 10]);
    $data = json_decode(curl_exec($ch), true); curl_close($ch);
    if (!($data['ok'] ?? false)) throw new Exception($data['error'] ?? 'Wani request failed');
    return $data;
}
${send}${verify}`;
}

function curlCode(options: IntegrationCodeOptions): string {
  const send = options.operation === "verify" ? "" : `curl -X POST "$WANI_BASE_URL/send" \\\
  -H "Content-Type: application/json" -H "x-api-key: $WANI_API_KEY" \\\
  -d '{"phone":"+201234567890","templateId":"${options.templateId ?? "TEMPLATE_ID"}","expiryMinutes":10}'`;
  const verify = options.operation === "send" ? "" : `curl -X POST "$WANI_BASE_URL/verify" \\\
  -H "Content-Type: application/json" -H "x-api-key: $WANI_API_KEY" \\\
  -d '{"token":"TOKEN_FROM_SEND","code":"123456"}'`;
  return `export WANI_API_KEY="your-server-key"
export WANI_BASE_URL="${options.baseUrl}"
${send}
${verify}`;
}

export function generateIntegrationCode(options: IntegrationCodeOptions): string {
  switch (options.language) {
    case "javascript": return javascriptCode(options, false);
    case "typescript": return javascriptCode(options, true);
    case "python": return pythonCode(options);
    case "php": return phpCode(options);
    case "curl": return curlCode(options);
  }
}
