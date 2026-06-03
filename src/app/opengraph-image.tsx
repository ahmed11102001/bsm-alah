import { ImageResponse } from "next/og";
import { readFileSync }  from "fs";
import { join }          from "path";

export const runtime     = "nodejs";
export const alt         = "WhatsPro - واتس برو";
export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  // ── Logo as base64 ──────────────────────────────────────────────────────────
  const logoBase64 = readFileSync(join(process.cwd(), "public", "wani.jpg")).toString("base64");
  const logoSrc    = `data:image/jpeg;base64,${logoBase64}`;

  // ── Arabic font (Cairo) — نجيبه من Google Fonts مباشرة ──────────────────────
  let fontData: ArrayBuffer | null = null;
  try {
    const res = await fetch(
      "https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAA.woff"
    );
    if (res.ok) fontData = await res.arrayBuffer();
  } catch {
    // fallback: sans-serif بيشتغل بدون Arabic font
  }

  const fonts = fontData
    ? [{ name: "Cairo", data: fontData, weight: 700 as const, style: "normal" as const }]
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width:           "100%",
          height:          "100%",
          display:         "flex",
          flexDirection:   "column",
          alignItems:      "center",
          justifyContent:  "center",
          backgroundColor: "#075E54",          // solid fallback
          background:      "linear-gradient(135deg, #064e45 0%, #075E54 55%, #0a7a6a 100%)",
          fontFamily:      fontData ? "Cairo" : "sans-serif",
          position:        "relative",
        }}
      >

        {/* ── Decorative circles — بدون filter:blur (مش مدعوم) ── */}
        <div style={{
          position: "absolute", top: -120, left: -120,
          width: 500, height: 500,
          backgroundColor: "rgba(37,211,102,0.08)",
          borderRadius: "50%",
          display: "flex",
        }} />
        <div style={{
          position: "absolute", bottom: -80, right: -80,
          width: 400, height: 400,
          backgroundColor: "rgba(37,211,102,0.06)",
          borderRadius: "50%",
          display: "flex",
        }} />

        {/* ── Content (بدون zIndex) ── */}
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 24,
        }}>

          {/* Logo */}
          <div style={{
            width: 148, height: 148,
            borderRadius: 32,
            overflow: "hidden",
            display: "flex",
            border: "4px solid rgba(37,211,102,0.5)",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={148} height={148} style={{ objectFit: "cover" }} alt="logo" />
          </div>

          {/* Name */}
          <div style={{
            fontSize: 80, fontWeight: 700,
            color: "white", lineHeight: 1,
            direction: "rtl",
          }}>
            واتس برو
          </div>

          {/* Tagline */}
          <div style={{
            fontSize: 26, fontWeight: 400,
            color: "rgba(255,255,255,0.72)",
            textAlign: "center", maxWidth: 680,
            lineHeight: 1.4, direction: "rtl",
          }}>
            المنصة الرائدة لإرسال رسائل واتساب جماعية وحملات تسويقية ذكية
          </div>

          {/* Pills */}
          <div style={{ display: "flex", gap: 14, marginTop: 6, direction: "rtl" }}>
            {["✓ API رسمي من Meta", "✓ ذكاء اصطناعي", "✓ تقارير مفصلة"].map((label) => (
              <div
                key={label}
                style={{
                  backgroundColor: "rgba(37,211,102,0.15)",
                  border:          "1.5px solid rgba(37,211,102,0.4)",
                  borderRadius:    999,
                  padding:         "10px 22px",
                  color:           "rgba(255,255,255,0.88)",
                  fontSize:        20,
                  fontWeight:      700,
                  display:         "flex",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Domain */}
        <div style={{
          position: "absolute", bottom: 24,
          fontSize: 18,
          color: "rgba(255,255,255,0.3)",
          letterSpacing: "0.06em",
          display: "flex",
        }}>
          whatsprosystem.vercel.app
        </div>

      </div>
    ),
    {
      ...size,
      fonts,
    }
  );
}