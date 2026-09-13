"use client";

// â”€â”€ PartnerCardTemplates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 5 ØªØµØ§Ù…ÙŠÙ…/Ø­Ø±ÙƒØ§Øª Ù…Ø®ØªÙ„ÙØ© Ù„ÙƒØ§Ø±Øª "WANI Partner". ÙƒÙ„ ØªØµÙ…ÙŠÙ… Ø¨ÙŠØ­Ø¯Ø¯:
//  - ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ù†Øµ (Ø§Ø³Ù… Ø§Ù„Ø¨Ø±Ø§Ù†Ø¯ / Ø§Ù„Ø¹Ù†ÙˆØ§Ù† / Ø§Ù„Ø¬Ù…Ù„Ø© / Ø§Ù„Ø²Ø±) Ø¹Ù„Ù‰ Ù…Ø³Ø§Ø­Ø© Ø§Ù„ÙƒØ§Ø±Øª
//  - Ù„ÙˆÙ† Ø§Ù„Ù‡ÙˆÙŠØ© (accent)
//  - Ø­Ø±ÙƒØ© Ø§Ù„Ø¯Ø®ÙˆÙ„ (Entrance animation) Ù„ÙƒÙ„ Ø¹Ù†ØµØ± Ù„Ù…Ø§ Ø§Ù„ÙƒØ§Ø±Øª ÙŠØªØºÙŠÙ‘Ø±
// Ø§Ù„Ø®Ù„ÙÙŠØ© Ø¯Ø§ÙŠÙ…Ø§Ù‹ ØµÙˆØ±Ø© ÙˆØ§Ø­Ø¯Ø© ØªØ§Ø®Ø¯ Ù…Ø³Ø§Ø­Ø© Ø§Ù„ÙƒØ§Ø±Øª ÙƒÙ„Ù‡ + Overlay ØªØ¯Ø±Ù‘Ø¬ÙŠ Ù„Ù„Ù€ legibility.
// Ù†ÙØ³ Ø§Ù„Ù…ÙƒÙˆÙ‘Ù† Ø¯Ù‡ Ø¨ÙŠØªØ³ØªØ®Ø¯Ù… ÙÙŠ ØµÙØ­Ø© Ø§Ù„ØªØ­ÙƒÙ… (/dashboard/wani-partner) Ù„Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©
// ÙˆÙÙŠ ÙƒØ§Ø±Øª Ø§Ù„Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ (src/app/dashboard/page.tsx).

export interface PartnerCardContent {
  brandName: string;
  title: string;
  tagline: string;
  ctaText: string;
  ctaLink: string;
  image: string;
}

export interface PartnerTemplateMeta {
  id: number;
  accent: string;
  name: { ar: string; en: string };
  desc: { ar: string; en: string };
}

export const PARTNER_TEMPLATES: PartnerTemplateMeta[] = [
  {
    id: 1,
    accent: "hsl(var(--primary))",
    name: { ar: "Ø³ÙŠÙ†Ù…Ø§Ø¦ÙŠ", en: "Cinematic" },
    desc: { ar: "Ø§Ù„Ø¹Ù†ÙˆØ§Ù† ÙˆØ§Ù„Ø¬Ù…Ù„Ø© ØªØ­Øª ÙÙŠ Ø§Ù„Ø´Ù…Ø§Ù„ØŒ Ø§Ù„Ø²Ø± ØªØ­Øª ÙÙŠ Ø§Ù„ÙŠÙ…ÙŠÙ†", en: "Title & tagline bottom-left, button bottom-right" },
  },
  {
    id: 2,
    accent: "#3b82f6",
    name: { ar: "Ù‚Ø·Ø±ÙŠ", en: "Diagonal" },
    desc: { ar: "Ø§Ù„Ø¹Ù†ÙˆØ§Ù† ÙÙŠ Ø§Ù„Ù†ØµØŒ Ø§Ù„Ø¨Ø±Ø§Ù†Ø¯ ÙÙˆÙ‚ØŒ Ø§Ù„Ø²Ø± ØªØ­Øª", en: "Title centered, brand top, button bottom" },
  },
  {
    id: 3,
    accent: "#f2b84a",
    name: { ar: "Ø£Ø±ÙƒØ§Ù†", en: "Corners" },
    desc: { ar: "ÙƒÙ„ Ø¹Ù†ØµØ± ÙÙŠ Ø±ÙƒÙ† Ù…Ø®ØªÙ„Ù Ù…Ù† Ø§Ù„ÙƒØ§Ø±Øª", en: "Each element in a different corner" },
  },
  {
    id: 4,
    accent: "#a78bfa",
    name: { ar: "Ù…Ø±ÙƒØ²ÙŠ", en: "Centered" },
    desc: { ar: "ÙƒÙ„ Ø­Ø§Ø¬Ø© ÙÙŠ Ø§Ù„Ù†ØµØŒ Ù…ØªØ±Ø§ØµØ© Ø±Ø£Ø³ÙŠØ§Ù‹", en: "Everything centered, stacked vertically" },
  },
  {
    id: 5,
    accent: "#fb7185",
    name: { ar: "Ù…Ø¬Ù„Ø©", en: "Magazine" },
    desc: { ar: "Ø§Ù„Ø¹Ù†ÙˆØ§Ù† ÙÙˆÙ‚ Ø§Ù„Ø´Ù…Ø§Ù„ØŒ Ø§Ù„Ø¬Ù…Ù„Ø© ÙÙˆÙ‚ Ø§Ù„ÙŠÙ…ÙŠÙ†", en: "Title top-left, tagline top-right" },
  },
];

function CtaButton({ text, link, accent, interactive, extraClass = "" }: {
  text: string; link: string; accent: string; interactive: boolean; extraClass?: string;
}) {
  const cls = `inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-black shadow-lg whitespace-nowrap ${extraClass}`;
  const style = { background: accent };
  if (!interactive) return <span className={cls} style={style}>{text}</span>;
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className={cls} style={style} onClick={(e) => e.stopPropagation()}>
      {text}
    </a>
  );
}

export function PartnerCardTemplate({
  template, content, interactive = true, animKey,
}: {
  template: number;
  content: PartnerCardContent;
  interactive?: boolean;
  /** ØºÙŠÙ‘Ø±Ù‡ ÙƒÙ„ Ù…Ø§ ØªØªØºÙŠØ± Ø§Ù„Ø´Ø±ÙŠØ­Ø© Ø¹Ø´Ø§Ù† Ø§Ù„Ø­Ø±ÙƒØ© ØªØªØ¹Ø§Ø¯ */
  animKey?: string | number;
}) {
  const meta = PARTNER_TEMPLATES.find((t) => t.id === template) ?? PARTNER_TEMPLATES[0];
  const accent = meta.accent;
  const { brandName, title, tagline, ctaText, ctaLink, image } = content;

  const BrandPill = ({ className = "" }: { className?: string }) => (
    <span
      className={`inline-block text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-full backdrop-blur-sm ${className}`}
      style={{ background: `${accent}33`, color: accent, border: `1px solid ${accent}66` }}
    >
      {brandName}
    </span>
  );

  return (
    <div key={animKey} className="relative w-full h-full overflow-hidden">
      {/* Ø§Ù„Ø®Ù„ÙÙŠØ© â€” Ø§Ù„ØµÙˆØ±Ø© ÙƒØ§Ù…Ù„Ø© + overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center animate-in fade-in zoom-in-105 duration-700 ease-out"
        style={{ backgroundImage: `url(${image})` }}
      />

      {/* â”€â”€ Template 1: Cinematic â€” Ù†Øµ ØªØ­Øª Ø´Ù…Ø§Ù„ØŒ Ø²Ø±Ø§Ø± ØªØ­Øª ÙŠÙ…ÙŠÙ† â”€â”€ */}
      {template === 1 && (
        <>
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)" }} />
          <div className="absolute top-4 inset-x-4 animate-in fade-in slide-in-from-top-3 duration-500">
            <BrandPill />
          </div>
          <div className="absolute bottom-4 inset-x-4 flex items-end justify-between gap-3">
            <div className="min-w-0 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
              <h3 className="text-white font-extrabold text-base sm:text-lg leading-snug truncate">{title}</h3>
              <p className="text-white/70 text-xs mt-1 line-clamp-1">{tagline}</p>
            </div>
            <div className="flex-shrink-0 animate-in fade-in zoom-in-90 duration-500 delay-300">
              <CtaButton text={ctaText} link={ctaLink} accent={accent} interactive={interactive} />
            </div>
          </div>
        </>
      )}

      {/* â”€â”€ Template 2: Diagonal â€” Ø¨Ø±Ø§Ù†Ø¯ ÙÙˆÙ‚ØŒ Ø¹Ù†ÙˆØ§Ù† ÙÙŠ Ø§Ù„Ù†ØµØŒ Ø²Ø±Ø§Ø± ØªØ­Øª â”€â”€ */}
      {template === 2 && (
        <>
          <div className="absolute inset-0" style={{ background: `linear-gradient(115deg, rgba(0,0,0,0.75) 15%, rgba(0,0,0,0.15) 60%)` }} />
          <div className="absolute top-4 inset-x-4 flex justify-start animate-in fade-in slide-in-from-top-4 duration-500">
            <BrandPill />
          </div>
          <div className="absolute inset-y-0 right-4 flex items-center max-w-[62%] animate-in fade-in slide-in-from-right-6 duration-700 delay-100">
            <h3 className="text-white font-extrabold text-lg sm:text-xl leading-tight text-right">{title}</h3>
          </div>
          <div className="absolute bottom-4 inset-x-4 flex items-end justify-between gap-3">
            <p className="text-white/65 text-xs max-w-[55%] line-clamp-2 animate-in fade-in duration-500 delay-300">{tagline}</p>
            <div className="flex-shrink-0 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300">
              <CtaButton text={ctaText} link={ctaLink} accent={accent} interactive={interactive} />
            </div>
          </div>
        </>
      )}

      {/* â”€â”€ Template 3: Corners â€” ÙƒÙ„ Ø¹Ù†ØµØ± ÙÙŠ Ø±ÙƒÙ† â”€â”€ */}
      {template === 3 && (
        <>
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.7) 100%)" }} />
          <div className="absolute top-4 left-4 animate-in fade-in zoom-in-95 duration-500 delay-0">
            <BrandPill />
          </div>
          <div className="absolute top-4 right-4 max-w-[55%] text-right animate-in fade-in zoom-in-95 duration-500 delay-100">
            <h3 className="text-white font-extrabold text-base sm:text-lg leading-snug">{title}</h3>
          </div>
          <div className="absolute bottom-4 left-4 max-w-[55%] animate-in fade-in zoom-in-95 duration-500 delay-200">
            <p className="text-white/70 text-xs leading-relaxed line-clamp-2">{tagline}</p>
          </div>
          <div className="absolute bottom-4 right-4 animate-in fade-in zoom-in-95 duration-500 delay-300">
            <CtaButton text={ctaText} link={ctaLink} accent={accent} interactive={interactive} />
          </div>
        </>
      )}

      {/* â”€â”€ Template 4: Centered â€” ÙƒÙ„ Ø­Ø§Ø¬Ø© ÙÙŠ Ø§Ù„Ù†Øµ â”€â”€ */}
      {template === 4 && (
        <>
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.72) 85%)" }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-2">
            <div className="animate-in fade-in zoom-in-90 duration-300 delay-0">
              <BrandPill />
            </div>
            <h3 className="text-white font-extrabold text-lg sm:text-xl leading-snug mt-1 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-150">
              {title}
            </h3>
            <p className="text-white/70 text-xs max-w-[80%] line-clamp-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
              {tagline}
            </p>
            <div className="mt-1.5 animate-in fade-in zoom-in-90 duration-500 delay-500">
              <CtaButton text={ctaText} link={ctaLink} accent={accent} interactive={interactive} />
            </div>
          </div>
        </>
      )}

      {/* â”€â”€ Template 5: Magazine â€” Ø¹Ù†ÙˆØ§Ù† ÙÙˆÙ‚ Ø´Ù…Ø§Ù„ØŒ Ø¬Ù…Ù„Ø© ÙÙˆÙ‚ ÙŠÙ…ÙŠÙ†ØŒ Ø¨Ø±Ø§Ù†Ø¯ ÙˆØ²Ø±Ø§Ø± ØªØ­Øª â”€â”€ */}
      {template === 5 && (
        <>
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.72) 0%, transparent 45%, transparent 60%, rgba(0,0,0,0.78) 100%)" }} />
          <div className="absolute top-4 left-4 max-w-[58%] animate-in fade-in slide-in-from-top-4 duration-500">
            <h3 className="text-white font-extrabold text-base sm:text-lg leading-snug">{title}</h3>
          </div>
          <div className="absolute top-4 right-4 max-w-[38%] text-right animate-in fade-in slide-in-from-right-4 duration-500 delay-150">
            <p className="text-white/70 text-[11px] leading-relaxed line-clamp-3">{tagline}</p>
          </div>
          <div className="absolute bottom-4 left-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300">
            <BrandPill />
          </div>
          <div className="absolute bottom-4 right-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300">
            <CtaButton text={ctaText} link={ctaLink} accent={accent} interactive={interactive} />
          </div>
        </>
      )}
    </div>
  );
}


