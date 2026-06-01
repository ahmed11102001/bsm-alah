// src/components/RevealSection.tsx
// ─── Scroll Reveal Wrapper ────────────────────────────────────────────────────
// Client component — يستخدم IntersectionObserver لإضافة .is-revealed
// لما الـ section يدخل الـ viewport

"use client";

import { useEffect, useRef } from "react";

interface RevealSectionProps {
  children: React.ReactNode;
  className?: string;
  /** تأخير قبل بداية الأنيميشن (ms) — لو عايز sections تتتبع بعضها */
  delay?: number;
}

export default function RevealSection({
  children,
  className = "",
  delay = 0,
}: RevealSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => el.classList.add("is-revealed"), delay);
          } else {
            el.classList.add("is-revealed");
          }
          obs.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -60px 0px" }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`reveal-section ${className}`}>
      {children}
    </div>
  );
}