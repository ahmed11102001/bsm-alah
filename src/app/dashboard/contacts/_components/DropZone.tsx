"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const { t } = useLanguage();
  const dz = t.contacts.dropzone;
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handle = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) { toast.error(dz.typeErr); return; }
    onFile(f);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
      onClick={() => ref.current?.click()}
      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl
        p-10 cursor-pointer transition-all select-none
        ${over
          ? "border-green-400 bg-green-50 dark:bg-green-900/20"
          : "border-gray-200 dark:border-gray-600 hover:border-green-300 hover:bg-gray-50 dark:hover:bg-gray-700/40"}`}
    >
      <FileSpreadsheet className={`w-12 h-12 ${over ? "text-green-500" : "text-gray-300 dark:text-gray-500"}`} />
      <div className="text-center">
        <p className="font-medium text-gray-700 dark:text-gray-300">{dz.drag}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{dz.formats}</p>
      </div>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden"
        onChange={e => handle(e.target.files)} />
    </div>
  );
}