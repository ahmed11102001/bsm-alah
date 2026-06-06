"use client";
// src/app/developers/portal/page.tsx
// ─── Developer Portal ─────────────────────────────────────────────────────────
// يحتاج auth + apiAccess (Pro+)

import { useState, useEffect, useRef } from "react";
import { useSession }                  from "next-auth/react";
import { useRouter }                   from "next/navigation";
import Link                            from "next/link";

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:        "#0d0f14",
  surface:   "#13161d",
  card:      "#181c25",
  border:    "#232736",
  green:     "#25D366",
  greenDim:  "#1a9e4a",
  cyan:      "#00d4ff",
  purple:    "#8b5cf6",
  amber:     "#f59e0b",
  red:       "#ef4444",
  text:      "#e8eaf0",
  muted:     "#6b7280",
  faint:     "#374151",
};

// ── Sample logs ───────────────────────────────────────────────────────────────
const SAMPLE_LOGS = [
  { id:1,  ts:"14:32:01", phone:"+201234567890", type:"send",   status:"success", ms:312  },
  { id:2,  ts:"14:32:45", phone:"+201234567890", type:"verify", status:"success", ms:89   },
  { id:3,  ts:"13:57:12", phone:"+966501234567", type:"send",   status:"success", ms:445  },
  { id:4,  ts:"13:57:48", phone:"+966501234567", type:"verify", status:"failed",  ms:72   },
  { id:5,  ts:"13:21:05", phone:"+201098765432", type:"send",   status:"success", ms:289  },
  { id:6,  ts:"12:44:30", phone:"+201567890123", type:"send",   status:"failed",  ms:0    },
  { id:7,  ts:"12:10:19", phone:"+971501234567", type:"send",   status:"success", ms:521  },
];

// ── Code generators ───────────────────────────────────────────────────────────
const CODE = {
  wani_gen: {
    js: (k: string) => `// Wani يولد الكود تلقائياً
const res = await fetch("https://wani.app/api/v1/otp/send", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${k || "bsm_xxxxxxxxxxxx"}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ phone: "+201234567890" })
});
const { token } = await res.json();
// احفظ token مؤقتاً للتحقق لاحقاً`,

    verify_js: (k: string) => `// التحقق من الكود
const res = await fetch("https://wani.app/api/v1/otp/verify", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${k || "bsm_xxxxxxxxxxxx"}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    token: "token_من_الخطوة_السابقة",
    code: "4829"
  })
});
const { verified } = await res.json();
if (verified) { /* سجّل دخول المستخدم */ }`,

    python: (k: string) => `import requests

r = requests.post(
    "https://wani.app/api/v1/otp/send",
    headers={"Authorization": f"Bearer ${k || "bsm_xxxxxxxxxxxx"}"},
    json={"phone": "+201234567890"}
)
token = r.json()["token"]

r2 = requests.post(
    "https://wani.app/api/v1/otp/verify",
    headers={"Authorization": f"Bearer ${k || "bsm_xxxxxxxxxxxx"}"},
    json={"token": token, "code": "4829"}
)
print(r2.json()["verified"])  # True / False`,

    curl: (k: string) => `# إرسال
curl -X POST https://wani.app/api/v1/otp/send \\
  -H "Authorization: Bearer ${k || "bsm_xxxxxxxxxxxx"}" \\
  -H "Content-Type: application/json" \\
  -d '{"phone": "+201234567890"}'

# التحقق
curl -X POST https://wani.app/api/v1/otp/verify \\
  -H "Authorization: Bearer ${k || "bsm_xxxxxxxxxxxx"}" \\
  -H "Content-Type: application/json" \\
  -d '{"token": "tkn_xxx", "code": "4829"}'`,

    php: (k: string) => `<?php
$ch = curl_init("https://wani.app/api/v1/otp/send");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer ${k || "bsm_xxxxxxxxxxxx"}",
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode(["phone" => "+201234567890"]),
]);
$res   = json_decode(curl_exec($ch), true);
$token = $res["token"];
curl_close($ch);`,

    verify_php: (k: string) => `<?php
$ch = curl_init("https://wani.app/api/v1/otp/verify");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer ${k || "bsm_xxxxxxxxxxxx"}",
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "token" => $_SESSION["otp_token"],
        "code"  => $_POST["code"],
    ]),
]);
$res = json_decode(curl_exec($ch), true);
curl_close($ch);
if ($res["verified"]) { /* سجّل دخول ✓ */ }`,
  },

  custom: {
    js: (k: string) => `// أنت تولد الكود وتبعته لـ Wani يرسله
const code = Math.floor(100000 + Math.random() * 900000).toString();

const res = await fetch("https://wani.app/api/v1/otp/send", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${k || "bsm_xxxxxxxxxxxx"}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ phone: "+201234567890", code })
});
// احفظ code في DB مع timestamp`,

    verify_js: () => `// التحقق عندك في السيرفر
const { phone, code } = req.body;
const stored = await db.get(\`otp:\${phone}\`);

if (!stored || Date.now() > stored.expiresAt)
  return res.json({ verified: false, reason: "expired" });
if (stored.code !== code)
  return res.json({ verified: false, reason: "wrong_code" });

await db.del(\`otp:\${phone}\`);
return res.json({ verified: true });`,

    python: (k: string) => `import requests, random, redis, time

r   = redis.Redis()
code = str(random.randint(100000, 999999))

requests.post(
    "https://wani.app/api/v1/otp/send",
    headers={"Authorization": f"Bearer ${k || "bsm_xxxxxxxxxxxx"}"},
    json={"phone": "+201234567890", "code": code}
)
r.setex(f"otp:+201234567890", 300, code)`,

    curl: (k: string) => `curl -X POST https://wani.app/api/v1/otp/send \\
  -H "Authorization: Bearer ${k || "bsm_xxxxxxxxxxxx"}" \\
  -H "Content-Type: application/json" \\
  -d '{"phone": "+201234567890", "code": "482910"}'`,

    php: (k: string) => `<?php
$code = strval(random_int(100000, 999999));
$ch   = curl_init("https://wani.app/api/v1/otp/send");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer ${k || "bsm_xxxxxxxxxxxx"}",
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "phone" => "+201234567890",
        "code"  => $code,
    ]),
]);
curl_exec($ch); curl_close($ch);`,

    verify_php: () => `<?php
$stmt = $pdo->prepare(
    "SELECT code FROM otp_codes
     WHERE phone = ? AND expires_at > NOW()"
);
$stmt->execute([$_POST["phone"]]);
$row = $stmt->fetch();

if (!$row) { echo json_encode(["verified"=>false,"reason"=>"expired"]); exit; }
if ($row["code"] !== $_POST["code"]) {
    echo json_encode(["verified"=>false,"reason"=>"wrong_code"]); exit;
}
$pdo->prepare("DELETE FROM otp_codes WHERE phone=?")->execute([$_POST["phone"]]);
echo json_encode(["verified"=>true]);`,
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };
  return [copied, copy] as const;
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Mini components ───────────────────────────────────────────────────────────
function GlowDot({ color = C.green }: { color?: string }) {
  return (
    <span style={{ position:"relative", display:"inline-flex", width:8, height:8 }}>
      <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:color,
        opacity:0.4, animation:"ping 2s cubic-bezier(0,0,0.2,1) infinite" }} />
      <span style={{ position:"relative", borderRadius:"50%", width:8, height:8, background:color }} />
    </span>
  );
}

function Tag({ children, color = C.green }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
      background:`${color}18`, color, border:`1px solid ${color}30`, fontFamily:"monospace" }}>
      {children}
    </span>
  );
}

function CopyBtn({ text, id, copied, onCopy }: { text:string; id:string; copied:string|null; onCopy:(t:string,i:string)=>void }) {
  const ok = copied === id;
  return (
    <button onClick={() => onCopy(text, id)} style={{
      background: ok ? `${C.green}22` : "#ffffff0f",
      border:`1px solid ${ok ? `${C.green}40` : "#ffffff15"}`,
      borderRadius:6, padding:"4px 10px", cursor:"pointer",
      display:"flex", alignItems:"center", gap:5,
      fontSize:11, color: ok ? C.green : C.muted,
      fontFamily:"monospace", transition:"all .15s"
    }}>
      {ok ? "✓ تم" : "نسخ"}
    </button>
  );
}

function StatPill({ label, value, accent }: { label:string; value:string|number; accent:string }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14,
      padding:"14px 20px", flex:1, minWidth:110 }}>
      <p style={{ fontSize:11, color:C.muted, margin:"0 0 8px", fontWeight:500 }}>{label}</p>
      <p style={{ fontSize:26, fontWeight:800, color:accent, margin:0, lineHeight:1 }}>{value}</p>
    </div>
  );
}

function Panel({ title, icon, children, action }: {
  title:string; icon:string; children:React.ReactNode; action?:React.ReactNode
}) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14,
      padding:"16px 18px", height:"100%" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:14 }}>{icon}</span>
          <h3 style={{ fontSize:12, fontWeight:700, color:C.muted, margin:0,
            textTransform:"uppercase", letterSpacing:"0.08em" }}>{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:10 }}>
      <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:4, fontWeight:600 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SyntaxLine({ line }: { line: string }) {
  if (line.trimStart().startsWith("//") || line.trimStart().startsWith("#"))
    return <span style={{ color:"#4b6070" }}>{line}</span>;

  let rest = line
    .replace(/"([^"]+)"/g, "§STR§$1§END§")
    .replace(/'([^']+)'/g, "§STR§$1§END§");

  const kws = ["const","let","await","return","import","from","async","if","print","requests",
               "Bearer","echo","json_encode","json_decode","curl_init","curl_exec","curl_close",
               "curl_setopt_array","exit","true","false","new","function","class",
               "CURLOPT_POST","CURLOPT_RETURNTRANSFER","CURLOPT_HTTPHEADER","CURLOPT_POSTFIELDS"];
  const kwRx = new RegExp(`\\b(${kws.join("|")})\\b`, "g");
  rest = rest.replace(kwRx, "§KW§$1§END§");

  const segs = rest.split("§");
  return (
    <>
      {segs.map((seg, i) => {
        if (segs[i-1] === "STR") return <span key={i} style={{ color:C.cyan }}>"{seg}"</span>;
        if (segs[i-1] === "KW")  return <span key={i} style={{ color:C.green }}>{seg}</span>;
        if (!["STR§","KW§","END§"].some(x => seg.startsWith(x.replace("§","")) || seg===x))
          return <span key={i}>{seg}</span>;
        return null;
      })}
    </>
  );
}

function CodeBlock({ label, code, id, copied, onCopy }: {
  label?:string; code:string; id:string; copied:string|null; onCopy:(t:string,i:string)=>void
}) {
  return (
    <div style={{ marginBottom:2 }}>
      {label && <p style={{ fontSize:11, color:C.muted, margin:"10px 0 4px", fontWeight:600 }}>{label}</p>}
      <div style={{ position:"relative" }}>
        <pre style={{ background:"#0a0c10", border:`1px solid ${C.border}`, borderRadius:10,
          padding:"14px 16px", overflow:"auto", margin:0, fontSize:11, lineHeight:1.8,
          color:C.text, maxHeight:220 }}>
          {code.split("\n").map((line, i) => (
            <span key={i} style={{ display:"block" }}>
              <span style={{ color:C.faint, userSelect:"none", marginLeft:12, fontSize:10 }}>
                {String(i+1).padStart(2,"0")}
              </span>
              {"  "}
              <SyntaxLine line={line} />
            </span>
          ))}
        </pre>
        <div style={{ position:"absolute", top:8, left:8 }}>
          <CopyBtn text={code} id={id} copied={copied} onCopy={onCopy} />
        </div>
      </div>
    </div>
  );
}

// ── Log type ──────────────────────────────────────────────────────────────────
type LogEntry = { id:number; ts:string; phone:string; type:string; status:string; ms:number };

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DeveloperPortal() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [apiKey,        setApiKey]        = useState("");
  const [showKey,       setShowKey]       = useState(false);
  const [loadingKey,    setLoadingKey]    = useState(true);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [keyError,      setKeyError]      = useState("");

  const [genMode,     setGenMode]     = useState<"wani_gen"|"custom">("wani_gen");
  const [lang,        setLang]        = useState<"js"|"python"|"php"|"curl">("js");
  const [showVerify,  setShowVerify]  = useState(false);
  const [testPhone,   setTestPhone]   = useState("+201234567890");
  const [testCode,    setTestCode]    = useState("");
  const [testing,     setTesting]     = useState(false);
  const [testResult,  setTestResult]  = useState<{ok:boolean;code?:string}|null>(null);
  const [expiry,      setExpiry]      = useState("5");
  const [retries,     setRetries]     = useState("3");
  const [logs,        setLogs]        = useState<LogEntry[]>(SAMPLE_LOGS);
  const [copied,      copy]           = useCopy();
  const termRef = useRef<HTMLDivElement>(null);

  // ── Auth redirect ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated")
      router.push("/auth/signin?callbackUrl=/developers/portal");
  }, [status, router]);

  // ── Load existing API key ─────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "authenticated") return;
    setLoadingKey(true);
    fetch("/api/me/api-key")
      .then(r => r.json())
      .then(d => {
        if (d.apiKey) setApiKey(d.apiKey);
        if (d.error)  setKeyError(d.error);
      })
      .catch(() => setKeyError("تعذّر تحميل المفتاح"))
      .finally(() => setLoadingKey(false));
  }, [status]);

  // ── Scroll logs to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [logs]);

  // ── Generate / renew key ──────────────────────────────────────────────────
  const handleGenKey = async () => {
    setGeneratingKey(true);
    setKeyError("");
    const r = await fetch("/api/me/api-key", { method:"POST" });
    const d = await r.json();
    setGeneratingKey(false);
    if (d.apiKey) { setApiKey(d.apiKey); setShowKey(true); }
    else setKeyError(d.error ?? "حدث خطأ");
  };

  // ── Mock test ─────────────────────────────────────────────────────────────
  const handleTest = () => {
    if (!apiKey) return;
    setTesting(true);
    setTestResult(null);
    const code = genMode === "wani_gen" ? generateOTP() : (testCode || generateOTP());
    setTimeout(() => {
      const ok = Math.random() > 0.15;
      setLogs(p => [{
        id: Date.now(), ts: new Date().toLocaleTimeString("ar-EG"),
        phone: testPhone, type: "send",
        status: ok ? "success" : "failed", ms: ok ? Math.floor(200+Math.random()*400) : 0
      }, ...p.slice(0,19)]);
      setTestResult({ ok, code: ok ? code : undefined });
      setTesting(false);
    }, 1400);
  };

  const maskedKey = apiKey
    ? apiKey.slice(0, 6) + "••••••••••••••••••••••••" + apiKey.slice(-4)
    : "";

  const codeObj = CODE[genMode];
  const mainCode =
    lang === "js"     ? codeObj.js(apiKey)
    : lang === "python" ? codeObj.python(apiKey)
    : lang === "php"    ? codeObj.php(apiKey)
    : codeObj.curl(apiKey);

  const verifyCode =
    lang === "js"  ? (genMode === "wani_gen" ? codeObj.verify_js(apiKey)  : (CODE.custom as any).verify_js())
    : lang === "php" ? (genMode === "wani_gen" ? codeObj.verify_php(apiKey) : (CODE.custom as any).verify_php())
    : null;

  const successRate = Math.round(
    (logs.filter(l => l.status === "success").length / Math.max(logs.length, 1)) * 100
  );
  const avgMs = Math.round(
    logs.filter(l => l.ms > 0).reduce((a,b) => a + b.ms, 0) / Math.max(logs.filter(l=>l.ms>0).length, 1)
  );

  // ── Loading / auth states ─────────────────────────────────────────────────
  if (status === "loading" || (status === "authenticated" && loadingKey && !keyError)) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex",
        alignItems:"center", justifyContent:"center" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
          <GlowDot color={C.cyan} />
          <p style={{ color:C.muted, fontSize:13, fontFamily:"monospace" }}>تحميل البورتال...</p>
        </div>
      </div>
    );
  }

  // Upgrade required
  if (keyError && keyError.toLowerCase().includes("plan")) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex",
        alignItems:"center", justifyContent:"center", fontFamily:"monospace" }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20,
          padding:"40px 48px", maxWidth:420, textAlign:"center" }}>
          <p style={{ fontSize:28, marginBottom:12 }}>🔒</p>
          <h2 style={{ color:C.text, fontSize:18, fontWeight:700, marginBottom:8 }}>
            يحتاج باقة Pro أو أعلى
          </h2>
          <p style={{ color:C.muted, fontSize:13, lineHeight:1.7, marginBottom:24 }}>
            الوصول لـ Developer API متاح من باقة Pro+.
            ترقّ وابدأ البناء.
          </p>
          <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
            <Link href="/checkout?plan=pro" style={{
              background:C.green, color:"#000", padding:"10px 24px", borderRadius:10,
              fontWeight:700, fontSize:13, textDecoration:"none"
            }}>
              ترقّ للـ Pro ←
            </Link>
            <Link href="/developers" style={{
              background:"transparent", color:C.muted, padding:"10px 24px",
              borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, textDecoration:"none"
            }}>
              رجوع
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Portal UI ─────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{
      minHeight:"100vh", background:C.bg,
      fontFamily:"'IBM Plex Mono','Courier New',monospace",
      color:C.text, padding:"28px 20px"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        @keyframes ping    { 75%,100%{transform:scale(2);opacity:0} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:${C.surface}; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:4px; }
        textarea,input,select {
          background:${C.surface} !important; color:${C.text} !important;
          border:1px solid ${C.border} !important; border-radius:8px !important;
          padding:9px 13px !important; font-family:inherit !important;
          font-size:13px !important; outline:none !important;
          transition:border-color .15s !important;
        }
        textarea:focus,input:focus,select:focus { border-color:${C.green}60 !important; }
        select option { background:${C.card}; }
      `}</style>

      <div style={{ maxWidth:940, margin:"0 auto" }}>

        {/* ── Header ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
          marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <GlowDot color={C.cyan} />
              <h1 style={{ fontSize:20, fontWeight:700, margin:0, letterSpacing:"-0.3px" }}>
                Developer Portal
              </h1>
              <Tag color={C.cyan}>BETA</Tag>
            </div>
            <p style={{ fontSize:12, color:C.muted, margin:0 }}>
              مرحباً {session?.user?.name?.split(" ")[0] ?? ""} —
              WhatsApp OTP API
            </p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <Link href="/dashboard" style={{ fontSize:11, color:C.muted,
              textDecoration:"none", background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:8, padding:"6px 14px" }}>
              ← الداشبورد
            </Link>
            <Tag color={C.green}>v1.0</Tag>
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
          <StatPill label="رسائل اليوم"      value={logs.length}    accent={C.cyan}  />
          <StatPill label="نجاح"             value={`${successRate}%`} accent={C.green} />
          <StatPill label="فشل"              value={logs.filter(l=>l.status==="failed").length} accent={C.red} />
          <StatPill label="متوسط الاستجابة" value={`${avgMs}ms`}    accent={C.amber} />
        </div>

        {/* ── Grid ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

          {/* ── API Key ── */}
          <Panel title="API Key" icon="🔑">
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                <div style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`,
                  borderRadius:8, padding:"9px 13px", fontSize:12, fontFamily:"monospace",
                  color: apiKey ? C.text : C.muted,
                  letterSpacing: apiKey && !showKey ? "2px" : "normal",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {loadingKey ? "جاري التحميل..." : apiKey ? (showKey ? apiKey : maskedKey) : "لم يتم الإنشاء بعد"}
                </div>
                {apiKey && (
                  <button onClick={() => setShowKey(p=>!p)} style={{
                    background:C.surface, border:`1px solid ${C.border}`, borderRadius:8,
                    padding:"8px 12px", cursor:"pointer", fontSize:14, color:C.muted
                  }}>{showKey ? "🙈" : "👁"}</button>
                )}
                {apiKey && <CopyBtn text={apiKey} id="apikey" copied={copied} onCopy={copy} />}
              </div>
              {apiKey && (
                <p style={{ fontSize:11, color:C.amber, margin:0, display:"flex", gap:5 }}>
                  ⚠ لا تشارك هذا المفتاح — صلاحيات كاملة على حسابك
                </p>
              )}
              {keyError && !keyError.toLowerCase().includes("plan") && (
                <p style={{ fontSize:11, color:C.red, margin:"4px 0 0" }}>{keyError}</p>
              )}
            </div>

            <button onClick={handleGenKey} disabled={generatingKey} style={{
              width:"100%", padding:"10px", borderRadius:10,
              background: apiKey ? "transparent" : C.green,
              border:`1px solid ${apiKey ? C.border : C.green}`,
              color: apiKey ? C.muted : "#000",
              fontWeight:700, fontSize:13, cursor: generatingKey ? "wait" : "pointer",
              fontFamily:"monospace", display:"flex", alignItems:"center",
              justifyContent:"center", gap:8, transition:"all .2s", opacity: generatingKey ? 0.6 : 1
            }}>
              {generatingKey ? "⟳ جاري الإنشاء..." : apiKey ? "🔄 تجديد المفتاح" : "✦ إنشاء API Key"}
            </button>

            {apiKey && (
              <div style={{ marginTop:14, padding:"10px 14px",
                background:`${C.green}0a`, border:`1px solid ${C.green}25`, borderRadius:8 }}>
                <p style={{ fontSize:11, color:C.green, margin:0, lineHeight:1.7 }}>
                  ✓ المفتاح نشط<br/>
                  <span style={{ color:C.muted }}>استخدمه في Authorization header</span>
                </p>
              </div>
            )}
          </Panel>

          {/* ── OTP Config ── */}
          <Panel title="إعدادات OTP" icon="⚙">
            <Row label="انتهاء الكود">
              <select value={expiry} onChange={e=>setExpiry(e.target.value)} style={{ width:"100%" }}>
                <option value="3">3 دقائق</option>
                <option value="5">5 دقائق</option>
                <option value="10">10 دقائق</option>
                <option value="15">15 دقيقة</option>
              </select>
            </Row>
            <Row label="محاولات الإدخال">
              <select value={retries} onChange={e=>setRetries(e.target.value)} style={{ width:"100%" }}>
                <option value="2">2 محاولات</option>
                <option value="3">3 محاولات</option>
                <option value="5">5 محاولات</option>
              </select>
            </Row>
            <Row label="قالب OTP">
              <select style={{ width:"100%" }}>
                <option>otp_verification — ✅ معتمد</option>
              </select>
            </Row>
            <div style={{ marginTop:12, padding:"8px 12px",
              background:"#f59e0b08", border:"1px solid #f59e0b25", borderRadius:8 }}>
              <p style={{ fontSize:11, color:C.amber, margin:0, lineHeight:1.7 }}>
                ⟳ Rate limiting: 5 رسائل / رقم / ساعة<br/>
                <span style={{ color:C.muted }}>يُطبَّق تلقائياً — لا يمكن تعطيله</span>
              </p>
            </div>
          </Panel>

          {/* ── Code Section ── */}
          <div style={{ gridColumn:"1/3" }}>
            <Panel title="Quick Start" icon="</>">

              {/* Mode selector */}
              <div style={{ display:"flex", gap:10, marginBottom:18 }}>
                {[
                  { value:"wani_gen" as const, label:"✦ Wani يولد الكود",
                    sub:"أبسط — Wani يتولى كل شيء", color:C.green },
                  { value:"custom"   as const, label:"⟐ أنت تولد الكود",
                    sub:"تحكم كامل — كودك في سيرفرك", color:C.cyan },
                ].map(opt => (
                  <button key={opt.value} onClick={() => { setGenMode(opt.value); setShowVerify(false); }}
                    style={{ flex:1, padding:"14px 16px", borderRadius:12, cursor:"pointer",
                      border:`2px solid ${genMode===opt.value ? opt.color : C.border}`,
                      background: genMode===opt.value ? `${opt.color}12` : C.surface,
                      textAlign:"right", transition:"all .15s", fontFamily:"monospace" }}>
                    <p style={{ fontWeight:700, fontSize:13, margin:"0 0 3px",
                      color: genMode===opt.value ? opt.color : C.text }}>{opt.label}</p>
                    <p style={{ fontSize:11, color:C.muted, margin:0 }}>{opt.sub}</p>
                  </button>
                ))}
              </div>

              {/* Info box */}
              <div style={{ padding:"10px 14px", borderRadius:8, marginBottom:14,
                background: genMode==="wani_gen" ? `${C.green}08` : `${C.cyan}08`,
                border:`1px solid ${genMode==="wani_gen" ? `${C.green}20` : `${C.cyan}20`}` }}>
                <p style={{ fontSize:12, color:C.muted, margin:0, lineHeight:1.8 }}>
                  {genMode==="wani_gen" ? (
                    <><span style={{ color:C.green, fontWeight:700 }}>الطريقة الأبسط.</span>{" "}
                    Wani يولد الكود ويرسله ويتحقق منه — تلقى token تستخدمه في التحقق. مفيش Redis مطلوب.</>
                  ) : (
                    <><span style={{ color:C.cyan, fontWeight:700 }}>تحكم كامل.</span>{" "}
                    أنت تولد الكود وتبعته لـ Wani يرسله. التحقق في سيرفرك — مناسب للمنطق الخاص.</>
                  )}
                </p>
              </div>

              {/* Lang tabs */}
              <div style={{ display:"flex", gap:4, marginBottom:2 }}>
                {(["js","python","php","curl"] as const).map(l => (
                  <button key={l} onClick={() => setLang(l)} style={{
                    padding:"5px 14px", borderRadius:"8px 8px 0 0",
                    border:`1px solid ${lang===l ? C.border : "transparent"}`,
                    borderBottom: lang===l ? `1px solid ${C.card}` : "none",
                    background: lang===l ? C.card : "transparent",
                    cursor:"pointer", fontSize:11, fontWeight:600,
                    color: lang===l ? C.text : C.muted, fontFamily:"monospace"
                  }}>
                    {{ js:"JavaScript", python:"Python", php:"PHP", curl:"cURL" }[l]}
                  </button>
                ))}
              </div>

              <CodeBlock
                label={genMode==="wani_gen" ? "① إرسال OTP" : "① إرسال (تولّد الكود أنت)"}
                code={mainCode} id="main" copied={copied} onCopy={copy}
              />

              {(lang === "js" || lang === "php") && (
                <button onClick={() => setShowVerify(p=>!p)} style={{
                  background:"transparent", border:`1px dashed ${C.border}`,
                  borderRadius:8, padding:"7px 14px", cursor:"pointer",
                  fontSize:11, color:C.muted, fontFamily:"monospace",
                  marginTop:8, display:"flex", alignItems:"center", gap:6
                }}>
                  {showVerify ? "▲" : "▼"}{" "}
                  {genMode==="wani_gen" ? "② كود التحقق (verify)" : "② التحقق في سيرفرك"}
                </button>
              )}

              {showVerify && verifyCode && (
                <div style={{ marginTop:6, animation:"fadeIn .2s ease" }}>
                  <CodeBlock
                    label={genMode==="wani_gen" ? "② التحقق من الكود" : "② التحقق — سيرفرك"}
                    code={verifyCode} id="verify" copied={copied} onCopy={copy}
                  />
                </div>
              )}
            </Panel>
          </div>

          {/* ── Tester ── */}
          <Panel title="اختبار مباشر" icon="⚡">
            <Row label="رقم الهاتف">
              <input value={testPhone} onChange={e=>setTestPhone(e.target.value)}
                placeholder="+201234567890" dir="ltr" style={{ width:"100%" }} />
            </Row>
            {genMode === "custom" && (
              <Row label="الكود (اختياري)">
                <input value={testCode} onChange={e=>setTestCode(e.target.value)}
                  placeholder="482910 — أو اتركه فارغ" dir="ltr" style={{ width:"100%" }} />
              </Row>
            )}
            <button onClick={handleTest} disabled={testing || !apiKey} style={{
              width:"100%", padding:"11px", borderRadius:10, marginTop:4,
              background: !apiKey ? C.faint : testing ? C.surface : C.green,
              border:`1px solid ${!apiKey ? C.border : C.green}`,
              color: !apiKey ? C.muted : testing ? C.green : "#000",
              fontWeight:700, fontSize:13,
              cursor: apiKey && !testing ? "pointer" : "not-allowed",
              fontFamily:"monospace", display:"flex", alignItems:"center",
              justifyContent:"center", gap:8, transition:"all .2s"
            }}>
              {testing ? <><GlowDot /> جاري الإرسال...</> : !apiKey ? "أنشئ API Key أولاً" : "▶ اختبار الإرسال"}
            </button>

            {testResult && (
              <div style={{ marginTop:10, padding:"10px 14px",
                background: testResult.ok ? `${C.green}0a` : `${C.red}0a`,
                border:`1px solid ${testResult.ok ? `${C.green}30` : `${C.red}30`}`,
                borderRadius:8, animation:"fadeIn .2s ease" }}>
                {testResult.ok ? (
                  <div>
                    <p style={{ fontSize:12, color:C.green, fontWeight:700, margin:"0 0 4px" }}>✓ تم الإرسال بنجاح</p>
                    {genMode==="wani_gen" && testResult.code && (
                      <p style={{ fontSize:11, color:C.muted, margin:0 }}>
                        الكود المولّد:&nbsp;
                        <span style={{ color:C.cyan, fontWeight:700, letterSpacing:3 }}>{testResult.code}</span>
                        &nbsp;<span style={{ color:C.faint }}>(تجريبي)</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize:12, color:C.red, margin:0 }}>✗ فشل الإرسال — تحقق من الرقم والـ API Key</p>
                )}
              </div>
            )}
          </Panel>

          {/* ── Logs ── */}
          <Panel title="Activity Log" icon="📋"
            action={
              <button onClick={() => setLogs([])} style={{
                background:"transparent", border:`1px solid ${C.border}`,
                borderRadius:6, padding:"3px 10px", cursor:"pointer",
                fontSize:10, color:C.muted, fontFamily:"monospace"
              }}>مسح</button>
            }>
            <div ref={termRef} style={{ height:220, overflowY:"auto",
              display:"flex", flexDirection:"column-reverse", gap:2 }}>
              {logs.length === 0 ? (
                <p style={{ fontSize:11, color:C.faint, textAlign:"center", padding:"30px 0" }}>
                  لا يوجد نشاط بعد
                </p>
              ) : (
                [...logs].map(log => (
                  <div key={log.id} style={{
                    display:"flex", gap:8, alignItems:"center",
                    padding:"5px 8px", borderRadius:6,
                    background: log.status==="success" ? `${C.green}05` : `${C.red}05`,
                    border:`1px solid ${log.status==="success" ? `${C.green}15` : `${C.red}15`}`,
                    animation:"fadeIn .2s ease"
                  }}>
                    <span style={{ fontSize:10, color:C.muted, flexShrink:0, width:60 }}>{log.ts}</span>
                    <span style={{ fontSize:10, color:C.text, flex:1 }}>{log.phone}</span>
                    <Tag color={log.type==="send" ? C.cyan : C.purple}>{log.type}</Tag>
                    <span style={{ fontSize:10, fontWeight:700,
                      color: log.status==="success" ? C.green : C.red }}>
                      {log.status==="success" ? "✓" : "✗"}
                    </span>
                    {log.ms > 0 && <span style={{ fontSize:9, color:C.faint }}>{log.ms}ms</span>}
                  </div>
                ))
              )}
            </div>
          </Panel>

          {/* ── Endpoints ── */}
          <div style={{ gridColumn:"1/3" }}>
            <Panel title="Endpoints" icon="⟐">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {[
                  { method:"POST", path:"/api/v1/otp/send",
                    desc:"إرسال رسالة OTP — مع أو بدون code",
                    body:`{ phone, code? }`, returns:`{ token?, sent_at, expires_at }`, color:C.green },
                  { method:"POST", path:"/api/v1/otp/verify",
                    desc:"التحقق من الكود (Wani mode فقط)",
                    body:`{ token, code }`, returns:`{ verified, reason? }`, color:C.cyan },
                  { method:"GET",  path:"/api/v1/otp/status/:token",
                    desc:"حالة رسالة OTP معينة",
                    body:"—", returns:`{ status, attempts, expires_at }`, color:C.amber },
                  { method:"GET",  path:"/api/v1/otp/logs",
                    desc:"سجل الرسائل (آخر 100)",
                    body:"?limit=&from=&to=", returns:`{ logs[], total }`, color:C.purple },
                ].map((ep,i) => (
                  <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`,
                    borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                      <Tag color={ep.color}>{ep.method}</Tag>
                      <code style={{ fontSize:11, color:C.text }}>{ep.path}</code>
                    </div>
                    <p style={{ fontSize:11, color:C.muted, margin:"0 0 8px" }}>{ep.desc}</p>
                    <code style={{ fontSize:10, color:C.faint, display:"block" }}>body: {ep.body}</code>
                    <code style={{ fontSize:10, color:`${ep.color}99`, display:"block" }}>→ {ep.returns}</code>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

        </div>
      </div>
    </div>
  );
}