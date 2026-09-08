// src/lib/sounds.ts
// ─── أصوات واجهة مولّدة بـWebAudio (بدون ملفات) ─────────────────────────────
//  - playSendSound: صوت إرسال الرسالة — "blip" واحد خفيف صاعد (إحساس الانطلاق).
//    مختلف عمدًا عن صوت الإشعارات (NotificationBell: رنتان E5→A5 باضمحلال
//    طويل): هنا نغمة واحدة أقصر وأخف (0.22 ثانية) وانزلاق صاعد بدل الدرجتين.
//  - القواعد: try/catch دائمًا + إغلاق الـcontext بعد الانتهاء (لا تسريب) +
//    التشغيل فقط بعد تفاعل/نجاح (سياسات المتصفح تمنع التشغيل التلقائي).

function createContext(): AudioContext | null {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function playSendSound() {
  try {
    const ctx = createContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    // موجة sine ناعمة + انزلاق صاعد خفيف 740 → 1180Hz خلال 0.08 ثانية
    osc.type = "sine";
    osc.frequency.setValueAtTime(740, t0);
    osc.frequency.exponentialRampToValueAtTime(1180, t0 + 0.08);

    // غلاف هادئ: ذروة منخفضة (0.10) واضمحلال سريع — خفيف ومريح
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(0.1, t0 + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);

    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.25);

    window.setTimeout(() => void ctx.close().catch(() => undefined), 800);
  } catch {
    /* المتصفح منع الصوت — يُتجاهل بصمت */
  }
}
