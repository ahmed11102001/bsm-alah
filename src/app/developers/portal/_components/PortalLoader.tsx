"use client";

// ── PortalLoader ────────────────────────────────────────────────────────────
// لودر البورتال: حرف W رمادي شفاف بيتملي أخضر من تحت لفوق (أنيميشن تمثيلي —
// مدة التحميل الحقيقية غير معروفة، فالملء بيتكرر لحد ما المحتوى يجهز).
// الاستخدام: <PortalLoader label={t("Loading...", "جاري التحميل...")} />

export default function PortalLoader({ label = "Loading...", size = 88 }: {
  label?: string;
  size?: number;
}) {
  return (
    <>
      <style>{`
        .portal-loader-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 60vh;
          min-height: 240px;
        }
        .portal-loader-w {
          position: relative;
          font-size: ${size}px;
          font-weight: 800;
          line-height: 1;
          font-family: 'IBM Plex Sans Arabic', Arial, sans-serif;
          user-select: none;
        }
        .portal-loader-base {
          color: rgba(255, 255, 255, 0.13);
        }
        .portal-loader-fill {
          position: absolute;
          inset: 0;
          color: #20d378;
          overflow: hidden;
          clip-path: inset(100% 0 0 0);
          animation: portal-loader-fill 1.8s ease-in-out infinite;
          text-shadow: 0 0 28px rgba(32, 211, 120, 0.45);
        }
        @keyframes portal-loader-fill {
          0%   { clip-path: inset(100% 0 0 0); }
          55%  { clip-path: inset(0% 0 0 0); }
          100% { clip-path: inset(0% 0 100% 0); }
        }
        .portal-loader-sr {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
          white-space: nowrap;
        }
        @media (prefers-reduced-motion: reduce) {
          .portal-loader-fill { animation: none; clip-path: inset(30% 0 0 0); }
        }
      `}</style>

      <div className="portal-loader-wrap" role="status" aria-busy="true" aria-label={label}>
        <div className="portal-loader-w" aria-hidden="true">
          <span className="portal-loader-base">W</span>
          <span className="portal-loader-fill">W</span>
        </div>
        <span className="portal-loader-sr">{label}</span>
      </div>
    </>
  );
}
