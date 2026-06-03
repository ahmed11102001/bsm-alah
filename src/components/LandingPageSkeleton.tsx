// ── LandingPageSkeleton ───────────────────────────────────────────────────────
// بيظهر بدل "جاري التحميل..." — يشبه الـ Hero الحقيقي تماماً
// بحيث الزائر مش حاسس بفرق بين الـ loading وبداية الصفحة

export default function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#064e45] via-[#075E54] to-[#0a7a6a] overflow-hidden">

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
        {/* grid bg */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* glows */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#25D366]/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-300/10 rounded-full blur-[80px]" />

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

              {/* Pills */}
              <div className="flex flex-wrap gap-2.5 justify-center lg:justify-start pt-1">
                {[120, 96, 108].map((w, i) => (
                  <div key={i} className="h-7 rounded-full bg-white/10 animate-pulse" style={{ width: w, animationDelay: `${320 + i * 50}ms` }} />
                ))}
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

            {/* Phone skeleton */}
            <div className="flex justify-center lg:block mt-8 lg:mt-0">
              <div className="relative w-[250px] sm:w-[290px] lg:w-[340px] mx-auto">
                {/* Glow */}
                <div className="absolute inset-0 scale-110 bg-[#25D366]/15 rounded-[3rem] blur-2xl" />
                {/* Frame */}
                <div className="relative bg-gray-900/80 rounded-[2.5rem] p-2.5 ring-1 ring-white/10 animate-pulse">
                  <div className="bg-[#ECE5DD]/20 rounded-[2rem] overflow-hidden">
                    {/* Header */}
                    <div className="bg-[#075E54]/80 px-4 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-white/20" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 rounded-full bg-white/20 w-16" />
                        <div className="h-2.5 rounded-full bg-white/15 w-12" />
                      </div>
                    </div>
                    {/* Chat area */}
                    <div className="h-[260px] sm:h-[320px] lg:h-[370px] p-4 space-y-4 flex flex-col justify-end">
                      {/* messages */}
                      <div className="flex justify-start">
                        <div className="h-10 rounded-2xl rounded-tl-none bg-white/15 w-3/4 animate-pulse" style={{ animationDelay: "200ms" }} />
                      </div>
                      <div className="flex justify-end">
                        <div className="h-14 rounded-2xl rounded-tr-none bg-[#25D366]/20 w-5/6 animate-pulse" style={{ animationDelay: "350ms" }} />
                      </div>
                      <div className="flex justify-end">
                        <div className="h-10 rounded-2xl rounded-tr-none bg-[#25D366]/20 w-2/3 animate-pulse" style={{ animationDelay: "450ms" }} />
                      </div>
                      {/* stats mini card */}
                      <div className="bg-white/10 rounded-xl p-3 animate-pulse" style={{ animationDelay: "550ms" }}>
                        <div className="flex gap-3">
                          <div className="flex-1 h-8 rounded-lg bg-white/10" />
                          <div className="flex-1 h-8 rounded-lg bg-white/10" />
                        </div>
                      </div>
                    </div>
                    {/* Input */}
                    <div className="bg-white/10 px-3 py-2.5 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-white/20" />
                      <div className="flex-1 h-7 rounded-full bg-white/15 animate-pulse" />
                      <div className="w-8 h-8 rounded-full bg-[#25D366]/40 animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Floating cards */}
                <div className="hidden sm:block absolute -top-4 -right-10 lg:-right-14 bg-white/10 rounded-2xl p-3 w-36 h-14 animate-pulse" />
                <div className="hidden sm:block absolute -bottom-4 -left-10 lg:-left-14 bg-white/10 rounded-2xl p-3 w-36 h-14 animate-pulse" />
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