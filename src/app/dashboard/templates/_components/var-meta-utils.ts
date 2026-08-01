// استخراج أرقام المتغيرات من الـ body الأصلي بالترتيب مع metadata
export function extractVarMeta(originalBody: string): { num: number; meaning_ar: string; meaning_en: string }[] {
    const ORDER_CONFIRM_VARS: Record<number, { ar: string; en: string }> = {
        1: { ar: "اسم العميل", en: "Customer Name" },
        2: { ar: "رقم الطلب", en: "Order Number" },
        3: { ar: "إجمالي الطلب", en: "Order Total" },
    };
    const ORDER_SHIPPED_VARS: Record<number, { ar: string; en: string }> = {
        1: { ar: "اسم العميل", en: "Customer Name" },
        2: { ar: "رقم الطلب", en: "Order Number" },
        3: { ar: "رقم التتبع", en: "Tracking Number" },
    };
    const CART_ABANDON_VARS: Record<number, { ar: string; en: string }> = {
        1: { ar: "اسم العميل", en: "Customer Name" },
        2: { ar: "اسم المنتج", en: "Product Name" },
        3: { ar: "إجمالي السلة", en: "Cart Total" },
        4: { ar: "رابط السلة", en: "Cart URL" },
    };

    const nums = [...new Set([...originalBody.matchAll(/\{\{(\d+)\}\}/g)].map(m => parseInt(m[1])))].sort((a, b) => a - b);
    const map = originalBody.includes("التتبع") || originalBody.includes("tracking")
        ? ORDER_SHIPPED_VARS
        : originalBody.includes("سلتك") || originalBody.includes("cart")
            ? CART_ABANDON_VARS
            : ORDER_CONFIRM_VARS;

    return nums.map(n => ({
        num: n,
        meaning_ar: map[n]?.ar ?? `متغير ${n}`,
        meaning_en: map[n]?.en ?? `Variable ${n}`,
    }));
}

// التحقق أن جميع المتغيرات الأصلية لا تزال موجودة في النص المعدّل
export function validateVarsPreserved(original: string, edited: string): boolean {
    const origVars = [...original.matchAll(/\{\{(\d+)\}\}/g)].map(m => m[1]);
    const editVars = [...edited.matchAll(/\{\{(\d+)\}\}/g)].map(m => m[1]);
    return origVars.every(v => editVars.includes(v));
}