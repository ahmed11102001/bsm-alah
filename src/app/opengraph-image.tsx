import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const alt = "WhatsPro";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const logoBase64 = readFileSync(join(process.cwd(), "public", "wani.jpg")).toString("base64");
  const logoSrc = `data:image/jpeg;base64,${logoBase64}`;
  const arialRegular = readFileSync("C:\\Windows\\Fonts\\arial.ttf");
  const arialBold = readFileSync("C:\\Windows\\Fonts\\arialbd.ttf");

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
          backgroundColor: "#075E54",
          background: "linear-gradient(135deg, #064e45 0%, #075E54 55%, #0a7a6a 100%)",
          fontFamily: "Arial, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -120,
            width: 500,
            height: 500,
            backgroundColor: "rgba(37,211,102,0.08)",
            borderRadius: "50%",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            right: -80,
            width: 400,
            height: 400,
            backgroundColor: "rgba(37,211,102,0.06)",
            borderRadius: "50%",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 148,
              height: 148,
              borderRadius: 32,
              overflow: "hidden",
              display: "flex",
              border: "4px solid rgba(37,211,102,0.5)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={148} height={148} style={{ objectFit: "cover" }} alt="logo" />
          </div>

          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: "white",
              lineHeight: 1,
              direction: "ltr",
            }}
          >
            WhatsPro
          </div>

          <div
            style={{
              fontSize: 26,
              fontWeight: 400,
              color: "rgba(255,255,255,0.72)",
              textAlign: "center",
              maxWidth: 680,
              lineHeight: 1.4,
              direction: "ltr",
            }}
          >
            Smart WhatsApp messaging and campaign automation for growing teams
          </div>

          <div style={{ display: "flex", gap: 14, marginTop: 6, direction: "ltr" }}>
            {["Official Meta API", "AI Assistant", "Detailed Reports"].map((label) => (
              <div
                key={label}
                style={{
                  backgroundColor: "rgba(37,211,102,0.15)",
                  border: "1.5px solid rgba(37,211,102,0.4)",
                  borderRadius: 999,
                  padding: "10px 22px",
                  color: "rgba(255,255,255,0.88)",
                  fontSize: 20,
                  fontWeight: 700,
                  display: "flex",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 24,
            fontSize: 18,
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.06em",
            display: "flex",
          }}
        >
          whatsprosystem.vercel.app
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Arial", data: arialRegular, weight: 400, style: "normal" },
        { name: "Arial", data: arialBold, weight: 700, style: "normal" },
      ],
    }
  );
}
