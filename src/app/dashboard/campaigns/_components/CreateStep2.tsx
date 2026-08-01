import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { DynamicTemplateForm } from "@/components/dashboard/DynamicTemplateForm";
import { tr } from "./i18n";
import type { Template, Lang } from "./types";

export function CreateStep2({
  templates, selectedTemplate, setSelectedTemplate, setTemplateVarValues,
  parsedTemplate, availableColumns, templateVarValues, audienceSource,
  onBack, onNext, lang,
}: {
  templates: Template[]; selectedTemplate: Template | null; setSelectedTemplate: (t: Template) => void;
  setTemplateVarValues: (v: Record<string, string>) => void;
  parsedTemplate: any; availableColumns: string[]; templateVarValues: Record<string, string>;
  audienceSource: "excel" | "contacts" | null;
  onBack: () => void; onNext: () => void; lang: Lang;
}) {
  return (
    <div className="space-y-5">
      {templates.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{tr("noTemplates", lang)}</p>
        </div>
      ) : (
        <>
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{tr("chooseTemplate", lang)}</Label>
            <Select value={selectedTemplate?.name ?? ""} onValueChange={v => {
              const tmpl = templates.find(t => t.name === v);
              if (tmpl) { setSelectedTemplate(tmpl); setTemplateVarValues({}); }
            }}>
              <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600"><SelectValue /></SelectTrigger>
              <SelectContent>
                {templates.map(t => <SelectItem key={t.id} value={t.name}>{t.name} <span className="text-gray-400 text-xs mr-1">{t.language}</span></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {selectedTemplate && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">{tr("templatePreview", lang)}</p>
              <div className="bg-white dark:bg-gray-800 rounded-xl rounded-tl-sm shadow-sm border border-gray-100 dark:border-gray-700 p-3 max-w-xs text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                {selectedTemplate.content || "—"}
              </div>
              <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full ${["approved", "APPROVED"].includes(selectedTemplate.status) ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"}`}>
                {["approved", "APPROVED"].includes(selectedTemplate.status) ? tr("approved", lang) : tr("pending", lang)}
              </span>
            </div>
          )}

          {/* ── Dynamic Variable Mapping Form ───────────────────── */}
          {selectedTemplate && (
            parsedTemplate.requiresHeaderMedia !== "NONE" ||
            parsedTemplate.headerVariablesCount > 0 ||
            parsedTemplate.bodyVariablesCount > 0 ||
            parsedTemplate.dynamicButtons.length > 0
          ) && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                {availableColumns.length > 0 && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                    <Users className="w-3.5 h-3.5 flex-shrink-0" />
                    {lang === "ar"
                      ? `تم تحميل ${availableColumns.length} عمود من ${audienceSource === "excel" ? "ملف الإكسيل" : "قائمة جهات الاتصال"} — اربط كل متغير بالعمود المناسب`
                      : `${availableColumns.length} columns loaded from ${audienceSource === "excel" ? "Excel file" : "contact list"} — map each variable to the right column`}
                  </div>
                )}
                <DynamicTemplateForm
                  parsedTemplate={parsedTemplate}
                  availableColumns={availableColumns}
                  values={templateVarValues}
                  onChange={setTemplateVarValues}
                  lang={lang}
                />
              </div>
            )}
        </>
      )}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1 gap-2 dark:border-gray-600 dark:text-gray-300" onClick={onBack}>
          {lang === "ar" ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />} {tr("prev", lang)}
        </Button>
        <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2" onClick={onNext} disabled={!selectedTemplate}>
          {tr("nextSettings", lang)} {lang === "ar" ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}