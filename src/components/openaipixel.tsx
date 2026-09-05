"use client";

import Script from "next/script";

declare global {
  interface Window {
    oaiq?: (...args: any[]) => void;
  }
}

// Pixel ID من Ads Manager — يفضّل ظبطه كـ env بدل الهاردكود لو الحساب اتغيّر
const OPENAI_PIXEL_ID =
  process.env.NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID || "JhuoD3t1DpNAvMNyHqP3S4";

export default function OpenAIPixel() {
  if (!OPENAI_PIXEL_ID) return null;

  return (
    <Script id="openai-ads-pixel" strategy="afterInteractive">
      {`
        !function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");
        oaiq("init", { pixelId: "${OPENAI_PIXEL_ID}", debug: ${process.env.NODE_ENV !== "production"} });
      `}
    </Script>
  );
}
