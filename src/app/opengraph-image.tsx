import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const alt     = "واتس برو — منصة واتساب التسويقية الأولى";
export const size    = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  // نقرأ الـ logo كـ base64 عشان نحقنه مباشرة في الـ img
  const logoPath = join(process.cwd(), "public", "wani.jpg");
  const logoBase64 = readFileSync(logoPath).toString("base64");
  const logoSrc = `data:image/jpeg;base64,${logoBase64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #064e45 0%, #075E54 50%, #0a7a6a 100%)",
          position: "relative",
          overflow: "hidden",
          fontFamily: "sans-serif",
        }}
      >
        {/* Grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow blobs */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: -100,
            width: 500,
            height: 500,
            background: "rgba(37,211,102,0.12)",
            borderRadius: "50%",
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            right: -80,
            width: 400,
            height: 400,
            background: "rgba(37,211,102,0.08)",
            borderRadius: "50%",
            filter: "blur(60px)",
          }}
        />

        {/* Card container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
            zIndex: 1,
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: 36,
              overflow: "hidden",
              boxShadow: "0 0 0 4px rgba(37,211,102,0.4), 0 24px 60px rgba(0,0,0,0.4)",
              display: "flex",
            }}
          >
            <img
              src={logoSrc}
              width={160}
              height={160}
              style={{ objectFit: "cover" }}
            />
          </div>

          {/* Site name */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 72,
                fontWeight: 900,
                color: "white",
                letterSpacing: "-2px",
                lineHeight: 1,
              }}
            >
              واتس برو
            </div>
            <div
              style={{
                fontSize: 28,
                color: "rgba(255,255,255,0.7)",
                fontWeight: 400,
                textAlign: "center",
                maxWidth: 700,
                lineHeight: 1.4,
              }}
            >
              المنصة الرائدة لإرسال رسائل واتساب جماعية وحملات تسويقية ذكية
            </div>
          </div>

          {/* Pills */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {["✓ API رسمي من Meta", "✓ ذكاء اصطناعي", "✓ تقارير مفصلة"].map((t) => (
              <div
                key={t}
                style={{
                  background: "rgba(37,211,102,0.15)",
                  border: "1px solid rgba(37,211,102,0.35)",
                  borderRadius: 999,
                  padding: "8px 20px",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 20,
                  fontWeight: 500,
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom domain */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            color: "rgba(255,255,255,0.35)",
            fontSize: 18,
            letterSpacing: "0.05em",
          }}
        >
          whatsprosystem.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}