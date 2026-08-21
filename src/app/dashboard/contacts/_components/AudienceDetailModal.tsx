"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Audience } from "./types";

type Props = {
  audience: Audience | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Audience) => void;
};

export function AudienceDetailModal({ audience, open, onClose, onSave }: Props) {
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<Audience | null>(audience);

  useEffect(() => {
    setCurrent(audience);
  }, [audience]);

  const save = async () => {
    if (!current) return;
    setLoading(true);
    try {
      // Keep the existing audience object intact. The dedicated audience page
      // handles the full customer-management experience.
      onSave(current);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent dir="rtl" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{current?.name ?? "الجمهور"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {current ? (
            <>
              <div className="rounded-xl border p-4">
                <div className="text-sm text-muted-foreground">عدد العملاء</div>
                <div className="mt-1 text-2xl font-bold">
                  {Number(current.contactCount ?? 0).toLocaleString("ar-EG")}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                تمت ترقية إدارة الجمهور إلى صفحة مستقلة للحصول على مساحة أكبر
                وإمكانيات البحث والفلاتر وإدارة العملاء.
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>إغلاق</Button>
          {current && (
            <Button onClick={save} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              حفظ
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
