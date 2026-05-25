import { MessageCircle, Mail, Phone, MapPin, Facebook, Instagram } from 'lucide-react';
import { t, tr, type Lang } from "@/lib/translations";

const socialLinks = [
  { icon: Facebook,  href: 'https://www.facebook.com/share/14a5gcBMsdg/',                  label: 'Facebook'  },
  { icon: Instagram, href: 'https://www.instagram.com/r0.0_h?igsh=MWJ2NGo3bGlmY2dscQ==', label: 'Instagram' },
];

interface FooterProps { lang: Lang }

export default function Footer({ lang }: FooterProps) {
  const isAr = lang === "ar";
  const f = t.footer;

  const cols = [
    { title: tr(f.col1, lang), links: f.product   },
    { title: tr(f.col3, lang), links: f.resources },
    { title: tr(f.col4, lang), links: f.legal     },
  ];

  return (
    <footer
      className="text-white relative overflow-hidden"
      style={{ background: "#0A0F0D" }} // لون خلفية أغمق وأكثر احترافية
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* ── Main grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">

          {/* Brand Info (Takes up more space) */}
          <div className="lg:col-span-5 pr-0 lg:pr-8">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#25D366]/20"
                style={{ background: "#25D366" }}
              >
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight">
                {isAr ? "وني" : "WANI"}
              </span>
            </div>

            <p className="text-base leading-relaxed mb-8" style={{ color: "#8fa89a", maxWidth: "320px" }}>
              {isAr
                ? "أرسل، أتمت، واكسب أكثر عبر واتساب — كل ده في مكان واحد."
                : "Send, automate, and earn more via WhatsApp — all in one place."}
            </p>

            <div className="flex flex-col gap-4">
              {[
                { icon: Mail,    label: "support@whatspro.app",      href: "mailto:support@whatspro.app" },
                { icon: Phone,   label: "+20 1281657907",            href: "tel:+201281657907", ltr: true },
                { icon: MapPin,  label: tr(f.location, lang),        href: "#" },
              ].map(({ icon: Icon, label, href, ltr }) => (
                <a
                  key={label}
                  href={href}
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

          {/* Link columns */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 pt-2">
            {cols.map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-bold text-white mb-6">
                  {col.title}
                </h4>
                <ul className="space-y-4">
                  {col.links.map((link, i) => (
                    <li key={i}>
                      <a
                        href={link.href}
                        className="text-sm transition-colors duration-200 hover:text-[#25D366]"
                        style={{ color: "#8fa89a" }}
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
          style={{ borderTop: "1px solid rgba(30, 51, 40, 0.6)" }}
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
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "#25D366";
                  (e.currentTarget as HTMLAnchorElement).style.color = "#ffffff";
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 12px rgba(37, 211, 102, 0.3)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "#111D16";
                  (e.currentTarget as HTMLAnchorElement).style.color = "#6aad8a";
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
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
