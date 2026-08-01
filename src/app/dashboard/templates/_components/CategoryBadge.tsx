import { CATEGORY_CONFIG } from "./status-config";
import { T } from "./i18n";
import type { TemplateCategory, Lang } from "./types";

export function CategoryBadge({ category, lang }: { category: TemplateCategory; lang: Lang }) {
    const cfg = CATEGORY_CONFIG[category];
    const t = T[lang];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${cfg.cls}`}>
            {cfg.icon} {t.category[category]}
        </span>
    );
}