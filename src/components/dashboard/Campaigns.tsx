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
  DialogDescription,
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
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  content: string;
  status: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  template: {
    name: string;
  };
}

export default function Campaigns() {
  const { data: session } = useSession();

  // State للحملات
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  // State للـ Dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // State للقوالب
  const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);
  const [selectedTemplateContent, setSelectedTemplateContent] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(""); // ✅ جديد: خزن الـ ID
  const [template, setTemplate] = useState(""); // ده الاسم

  // State لنموذج الحملة
  const [campaignName, setCampaignName] = useState("");
  const [numbers, setNumbers] = useState<string[]>([]);
  const [manualNumbers, setManualNumbers] = useState("");
  const [scheduleTime, setScheduleTime] = useState("now");
  const [dateTime, setDateTime] = useState("");

  // ===============================
  // تحميل الحملات
  // ===============================
  const loadCampaigns = async () => {
    try {
      setLoadingCampaigns(true);
      const res = await fetch("/api/campaigns", {
        cache: "no-store",
      });

      const data = await res.json();

      if (res.ok) {
        // ✅ لو الرجع array مباشرة
        if (Array.isArray(data)) {
          setCampaigns(data);
        }
        // ✅ لو الرجع { data: [] }
        else if (data.data && Array.isArray(data.data)) {
          setCampaigns(data.data);
        }
        else {
          setCampaigns([]);
        }
      } else {
        console.error("Error loading campaigns:", data.error);
        setCampaigns([]);
      }
    } catch (error) {
      console.error("Error loading campaigns:", error);
      setCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // ===============================
  // تحميل القوالب
  // ===============================
  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => {
        const templates = Array.isArray(data) ? data : data.data || [];
        const filtered = templates.filter((t: Template) => {
          const status = t.status?.toLowerCase();
          return status === "approved" || status === "pending";
        });

        setAvailableTemplates(filtered);

        if (filtered.length > 0) {
          setTemplate(filtered[0].name);
          setSelectedTemplateId(filtered[0].id); // ✅ خزن الـ ID
          setSelectedTemplateContent(filtered[0].content);
        }
      })
      .catch((err) => console.error("Error fetching templates:", err));
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    const found = availableTemplates.find((t) => t.name === template);
    if (found) {
      setSelectedTemplateId(found.id); // ✅ خزن الـ ID
      setSelectedTemplateContent(found.content);
    }
  }, [template, availableTemplates]);

  // ===============================
  // دوال معالجة الأرقام
  // ===============================
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

      alert(`✅ تم استخراج ${extractedNumbers.length} رقم صالح من الملف`);
      e.target.value = "";
    };

    reader.readAsBinaryString(file);
  };

  const removeNumber = (indexToRemove: number) => {
    setNumbers(numbers.filter((_, index) => index !== indexToRemove));
  };

  const clearAllNumbers = () => {
    if (confirm("هل أنت متأكد من حذف جميع الأرقام؟")) {
      setNumbers([]);
    }
  };

  const goToStep2 = () => {
    const manualArr = manualNumbers
      .split("\n")
      .map((n) => cleanNumber(n.trim()))
      .filter(isValidEgyptianNumber);

    const allNumbers = [...new Set([...numbers, ...manualArr])];

    if (allNumbers.length === 0) {
      alert("❌ من فضلك أضف أرقام جهات الاتصال أولاً");
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
    if (availableTemplates.length > 0) {
      setTemplate(availableTemplates[0].name);
      setSelectedTemplateId(availableTemplates[0].id);
    }
  };

  // ===============================
  // إنشاء حملة ✅ المعدلة
  // ===============================
  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      alert("❌ من فضلك أدخل اسم للحملة");
      return;
    }

    if (numbers.length === 0) {
      alert("❌ من فضلك أضف أرقام جهات الاتصال أولاً");
      return;
    }

    // ✅ استخدام selectedTemplateId بدل الاسم
    if (!selectedTemplateId) {
      alert("❌ من فضلك اختر قالب أولاً");
      return;
    }

    const confirmed = confirm(
      `🚀 تأكيد إرسال الحملة:\n\n` +
      `📋 الاسم: ${campaignName}\n` +
      `📱 عدد المستلمين: ${numbers.length}\n` +
      `📝 القالب: ${template}\n` +
      `⏰ التوقيت: ${scheduleTime === "now" ? "فوراً" : dateTime}\n\n` +
      `هل أنت متأكد من إرسال الحملة؟`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      // ✅ التعديل المهم: أرسل templateName بالاسم (لأن الـ API بيبحث بالاسم)
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: campaignName,
          templateName: template, // ✅ أرسل الاسم مش الـ ID
          numbers: numbers,
          scheduledAt: scheduleTime !== "now" ? dateTime : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل إنشاء الحملة");
      }

      if (data.success) {
        alert(
          `✅ تم إنشاء الحملة بنجاح!\n\n` +
          `📨 تم الإرسال: ${data.sentCount} رسالة\n` +
          `❌ فشل الإرسال: ${data.failedCount} رسالة`
        );
      } else if (data.message) {
        alert(`✅ ${data.message}`);
      }

      await loadCampaigns();
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("API Error:", error);
      alert(`❌ فشل إنشاء الحملة: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // حذف حملة
  // ===============================
  const deleteCampaign = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الحملة؟")) return;

    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("✅ تم حذف الحملة بنجاح");
        await loadCampaigns();
      } else {
        const data = await response.json();
        alert(`❌ فشل الحذف: ${data.error}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("❌ حدث خطأ أثناء الحذف");
    }
  };

  // ===============================
  // عرض حالة الحملة
  // ===============================
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            مكتملة
          </span>
        );
      case "running":
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            قيد التنفيذ
          </span>
        );
      case "scheduled":
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            مجدولة
          </span>
        );
      case "failed":
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            فشلت
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
            {status || "غير معروف"}
          </span>
        );
    }
  };

  return (
    <div className="p-4 lg:p-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الحملات التسويقية</h1>
          <p className="text-gray-600">إنشاء وإدارة حملات واتساب</p>
        </div>

        <Button
          className="bg-green-500 hover:bg-green-600 text-white shadow-lg"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="ml-2 w-4 h-4" />
          حملة جديدة
        </Button>
      </div>

      {/* Loading State */}
      {loadingCampaigns ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : campaigns.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 lg:py-24">
          <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Megaphone className="w-16 h-16 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا يوجد حملات حالياً</h3>
          <p className="text-gray-500 text-center max-w-md mb-6">
            ابدأ الآن في إنشاء أول حملة تسويقية لك
          </p>
          <Button
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-lg shadow-lg"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="ml-2 w-5 h-5" />
            ابدأ أول حملة الآن
          </Button>
        </div>
      ) : (
        /* قائمة الحملات */
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      {campaign.status === "completed" ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : campaign.status === "running" ? (
                        <Clock className="w-5 h-5 text-blue-600" />
                      ) : campaign.status === "scheduled" ? (
                        <Calendar className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <Send className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{campaign.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Send className="w-3 h-3" />
                          {campaign.sentCount || 0} مرسل
                        </span>
                        {campaign.failedCount > 0 && (
                          <span className="flex items-center gap-1 text-red-500">
                            <AlertCircle className="w-3 h-3" />
                            {campaign.failedCount} فاشل
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(campaign.createdAt).toLocaleDateString("ar-EG")}
                        </span>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        القالب: {campaign.template?.name || "غير محدد"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        alert(
                          `📊 تفاصيل الحملة:\n\n` +
                          `الاسم: ${campaign.name}\n` +
                          `القالب: ${campaign.template?.name || "غير محدد"}\n` +
                          `تم الإرسال: ${campaign.sentCount || 0}\n` +
                          `فشل: ${campaign.failedCount || 0}\n` +
                          `الحالة: ${campaign.status}\n` +
                          `التاريخ: ${new Date(campaign.createdAt).toLocaleString("ar-EG")}`
                        );
                      }}
                    >
                      <Play className="w-3 h-3 ml-1" />
                      تفاصيل
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteCampaign(campaign.id)}
                    >
                      <Trash2 className="w-3 h-3 ml-1" />
                      حذف
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog إنشاء حملة */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">إنشاء حملة تسويقية</DialogTitle>
            <DialogDescription>
              قم بإنشاء حملة جديدة وإرسالها فوراً
            </DialogDescription>
          </DialogHeader>

          {/* مؤشر الخطوات */}
          <div className="flex justify-between mb-8 px-10">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {s}
                </div>
                <span className="text-xs text-gray-500">
                  {s === 1 ? "الجمهور" : s === 2 ? "القالب" : "الإعدادات"}
                </span>
              </div>
            ))}
          </div>

          {/* الخطوة 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-200 p-8 rounded-xl text-center hover:border-green-400 transition-colors">
                <input
                  type="file"
                  id="excel-upload"
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                />
                <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
                  <FileSpreadsheet className="w-12 h-12 text-green-500 mb-2" />
                  <span className="font-bold text-gray-700">رفع شيت إكسيل</span>
                  <span className="text-xs text-gray-400">اسحب الملف هنا أو اضغط للاختيار</span>
                </label>
              </div>

              <div className="space-y-2">
                <Label>أو إضافة أرقام يدوياً</Label>
                <Textarea
                  placeholder="201234567890"
                  value={manualNumbers}
                  onChange={(e) => setManualNumbers(e.target.value)}
                  className="min-h-[100px] font-mono"
                  dir="ltr"
                />
                <p className="text-xs text-gray-400">
                  ⚠️ الصيغة: 20 ثم 10 أرقام (مثال: 201234567890)
                </p>
              </div>

              {numbers.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-bold text-blue-800">📱 الأرقام ({numbers.length})</p>
                    <Button variant="ghost" size="sm" onClick={clearAllNumbers} className="text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {numbers.slice(0, 10).map((num, idx) => (
                      <div key={idx} className="inline-flex items-center bg-white px-2 py-1 rounded text-xs m-1">
                        <span>{num}</span>
                        <button onClick={() => removeNumber(idx)} className="text-red-500 mr-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {numbers.length > 10 && <p className="text-xs text-gray-500">...و{numbers.length - 10} أخرى</p>}
                  </div>
                </div>
              )}

              <Button className="w-full bg-green-500 text-white" onClick={goToStep2}>
                التالي: اختيار القالب
              </Button>
            </div>
          )}

          {/* الخطوة 2 */}
          {step === 2 && (
            <div className="space-y-6">
              <Select onValueChange={setTemplate} value={template}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر قالب..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.name}>
                      {t.name}
                    </SelectItem>
                  ))}
                  {availableTemplates.length === 0 && (
                    <SelectItem value="none" disabled>
                      لا توجد قوالب متاحة
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-sm text-gray-500 mb-2">📄 معاينة:</p>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedTemplateContent || "لا يوجد معاينة"}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  <ChevronLeft className="w-4 h-4 ml-2" /> السابق
                </Button>
                <Button 
                  className="flex-1 bg-green-500 text-white" 
                  onClick={() => setStep(3)}
                  disabled={availableTemplates.length === 0}
                >
                  التالي: الإعدادات
                </Button>
              </div>
            </div>
          )}

          {/* الخطوة 3 */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>اسم الحملة</Label>
                <Input
                  placeholder="مثال: حملة رمضان 2024"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div className="bg-green-50 p-4 rounded-xl">
                <h4 className="font-bold text-green-800">📊 ملخص الحملة</h4>
                <div className="text-sm mt-2 space-y-1">
                  <p>• الاسم: <strong>{campaignName || "غير محدد"}</strong></p>
                  <p>• عدد المستلمين: <strong>{numbers.length}</strong></p>
                  <p>• القالب: <strong>{template || "غير محدد"}</strong></p>
                  <p>• وقت الإرسال: <strong>{scheduleTime === "now" ? "فوراً" : dateTime || "غير محدد"}</strong></p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  <ChevronLeft className="w-4 h-4 ml-2" /> السابق
                </Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  onClick={handleCreateCampaign}
                  disabled={loading || !campaignName || numbers.length === 0}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                      جاري الإرسال...
                    </>
                  ) : (
                    "🚀 إنشاء الحملة"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}