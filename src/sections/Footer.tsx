"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, Phone, MapPin, Facebook, Instagram } from "lucide-react";
import { t, tr, type Lang } from "@/lib/translations";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M20.52 3.48A11.82 11.82 0 0 0 12.08 0C5.53 0 .2 5.32.2 11.88c0 2.09.55 4.13 1.59 5.92L.1 24l6.35-1.66a11.86 11.86 0 0 0 5.63 1.43h.01c6.55 0 11.87-5.33 11.87-11.88 0-3.17-1.23-6.15-3.44-8.41ZM12.09 21.7h-.01a9.85 9.85 0 0 1-5.02-1.37l-.36-.21-3.77.99 1.01-3.68-.23-.38a9.84 9.84 0 0 1-1.51-5.17C2.2 6.45 6.63 2.02 12.08 2.02a9.82 9.82 0 0 1 7 2.9 9.86 9.86 0 0 1 2.89 7c0 5.45-4.43 9.88-9.88 9.88Zm5.42-7.4c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.51-1.78-1.69-2.08-.18-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5s1.07 2.9 1.22 3.1c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.35.2 1.86.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}

const socialLinks = [
  { icon: Facebook, href: "https://www.facebook.com/share/14a5gcBMsdg/", label: "Facebook" },
  { icon: WhatsAppIcon, href: "https://wa.me/201281657907", label: "WhatsApp" },
  { icon: Instagram, href: "https://www.instagram.com/r0.0_h?igsh=MWJ2NGo3bGlmY2dscQ==", label: "Instagram" },
];

interface FooterProps { lang: Lang }

export default function Footer({ lang }: FooterProps) {
  const isAr = lang === "ar";
  const f = t.footer;

  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const cols = [
    { title: tr(f.col1, lang), links: f.product },
    { title: tr(f.col2, lang), links: f.company },
    { title: tr(f.col3, lang), links: f.resources },
  ];

  const fadeUp = (delay: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  return (
    <footer
      ref={ref}
      className="text-white relative overflow-hidden"
      style={{ background: "#0A0F0D" }}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* subtle top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(37,211,102,0.4), transparent)",
          opacity: visible ? 1 : 0,
          transition: "opacity 1s ease 200ms",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">

          {/* ── Brand ── */}
          <div className="lg:col-span-5 pr-0 lg:pr-8" style={fadeUp(0)}>
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#25D366]/20 overflow-hidden"
                style={{ background: "#25D366" }}
              >
                <img src="/faviconlink.svg" alt="WANI" className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl font-bold tracking-tight">
                {isAr ? "وني" : "WANI"}
              </span>
            </div>

            <p className="text-base leading-relaxed mb-8" style={{ color: "#8fa89a", maxWidth: "320px" }}>
              {isAr ? "Ancient intelligence. Modern impact." : "Ancient intelligence. Modern impact."}
            </p>

            <div className="flex flex-col gap-4">
              {[
                { icon: Mail, label: "support@aiwni.com", href: "mailto:support@aiwni.com" },
                { icon: Phone, label: "+20 1281657907", href: "tel:+201281657907", ltr: true },
                { icon: MapPin, label: tr(f.location, lang), href: "#" },
              ].map(({ icon: Icon, label, href, ltr }) => (
                <a
                  key={label} href={href}
                  className="flex items-center gap-3 text-sm transition-colors duration-200 hover:text-[#25D366] w-fit"
                  style={{ color: "#8fa89a" }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#111D16" }}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                  </div>
                  <span dir={ltr ? "ltr" : undefined}>{label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* ── Link columns مع stagger ── */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 pt-2">
            {cols.map((col, ci) => (
              <div key={col.title} style={fadeUp(100 + ci * 80)}>
                <h4 className="text-sm font-bold text-white mb-6">{col.title}</h4>
                <ul className="space-y-4">
                  {col.links.map((link, i) => (
                    <li
                      key={i}
                      style={{
                        opacity: visible ? 1 : 0,
                        transform: visible ? "translateY(0)" : "translateY(12px)",
                        transition: `opacity 0.5s ease ${180 + ci * 80 + i * 40}ms, transform 0.5s ease ${180 + ci * 80 + i * 40}ms`,
                      }}
                    >
                      <a
                        href={link.href}
                        className="text-sm transition-colors duration-200 hover:text-[#25D366]"
                        style={{ color: "#8fa89a" }}
                        {...(link.href.startsWith("http")
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        {tr(link as { ar: string; en: string; href: string }, lang)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div
          className="mt-16 pt-8 flex flex-col-reverse md:flex-row items-center justify-between gap-6"
          style={{
            borderTop: "1px solid rgba(30,51,40,0.6)",
            ...fadeUp(400),
          }}
        >
          <p className="text-sm" style={{ color: "#6aad8a" }}>
            {tr(f.copyright, lang)}
          </p>

          <div className="flex items-center gap-3">
            {socialLinks.map((social, i) => (
              <a
                key={i}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "#111D16",
                  color: "#6aad8a",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(12px)",
                  transition: `background .3s, color .3s, box-shadow .3s, opacity .5s ease ${440 + i * 60}ms, transform .5s ease ${440 + i * 60}ms`,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "#25D366";
                  el.style.color = "#fff";
                  el.style.boxShadow = "0 4px 12px rgba(37,211,102,0.3)";
                  el.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "#111D16";
                  el.style.color = "#6aad8a";
                  el.style.boxShadow = "none";
                  el.style.transform = "translateY(0)";
                }}
              >
                <social.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
