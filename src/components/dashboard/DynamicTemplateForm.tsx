"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Image as ImageIcon, FileText, Video, Link as LinkIcon, Plus } from "lucide-react";
import { ParsedTemplate } from "@/hooks/useTemplateParser";
import { toast } from "sonner";

interface Props {
  parsedTemplate: ParsedTemplate;
  availableColumns: string[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  lang?: "ar" | "en";
}

const t = {
  headerMedia: { ar: "وسائط عنوان القالب (Header)", en: "Header Media" },
  uploading: { ar: "جاري الرفع...", en: "Uploading..." },
  uploadImage: { ar: "رفع صورة", en: "Upload Image" },
  uploadVideo: { ar: "رفع فيديو", en: "Upload Video" },
  uploadDoc: { ar: "رفع ملف PDF", en: "Upload PDF" },
  orLink: { ar: "أو أدخل رابط مباشر:", en: "Or enter direct link:" },
  headerVars: { ar: "متغيرات العنوان (Header)", en: "Header Variables" },
  bodyVars: { ar: "متغيرات النص (Body)", en: "Body Variables" },
  dynamicUrls: { ar: "روابط الأزرار (Buttons)", en: "Button Links" },
  varLabel: { ar: "متغير", en: "Variable" },
  mapColumn: { ar: "اختر العمود للمطابقة", en: "Select Column to Map" },
  enterStatic: { ar: "أو أدخل قيمة ثابتة...", en: "Or enter static value..." },
  btnLinkVal: { ar: "نهاية الرابط", en: "Link End Value" },
  staticVal: { ar: "[قيمة ثابتة]", en: "[Static Value]" },
  customValue: { ar: "قيمة يدوية (ثابتة)", en: "Manual (Static) Value" },
};

function tr(key: keyof typeof t, lang: "ar" | "en" = "ar") {
  return t[key][lang];
}

export function DynamicTemplateForm({ parsedTemplate, availableColumns, values, onChange, lang = "ar" }: Props) {
  const [uploading, setUploading] = useState(false);

  const updateValue = (key: string, val: string) => {
    onChange({ ...values, [key]: val });
  };

  const handleMediaUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/automation/upload", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); toast.error(e.error ?? "فشل الرفع"); return; }
      const { url } = await res.json();
      updateValue("headerMediaUrl", url);
      toast.success(lang === "ar" ? "تم رفع الملف بنجاح" : "File uploaded");
    } catch { toast.error(lang === "ar" ? "حدث خطأ أثناء الرفع" : "Upload failed"); }
    finally { setUploading(false); }
  };

  const renderVariableInput = (key: string, label: string) => {
    const val = values[key] ?? "";
    const isStaticMode = val.startsWith("STATIC:");
    const displayVal = isStaticMode ? "STATIC_MODE" : val;
    const staticText = isStaticMode ? val.replace("STATIC:", "") : "";

    return (
      <div key={key} className="space-y-2 mb-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</Label>
        {availableColumns.length > 0 ? (
          <div className="space-y-2">
            <Select value={displayVal} onValueChange={(v) => {
              if (v === "STATIC_MODE") updateValue(key, "STATIC:");
              else updateValue(key, v);
            }}>
              <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <SelectValue placeholder={tr("mapColumn", lang)} />
              </SelectTrigger>
              <SelectContent>
                {availableColumns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
                <SelectItem value="STATIC_MODE" className="text-blue-600 font-medium">
                  <span className="flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> {tr("customValue", lang)}</span>
                </SelectItem>
              </SelectContent>
            </Select>
            {isStaticMode && (
              <Input 
                placeholder={tr("enterStatic", lang)} 
                value={staticText} 
                onChange={e => updateValue(key, "STATIC:" + e.target.value)}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700" 
              />
            )}
          </div>
        ) : (
          <Input 
            placeholder={tr("enterStatic", lang)} 
            value={staticText || val} 
            onChange={e => updateValue(key, "STATIC:" + e.target.value)}
            className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300" dir={lang === "ar" ? "rtl" : "ltr"}>
      
      {/* Media Header */}
      {parsedTemplate.requiresHeaderMedia !== "NONE" && (
        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 p-4 rounded-xl">
          <Label className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-1.5">
            {parsedTemplate.requiresHeaderMedia === "IMAGE" ? <ImageIcon className="w-4 h-4" /> :
             parsedTemplate.requiresHeaderMedia === "VIDEO" ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {tr("headerMedia", lang)}
          </Label>

          <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition mb-3
            ${uploading ? "border-blue-300 bg-blue-50 dark:bg-blue-900/10" : "border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-white dark:hover:bg-gray-800"}`}>
            <input type="file" 
              accept={
                parsedTemplate.requiresHeaderMedia === "IMAGE" ? "image/jpeg,image/png,image/webp" :
                parsedTemplate.requiresHeaderMedia === "VIDEO" ? "video/mp4,video/3gpp" : 
                "application/pdf"
              } 
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); e.target.value = ""; }} 
            />
            {uploading ? (
              <><Loader2 className="w-5 h-5 text-blue-500 animate-spin mb-1" /><span className="text-xs text-blue-500 font-medium">{tr("uploading", lang)}</span></>
            ) : (
              <>
                <span className="text-gray-400 mb-1">
                  {parsedTemplate.requiresHeaderMedia === "IMAGE" ? <ImageIcon className="w-6 h-6" /> :
                   parsedTemplate.requiresHeaderMedia === "VIDEO" ? <Video className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {parsedTemplate.requiresHeaderMedia === "IMAGE" ? tr("uploadImage", lang) :
                   parsedTemplate.requiresHeaderMedia === "VIDEO" ? tr("uploadVideo", lang) : tr("uploadDoc", lang)}
                </span>
              </>
            )}
          </label>
          
          <div className="space-y-1">
            <span className="text-xs text-gray-400">{tr("orLink", lang)}</span>
            <Input 
              placeholder="https://..." 
              value={values.headerMediaUrl || ""} 
              onChange={e => updateValue("headerMediaUrl", e.target.value)}
              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-9"
            />
          </div>
          {values.headerMediaUrl && parsedTemplate.requiresHeaderMedia === "IMAGE" && (
             <div className="mt-3 relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={values.headerMediaUrl} alt="Preview" className="object-cover w-full h-full" />
             </div>
          )}
        </div>
      )}

      {/* Header Variables */}
      {parsedTemplate.headerVariablesCount > 0 && (
        <div className="bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
          <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">{tr("headerVars", lang)}</Label>
          {Array.from({ length: parsedTemplate.headerVariablesCount }).map((_, i) => 
            renderVariableInput(`header_${i + 1}`, `${tr("varLabel", lang)} {{${i + 1}}}`)
          )}
        </div>
      )}

      {/* Body Variables */}
      {parsedTemplate.bodyVariablesCount > 0 && (
        <div className="bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
          <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">{tr("bodyVars", lang)}</Label>
          {Array.from({ length: parsedTemplate.bodyVariablesCount }).map((_, i) => 
            renderVariableInput(`body_${i + 1}`, `${tr("varLabel", lang)} {{${i + 1}}}`)
          )}
        </div>
      )}

      {/* Dynamic Buttons */}
      {parsedTemplate.dynamicButtons.length > 0 && (
        <div className="bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
          <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5" /> {tr("dynamicUrls", lang)}
          </Label>
          {parsedTemplate.dynamicButtons.map((btn, idx) => 
            renderVariableInput(`button_${btn.index}`, `${tr("btnLinkVal", lang)} (${btn.url})`)
          )}
        </div>
      )}

    </div>
  );
}
