import { STATUS_CONFIG } from "./status-config";
import type { TemplateStatus } from "./types";

export function StatusBadge({ status, label }: { status: TemplateStatus; label: string }) {
    const cfg = STATUS_CONFIG[status];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {label}
        </span>
    );
}