// ── LandingPageSkeleton ───────────────────────────────────────────────────────
// Loading shell for the current Hero layout. Keep this visually aligned with
// Hero.tsx so the old phone mock never flashes before the page is ready.
export default function LandingPageSkeleton({ lang = "ar" }: { lang?: "ar" | "en" }) {
  const isAr = lang === "ar";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#053b32] to-[#0b5c4e] overflow-hidden" dir={isAr ? "rtl" : "ltr"}>

      {/* ── Navbar skeleton ── */}
      <div className="fixed top-0 left-0 right-0 z-50 h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 animate-pulse" />
            <div className="w-16 h-5 rounded-lg bg-white/10 animate-pulse" />
          </div>
          {/* Nav links */}
          <div className="hidden lg:flex items-center gap-6">
            {[72, 56, 80, 52, 64, 40].map((w, i) => (
              <div key={i} className="h-3.5 rounded-full bg-white/10 animate-pulse" style={{ width: w, animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
          {/* CTA */}
          <div className="flex items-center gap-2.5">
            <div className="w-20 h-7 rounded-full bg-white/10 animate-pulse" />
            <div className="w-24 h-9 rounded-xl bg-[#25D366]/40 animate-pulse" />
          </div>
        </div>
      </div>

      {/* ── Hero skeleton ── */}
      <div className="relative min-h-screen flex items-center pt-16">
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Content skeleton */}
            <div className="text-center lg:text-right space-y-5">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5">
                <div className="w-2 h-2 rounded-full bg-[#25D366]/60 animate-pulse" />
                <div className="w-32 h-3 rounded-full bg-white/15 animate-pulse" />
              </div>

              {/* H1 */}
              <div className="space-y-3">
                <div className="h-10 sm:h-12 lg:h-14 rounded-2xl bg-white/10 animate-pulse w-full" style={{ animationDelay: "80ms" }} />
                <div className="h-10 sm:h-12 rounded-2xl bg-white/10 animate-pulse w-4/5 mx-auto lg:mx-0" style={{ animationDelay: "140ms" }} />
              </div>

              {/* Subtitle */}
              <div className="space-y-2 pt-1">
                <div className="h-4 rounded-full bg-white/8 animate-pulse w-full" style={{ animationDelay: "200ms" }} />
                <div className="h-4 rounded-full bg-white/8 animate-pulse w-5/6 mx-auto lg:mx-0" style={{ animationDelay: "240ms" }} />
                <div className="h-4 rounded-full bg-white/8 animate-pulse w-3/4 mx-auto lg:mx-0" style={{ animationDelay: "280ms" }} />
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <div className="h-12 rounded-xl bg-[#25D366]/50 animate-pulse w-44" style={{ animationDelay: "440ms" }} />
                <div className="h-12 rounded-xl bg-white/10 animate-pulse w-40" style={{ animationDelay: "490ms" }} />
              </div>

              {/* Trust strip */}
              <div className="flex flex-wrap items-center gap-5 justify-center lg:justify-start">
                {[100, 120, 90].map((w, i) => (
                  <div key={i} className="h-3 rounded-full bg-white/8 animate-pulse" style={{ width: w, animationDelay: `${540 + i * 40}ms` }} />
                ))}
              </div>
            </div>

            {/* Automation Log skeleton — matches the new Hero mock */}
            <div className="flex justify-center lg:block mt-8 lg:mt-0">
              <div className="relative w-[320px] sm:w-[420px] lg:w-[500px] mx-auto">
                <div className="absolute inset-0 scale-105 bg-black/20 rounded-[1.75rem] blur-2xl" />
                <div className="relative bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden rotate-[-2deg]">
                  <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-6 w-36 rounded-lg bg-gray-200 animate-pulse" />
                      <div className="h-5 w-28 rounded-md bg-[#25D366]/20 animate-pulse" />
                    </div>
                    <div className="h-3 w-40 rounded-full bg-gray-100 animate-pulse" />
                  </div>
                  <div className="h-[2px] bg-gray-900 mx-5 sm:mx-6" />
                  <div className="h-[500px] sm:h-[560px] lg:h-[600px] overflow-hidden px-5 sm:px-6">
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="py-4 border-b border-dashed border-gray-100" style={{ height: 92, animationDelay: `${i * 80}ms` }}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-3 w-12 rounded-full bg-gray-100 animate-pulse" />
                          <div className="h-4 w-16 rounded bg-gray-100 animate-pulse" />
                        </div>
                        <div className="h-4 w-4/5 rounded-full bg-gray-200 animate-pulse mb-3" />
                        <div className="h-3 w-3/5 rounded-full bg-gray-100 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none">
            <path d="M0 80L60 72C120 64 240 48 360 44C480 40 600 48 720 52C840 56 960 56 1080 54C1200 52 1320 48 1380 46L1440 44V80H0Z" fill="white" />
          </svg>
        </div>
      </div>

    </div>
  );
}
