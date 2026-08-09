"use client";

// ── PartnerCardTemplates ────────────────────────────────────────────────────
// 5 تصاميم/حركات مختلفة لكارت "WANI Partner". كل تصميم بيحدد:
//  - توزيع النص (اسم البراند / العنوان / الجملة / الزر) على مساحة الكارت
//  - لون الهوية (accent)
//  - حركة الدخول (Entrance animation) لكل عنصر لما الكارت يتغيّر
// الخلفية دايماً صورة واحدة تاخد مساحة الكارت كله + Overlay تدرّجي للـ legibility.
// نفس المكوّن ده بيتستخدم في صفحة التحكم (/dashboard/wani-partner) للمعاينة
// وفي كارت الداشبورد الحقيقي (src/app/dashboard/page.tsx).

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
    accent: "#25D366",
    name: { ar: "سينمائي", en: "Cinematic" },
    desc: { ar: "العنوان والجملة تحت في الشمال، الزر تحت في اليمين", en: "Title & tagline bottom-left, button bottom-right" },
  },
  {
    id: 2,
    accent: "#3b82f6",
    name: { ar: "قطري", en: "Diagonal" },
    desc: { ar: "العنوان في النص، البراند فوق، الزر تحت", en: "Title centered, brand top, button bottom" },
  },
  {
    id: 3,
    accent: "#f2b84a",
    name: { ar: "أركان", en: "Corners" },
    desc: { ar: "كل عنصر في ركن مختلف من الكارت", en: "Each element in a different corner" },
  },
  {
    id: 4,
    accent: "#a78bfa",
    name: { ar: "مركزي", en: "Centered" },
    desc: { ar: "كل حاجة في النص، متراصة رأسياً", en: "Everything centered, stacked vertically" },
  },
  {
    id: 5,
    accent: "#fb7185",
    name: { ar: "مجلة", en: "Magazine" },
    desc: { ar: "العنوان فوق الشمال، الجملة فوق اليمين", en: "Title top-left, tagline top-right" },
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
  /** غيّره كل ما تتغير الشريحة عشان الحركة تتعاد */
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
      {/* الخلفية — الصورة كاملة + overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center animate-in fade-in zoom-in-105 duration-700 ease-out"
        style={{ backgroundImage: `url(${image})` }}
      />

      {/* ── Template 1: Cinematic — نص تحت شمال، زرار تحت يمين ── */}
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

      {/* ── Template 2: Diagonal — براند فوق، عنوان في النص، زرار تحت ── */}
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

      {/* ── Template 3: Corners — كل عنصر في ركن ── */}
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

      {/* ── Template 4: Centered — كل حاجة في النص ── */}
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

      {/* ── Template 5: Magazine — عنوان فوق شمال، جملة فوق يمين، براند وزرار تحت ── */}
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
