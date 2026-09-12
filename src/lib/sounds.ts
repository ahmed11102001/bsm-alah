// src/lib/sounds.ts
// ─── أصوات واجهة مولّدة بـWebAudio (بدون ملفات) ─────────────────────────────
//  - playSendSound: صوت إرسال الرسالة — "blip" واحد خفيف صاعد (إحساس الانطلاق).
//    مختلف عمدًا عن صوت الإشعارات (NotificationBell: رنتان E5→A5 باضمحلال
//    طويل): هنا نغمة واحدة أقصر وأخف (0.22 ثانية) وانزلاق صاعد بدل الدرجتين.
//  - القواعد: try/catch دائمًا + إغلاق الـcontext بعد الانتهاء (لا تسريب) +
//    التشغيل فقط بعد تفاعل/نجاح (سياسات المتصفح تمنع التشغيل التلقائي).

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    if (!sharedCtx || sharedCtx.state === "closed") {
      sharedCtx = new AC();
    }
    if (sharedCtx.state === "suspended") {
      void sharedCtx.resume();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

export function playSendSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    // موجة sine ناعمة + انزلاق صاعد خفيف 740 → 1180Hz خلال 0.08 ثانية
    osc.type = "sine";
    osc.frequency.setValueAtTime(740, t0);
    osc.frequency.exponentialRampToValueAtTime(1180, t0 + 0.08);

    // غلاف هادئ: ذروة منخفضة (0.10) واضمحلال سريع — خفيف ومريح
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(0.1, t0 + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);

    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.25);
  } catch {
    /* المتصفح منع الصوت — يُتجاهل بصمت */
  }
}

/**
 * صوت تنقل هادئ وصغير ومريح جداً عند النقر على أي صفحة في السايدبار
 * تردد دافئ 480Hz → 380Hz مع ذروة منخفضة (0.04) وانحدار ناعم وسريع (0.08 ثانية)
 */
export function playNavSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    // نغمة sine دافئة ونقية تشبه نقرة خشبية / قطرة ماء خفيفة ومريحة
    osc.type = "sine";
    osc.frequency.setValueAtTime(480, t0);
    osc.frequency.exponentialRampToValueAtTime(360, t0 + 0.05);

    // مستوى صوت هادئ ومريح جداً مع غلاف ناعم بدون أي طقطقة حادة
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(0.04, t0 + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);

    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.085);
  } catch {
    /* المتصفح منع الصوت — يُتجاهل بصمت */
  }
}

