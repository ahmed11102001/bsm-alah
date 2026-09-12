// src/lib/session-invalidation.ts
// ══════════════════════════════════════════════════════════════════════════════
//  إجبار إعادة تحقق فورية من صلاحيات JWT عند تغيير الدور (Role) لعضو فريق.
//
//  المشكلة (Production Audit — البند 🟠3):
//  الـjwt callback في auth.ts بيتحقق من الداتابيز كل 5 دقائق بس (isSuperVerifiedAt
//  cache) عشان مبيحملش الداتابيز في كل request. ده معناه لو الـOwner نزّل صلاحية
//  عضو (FULL_ACCESS → CHAT_ONLY) أو مسحه، العضو المتأثر ممكن يفضل عنده صلاحياته
//  القديمة (فعليًا، مش بس شكل الواجهة) لغاية 5 دقائق كاملة.
//
//  الحل: بدل ما نعتمد بس على الوقت، بنحط "علامة" في Redis (نفس الـUpstash instance
//  المستخدم في rate-limit.ts) لحظة تغيير الدور. الـjwt callback بيتحقق من العلامة
//  دي على كل request (عملية Redis سريعة جدًا، مش زي DB query كامل)، ولو لاقاها
//  أحدث من آخر مرة اتأكد فيها الـtoken → يعمل refresh فوري من الداتابيز بدل ما
//  يستنى الـ5 دقائق. الـcache الزمني القديم بيفضل موجود كـSafety Net لو Redis
//  مش شغال أو الـflag اتمسح.
// ══════════════════════════════════════════════════════════════════════════════

import { Redis } from "@upstash/redis";

const PREFIX = "role-changed:";
// كافي إنه يغطي أطول فترة ممكنة نحتاجها (أكبر من الـcache window في auth.ts بكتير)
const FLAG_TTL_SECS = 30 * 60; // 30 دقيقة

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
    if (redisClient !== undefined) return redisClient;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        // مفيش Redis متحط (Dev غالبًا) — بنرجع null ونسيب الـcache الزمني العادي
        // في auth.ts يشتغل لوحده كـfallback. مفيش داعي نرمي Error هنا لأن الميزة
        // دي "تحسين" مش شرط أساسي لتشغيل الـauth نفسه.
        redisClient = null;
        return null;
    }

    redisClient = new Redis({ url, token });
    return redisClient;
}

/**
 * ينادى عليها فورًا بعد أي تغيير في دور/صلاحية عضو (تعديل Role أو حذف العضو)
 * من src/app/api/team/route.ts. بتسجّل timestamp الحدث في Redis.
 */
export async function markRoleChanged(userId: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return; // fallback صامت — الـcache الزمني العادي (5 دقائق) هيغطي الحالة دي

    try {
        await redis.set(`${PREFIX}${userId}`, Date.now(), { ex: FLAG_TTL_SECS });
    } catch (error) {
        // فشل هنا لازم يكون صامت تمامًا — الميزة دي تحسين إضافي، ومينفعش نكسر
        // عملية تغيير الدور نفسها (اللي نجحت في الداتابيز بالفعل) بسبب مشكلة Redis.
        console.error("[session-invalidation] فشل تسجيل علامة تغيير الدور:", error);
    }
}

/**
 * ينادى عليها من jwt callback في auth.ts على كل request. بترجع true لو فيه
 * تغيير دور حصل بعد آخر مرة اتأكد فيها الـtoken (lastVerifiedAt)، يعني لازم
 * refresh فوري من الداتابيز بدل ما نستنى انتهاء الـ5 دقائق.
 */
export async function wasRoleChangedSince(
    userId: string,
    lastVerifiedAt: number
): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false; // مفيش Redis → الـcache الزمني العادي هو المرجع الوحيد

    try {
        const flaggedAt = await redis.get<number>(`${PREFIX}${userId}`);
        return typeof flaggedAt === "number" && flaggedAt > lastVerifiedAt;
    } catch (error) {
        console.error("[session-invalidation] فشل قراءة علامة تغيير الدور:", error);
        return false; // في الشك، منمنعش الطلب — الـcache الزمني العادي هيتكفل بيها
    }
}