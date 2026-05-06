import { MessageCircle, Mail, Phone, MapPin, Facebook, Instagram } from 'lucide-react';
import { t, tr, type Lang } from "@/lib/translations";

const socialLinks = [
  { icon: Facebook,  href: 'https://www.facebook.com/share/14a5gcBMsdg/',                    label: 'Facebook'  },
  { icon: Instagram, href: 'https://www.instagram.com/r0.0_h?igsh=MWJ2NGo3bGlmY2dscQ==',   label: 'Instagram' },
];

interface FooterProps { lang: Lang }

export default function Footer({ lang }: FooterProps) {
  const isAr = lang === "ar";
  const f = t.footer;

  const cols = [
    { title: tr(f.col1, lang), links: f.product   },
    { title: tr(f.col2, lang), links: f.company   },
    { title: tr(f.col3, lang), links: f.resources },
    { title: tr(f.col4, lang), links: f.legal     },
  ];

  return (
    <footer className="bg-gray-900 text-white" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-12">

          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-whatsapp-gradient flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">
                {isAr
                  ? <>واتس <span className="text-[#25D366]">برو</span></>
                  : <>Whats<span className="text-[#25D366]">Pro</span></>}
              </span>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">{tr(f.desc, lang)}</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-400">
                <Mail className="w-5 h-5 flex-shrink-0" />
                <span>support@whatspro.app</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <Phone className="w-5 h-5 flex-shrink-0" />
                <span dir="ltr">+20 10 0000 0000</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <MapPin className="w-5 h-5 flex-shrink-0" />
                <span>{tr(f.location, lang)}</span>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="font-bold text-lg mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link, i) => (
                  <li key={i}>
                    <a href={link.href} className="text-gray-400 hover:text-[#25D366] transition-colors">
                      {tr(link as { ar: string; en: string; href: string }, lang)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">{tr(f.copyright, lang)}</p>
          <div className="flex items-center gap-3">
            {socialLinks.map((social, i) => (
              <a key={i} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label}
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-[#25D366] hover:text-white transition-all duration-200">
                <social.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
