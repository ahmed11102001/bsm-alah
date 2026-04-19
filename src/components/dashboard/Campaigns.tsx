"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  Send,
  Plus,
  Calendar,
  ChevronLeft,
  FileSpreadsheet,
  X,
  Megaphone,
  Trash2,
  Play,
  Users,
} from "lucide-react";

export default function Campaigns() {
  const { data: session } = useSession();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [campaigns, setCampaigns] = useState<any[]>([]);

  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [template, setTemplate] = useState("");

  const [campaignName, setCampaignName] = useState("");
  const [numbers, setNumbers] = useState<string[]>([]);
  const [manualNumbers, setManualNumbers] = useState("");
  const [scheduleTime, setScheduleTime] = useState("now");
  const [dateTime, setDateTime] = useState("");

  // ===============================
  // تحميل الحملات من الداتابيز
  // ===============================
  const loadCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns", {
        cache: "no-store",
      });

      const data = await res.json();

      if (res.ok) {
        setCampaigns(data);
      }
    } catch (error) {
      console.error("Error loading campaigns:", error);
    }
  };

  // ===============================
  // تحميل القوالب
  // ===============================
  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter((t: any) => {
          const status = t.status?.toLowerCase();
          return status === "approved" || status === "pending";
        });

        setAvailableTemplates(filtered);

        if (filtered.length > 0) {
          setTemplate(filtered[0].name);
        }
      })
      .catch((err) => console.error("Error fetching templates:", err));
  }, []);

  // ===============================
  // تحميل الحملات أول ما الصفحة تفتح
  // ===============================
  useEffect(() => {
    loadCampaigns();
  }, []);

  const isValidEgyptianNumber = (num: string) => {
    return /^20\d{10}$/.test(num);
  };

  const cleanNumber = (num: string) => {
    let cleaned = num.replace(/[^0-9]/g, "");

    if (cleaned.startsWith("0")) {
      cleaned = "20" + cleaned.slice(1);
    }

    if (!cleaned.startsWith("20") && cleaned.length === 10) {
      cleaned = "20" + cleaned;
    }

    return cleaned;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      const bstr = (evt.target as any).result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];

      const data = XLSX.utils.sheet_to_json(ws, {
        header: 1,
      }) as any[][];

      const extractedNumbers = data
        .flat()
        .map((n) => cleanNumber(String(n).trim()))
        .filter(isValidEgyptianNumber);

      setNumbers((prev) => [...new Set([...prev, ...extractedNumbers])]);

      alert(`✅ تم استخراج ${extractedNumbers.length} رقم صالح`);
    };

    reader.readAsBinaryString(file);
  };

  const removeNumber = (indexToRemove: number) => {
    setNumbers(numbers.filter((_, index) => index !== indexToRemove));
  };

  const goToStep2 = () => {
    const manualArr = manualNumbers
      .split("\n")
      .map((n) => cleanNumber(n.trim()))
      .filter(isValidEgyptianNumber);

    const allNumbers = [...new Set([...numbers, ...manualArr])];

    if (allNumbers.length === 0) {
      alert("❌ أضف أرقام أولاً");
      return;
    }

    setNumbers(allNumbers);
    setManualNumbers("");
    setStep(2);
  };

  const resetForm = () => {
    setStep(1);
    setCampaignName("");
    setNumbers([]);
    setManualNumbers("");
    setScheduleTime("now");
    setDateTime("");
  };

  const getTemplatePreview = () => {
    const found = availableTemplates.find((t) => t.name === template);
    return found ? found.content : "لا يوجد معاينة";
  };

  // ===============================
  // إنشاء حملة
  // ===============================
  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      alert("❌ أدخل اسم الحملة");
      return;
    }

    if (numbers.length === 0) {
      alert("❌ أضف أرقام أولاً");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: campaignName,
          templateName: template,
          numbers,
          scheduled: scheduleTime !== "now" ? dateTime : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل إنشاء الحملة");
      }

      await loadCampaigns();

      alert("✅ تم إنشاء الحملة بنجاح");

      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      alert(error.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "completed" || status === "sent") {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
          ✅ تم الإرسال
        </span>
      );
    }

    return (
      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
        ⏰ قيد التنفيذ
      </span>
    );
  };

  return (
    <div className="p-4 lg:p-8" dir="rtl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            الحملات التسويقية
          </h1>
          <p className="text-gray-600">إدارة حملات واتساب</p>
        </div>

        <Button
          className="bg-green-500 hover:bg-green-600 text-white"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="ml-2 w-4 h-4" />
          حملة جديدة
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Megaphone className="w-20 h-20 text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-700">
            لا يوجد حملات حالياً
          </h3>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="p-4">
                <div className="flex justify-between gap-4">
                  <div>
                    <h3 className="font-bold">{campaign.name}</h3>

                    <div className="text-sm text-gray-500 mt-2 flex gap-3 flex-wrap">
                      <span>{campaign.sentCount || 0} مستلم</span>
                      {getStatusBadge(campaign.status)}
                    </div>
                  </div>

                  <Button variant="outline" size="sm">
                    <Play className="w-4 h-4 ml-1" />
                    تفاصيل
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      >
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء حملة</DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".xlsx,.xls"
              />

              <Textarea
                value={manualNumbers}
                onChange={(e) =>
                  setManualNumbers(e.target.value)
                }
                placeholder="رقم في كل سطر"
              />

              <Button
                className="w-full bg-green-500 text-white"
                onClick={goToStep2}
              >
                التالي
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Select
                onValueChange={setTemplate}
                defaultValue={template}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {availableTemplates.map((t) => (
                    <SelectItem
                      key={t.id}
                      value={t.name}
                    >
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="bg-gray-100 p-3 rounded">
                {getTemplatePreview()}
              </div>

              <Button
                className="w-full bg-green-500 text-white"
                onClick={() => setStep(3)}
              >
                التالي
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Input
                value={campaignName}
                onChange={(e) =>
                  setCampaignName(e.target.value)
                }
                placeholder="اسم الحملة"
              />

              <Button
                className="w-full bg-green-500 text-white"
                onClick={handleCreateCampaign}
                disabled={loading}
              >
                {loading ? "جاري..." : "إنشاء الحملة"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}