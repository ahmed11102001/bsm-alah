"use client";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export default function AudiencesPage() {
  const [audiences, setAudiences] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [numbers, setNumbers] = useState<string[]>([]);
  const [audienceName, setAudienceName] = useState("");
  const [manualNumber, setManualNumber] = useState("");

  // ================= API =================
  const fetchAudiences = async () => {
    try {
      const res = await fetch("/api/audiences");
      const data = await res.json();
      setAudiences(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAudiences();
  }, []);

  // ================= Helpers =================
  const cleanNumber = (num: string) => {
    let cleaned = num.replace(/[^0-9]/g, "");
    if (cleaned.startsWith("0")) cleaned = "20" + cleaned.slice(1);
    if (!cleaned.startsWith("20") && cleaned.length === 10) cleaned = "20" + cleaned;
    return cleaned;
  };

  const isValid = (num: string) => /^20\d{10}$/.test(num);

  const reset = () => {
    setNumbers([]);
    setAudienceName("");
    setManualNumber("");
    setStep(1);
  };

  // ================= Excel =================
  const handleFile = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt: any) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      const extracted = data
        .flat()
        .map((n) => cleanNumber(String(n)))
        .filter(isValid);

      setNumbers([...new Set(extracted)]);
    };

    reader.readAsBinaryString(file);
  };

  // ================= Manual Add =================
  const addManualNumber = () => {
    if (!manualNumber) return;

    const cleaned = cleanNumber(manualNumber);

    if (!isValid(cleaned)) {
      alert("❌ الرقم غير صالح");
      return;
    }

    setNumbers((prev) => [...new Set([...prev, cleaned])]);
    setManualNumber("");
  };

  const removeNumber = (index: number) => {
    setNumbers(numbers.filter((_, i) => i !== index));
  };

  // ================= Save =================
  const handleSave = async () => {
    if (!audienceName || numbers.length === 0) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/audiences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: audienceName,
          contacts: numbers
            .filter(isValid)
            .map((num) => ({ phone: String(num) })),
        }),
      });

      if (!res.ok) throw new Error();

      alert("✅ تم الحفظ بنجاح");

      setIsOpen(false);
      reset();
      fetchAudiences();
    } catch (err) {
      alert("❌ فشل الحفظ");
    } finally {
      setIsLoading(false);
    }
  };

  // ================= Delete =================
  const deleteAudience = async (id: number) => {
    if (!confirm("متأكد؟")) return;

    try {
      await fetch("/api/audiences", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      fetchAudiences();
    } catch {
      alert("❌ فشل الحذف");
    }
  };

  // ================= Add Number to Existing Audience =================
  const addNumberToAudience = async (audienceId: number) => {
    const number = prompt("أدخل الرقم:");
    if (!number) return;

    const cleaned = cleanNumber(number);

    if (!isValid(cleaned)) {
      alert("❌ رقم غلط");
      return;
    }

    try {
      await fetch(`/api/audiences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: audienceId,
          number: cleaned 
        }),
      });

      fetchAudiences();
    } catch {
      alert("❌ فشل الإضافة");
    }
  };

  // ================= UI =================
  return (
    <div className="p-6" dir="rtl">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">الجمهور</h1>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة جمهور
        </Button>
      </div>

      {audiences.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          مفيش جمهور لسه
        </div>
      ) : (
        <div className="grid gap-4">
          {audiences.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-bold">{a.name}</h3>
                    <p className="text-sm text-gray-500">
                      {a.contacts?.length || 0} رقم
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => addNumberToAudience(a.id)}>
                      <Plus className="w-4 h-4 ml-1" />
                    </Button>

                    <Button
                      size="sm"
                      className="text-red-600"
                      onClick={() => deleteAudience(a.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {a.contacts?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {a.contacts.slice(0, 5).map((c: any, i: number) => (
                      <span key={i} className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {c.phone}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء جمهور</DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <input type="file" onChange={handleFile} />

              <Button disabled={!numbers.length} onClick={() => setStep(2)}>
                التالي
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Input
                placeholder="رقم"
                value={manualNumber}
                onChange={(e) => setManualNumber(e.target.value)}
              />
              <Button onClick={addManualNumber}>إضافة رقم</Button>

              <Input
                placeholder="اسم الجمهور"
                value={audienceName}
                onChange={(e) => setAudienceName(e.target.value)}
              />

              <p>📱 {numbers.length} رقم</p>

              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? "..." : "حفظ"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}