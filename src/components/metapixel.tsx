"use client";

// ─── MetaPixel Component ──────────────────────────────────────────────────────
// يتحط مرة واحدة في layout.tsx داخل <body>
// PageView بيتبعت تلقائياً مع كل navigation
//
// nonce prop:
//   بييجي من layout.tsx ← middleware ← request
//   مطلوب عشان الـ inline script تشتغل مع الـ nonce-based CSP
//   لو مش موجود (مثلاً في test env) بيشتغل عادي بدونه

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}

// ─── Hook: بيبعت PageView مع كل route change ─────────────────────────────────
function usePageView() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined" || !window.fbq) return;
    window.fbq("track", "PageView");
  }, [pathname, searchParams]);
}

function PageViewTracker() {
  usePageView();
  return null;
}

// ─── المكون الرئيسي ───────────────────────────────────────────────────────────
export default function MetaPixel({ nonce }: { nonce?: string }) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return null;

  return (
    <>
      {/*
        nonce بيخلي الـ inline script دي موثوقة مع الـ CSP
        بدونه، الـ CSP كانت هترفضها لأن unsafe-inline اتشالت
      */}
      <Script
        id="meta-pixel"
        nonce={nonce}
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1" width="1" style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}