"use client";

// ── PortalLoader ────────────────────────────────────────────────────────────
// لودر البورتال: حرف W بيتملي أخضر من تحت لفوق (أنيميشن تمثيلي — مدة التحميل
// الحقيقية غير معروفة، فالملء بيتكرر لحد ما المحتوى يجهز).
// الاستخدام: <PortalLoader label={t("Loading...", "جاري التحميل...")} />

export default function PortalLoader({ label = "Loading...", size = 76 }: {
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
          width: ${size}px;
          height: ${size}px;
        }
        .portal-loader-w img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          user-select: none;
          -webkit-user-drag: none;
        }
        .portal-loader-base {
          filter: grayscale(1);
          opacity: 0.22;
        }
        .portal-loader-fill {
          overflow: hidden;
          clip-path: inset(100% 0 0 0);
          animation: portal-loader-fill 1.8s ease-in-out infinite;
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
          <img src="/landingpage-dev.svg" alt="" draggable={false} className="portal-loader-base" />
          <img src="/landingpage-dev.svg" alt="" draggable={false} className="portal-loader-fill" />
        </div>
        <span className="portal-loader-sr">{label}</span>
      </div>
    </>
  );
}
