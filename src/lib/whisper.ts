// src/lib/whisper.ts
// ─── OpenAI Whisper — تحويل صوت → نص (STT) ───────────────────────────────────
//
// المهمة الوحيدة: رابط صوت (Cloudinary) → نص.
// بيتستخدم بس لما provider الـ AI Agent = "openai"، عشان gpt-4o-mini مش بيقدر
// يقرا صوت مباشرة زي Gemini. لو provider = "gemini" مش محتاجين الملف ده خالص.

export interface TranscriptionResult {
    ok: boolean;
    text?: string;
    durationSeconds?: number; // ← جديد: لحساب تكلفة تقريبية بالتوكنز
    error?: string;
}

export async function transcribeAudio(
    audioUrl: string,
    apiKey: string,
): Promise<TranscriptionResult> {
    if (!audioUrl?.trim()) return { ok: false, error: "audioUrl فاضي" };
    if (!apiKey?.trim()) return { ok: false, error: "OPENAI_API_KEY is missing" };

    try {
        // ── Step 1: نزّل الصوت من Cloudinary ──────────────────────────────────
        const audioRes = await fetch(audioUrl);
        if (!audioRes.ok) {
            return { ok: false, error: `فشل تنزيل الصوت: ${audioRes.status}` };
        }
        const audioBlob = await audioRes.blob();

        // ── Step 2: ابعته لـ Whisper ──────────────────────────────────────────
        // response_format: verbose_json عشان نلاقي "duration" في الرد ونحسب
        // عليها تكلفة تقريبية بالتوكنز (Whisper بيتحاسب بالدقيقة مش بالتوكنز أصلاً)
        const formData = new FormData();
        formData.append("file", audioBlob, "voice-message.ogg");
        formData.append("model", "whisper-1");
        formData.append("response_format", "verbose_json");
        // اختياري: لو عايز تجبره يفهم إنها عربي ساعات بيحسّن الدقة
        // formData.append("language", "ar");

        const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: formData,
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("[WHISPER] Error:", res.status, err);
            return { ok: false, error: `Whisper error ${res.status}` };
        }

        const data = await res.json();
        const text: string = data?.text?.trim() ?? "";
        if (!text) return { ok: false, error: "Whisper رجّع نص فاضي" };

        const durationSeconds: number | undefined =
            typeof data?.duration === "number" ? data.duration : undefined;

        return { ok: true, text, durationSeconds };
    } catch (err: any) {
        console.error("[WHISPER] Network error:", err);
        return { ok: false, error: err.message ?? "Network error" };
    }
}

// ─── تحويل تكلفة Whisper (بالدقيقة) لـ "توكنز مكافئة" ───────────────────────
//
// المنطق: Whisper بيتحاسب $0.006/دقيقة، وده مش وحدة توكنز فعلاً، لكن نظام
// الـ quota بتاعنا (checkAITokensLimit / incrementAITokens) شغال بالتوكنز بس.
// عشان استهلاك الصوت يتحسب ضمن نفس حد العميل، بنحوّل تكلفته المادية لعدد
// توكنز GPT-4o-mini مكافئ بنفس القيمة تقريبًا (بسعر مخلوط ~$0.20 لكل مليون
// توكن input+output، وده تقدير وليس سعر دقيق 100%).
//
// الحساب: (دقايق الصوت × $0.006) ÷ ($0.20 / 1,000,000) ≈ 30,000 توكن/دقيقة
const WHISPER_COST_PER_MINUTE_USD = 0.006;
const GPT4O_MINI_BLENDED_COST_PER_TOKEN_USD = 0.20 / 1_000_000;

export function estimateWhisperTokens(durationSeconds: number): number {
    const minutes = durationSeconds / 60;
    const costUsd = minutes * WHISPER_COST_PER_MINUTE_USD;
    return Math.ceil(costUsd / GPT4O_MINI_BLENDED_COST_PER_TOKEN_USD);
}