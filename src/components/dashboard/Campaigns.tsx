"use client";
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, Plus, Calendar, ChevronLeft, 
  FileSpreadsheet, X, Megaphone, Trash2, Play, Users 
} from 'lucide-react';

export default function Campaigns() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [campaigns, setCampaigns] = useState<any[]>([]);

  // ✅ 1. تعريف الـ State للقوالب
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplateContent, setSelectedTemplateContent] = useState("");

  // States لتخزين البيانات
  const [campaignName, setCampaignName] = useState("");
  const [template, setTemplate] = useState("hello_world");
  const [numbers, setNumbers] = useState<string[]>([]);
  const [manualNumbers, setManualNumbers] = useState("");
  const [scheduleTime, setScheduleTime] = useState("now");
  const [dateTime, setDateTime] = useState("");

 // ✅ 2. جلب القوالب من الـ API عند فتح الصفحة
  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => {
        console.log("Templates received:", data); // سطر مفيد للفحص في الـ Console

        // التعديل هنا: فحص مرن للحالة (Case-insensitive) وقبول المعمد والمنتظر
        const filtered = data.filter((t: any) => {
          const status = t.status?.toLowerCase();
          return status === 'approved' || status === 'pending';
        });

        setAvailableTemplates(filtered);
        
        // ضبط أول قالب كاختيار افتراضي إذا وجد
        if (filtered.length > 0) {
          setTemplate(filtered[0].name);
        }
      })
      .catch((err) => console.error("Error fetching templates:", err));
  }, []);

  // ✅ Regex صحيح للأرقام المصرية
  const isValidEgyptianNumber = (num: string) => {
    return /^20\d{10}$/.test(num);
  };

  // تنظيف الأرقام
  const cleanNumber = (num: string) => {
    let cleaned = num.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) cleaned = '20' + cleaned.slice(1);
    if (!cleaned.startsWith('20') && cleaned.length === 10) cleaned = '20' + cleaned;
    return cleaned;
  };

  // معالجة ملف الإكسيل
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = (evt.target as any).result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      const extractedNumbers = data
        .flat()
        .map(n => cleanNumber(String(n).trim()))
        .filter(isValidEgyptianNumber);
      
      setNumbers(prev => [...new Set([...prev, ...extractedNumbers])]);
      alert(`✅ تم استخراج ${extractedNumbers.length} رقم صالح من الملف`);
    };
    reader.readAsBinaryString(file);
  };

  // حذف رقم معين
  const removeNumber = (indexToRemove: number) => {
    setNumbers(numbers.filter((_, index) => index !== indexToRemove));
  };

  // الانتقال للخطوة 2 مع معالجة الأرقام اليدوية
  const goToStep2 = () => {
    // تنظيف الأرقام اليدوية
    const manualArr = manualNumbers
      .split("\n")
      .map(n => cleanNumber(n.trim()))
      .filter(isValidEgyptianNumber);
    
    const allNumbers = [...new Set([...numbers, ...manualArr])];
    setNumbers(allNumbers);
    
    if (allNumbers.length === 0) {
      alert("❌ من فضلك أضف أرقام جهات الاتصال أولاً (إما برفع ملف أو كتابة يدوية)");
      return;
    }
    
    // مسح الـ manualNumbers عشان ماتتكررش
    setManualNumbers("");
    setStep(2);
  };

  // دالة إعادة تعيين النموذج
  const resetForm = () => {
    setStep(1);
    setCampaignName("");
    setNumbers([]);
    setManualNumbers("");
    setScheduleTime("now");
    setDateTime("");
  };

  // ✅ 3. تحديث دالة معاينة القالب (Preview)
  const getTemplatePreview = () => {
    const found = availableTemplates.find(t => t.name === template);
    return found ? found.content : "يرجى اختيار قالب لعرض المعاينة...";
  };

  // دالة الإرسال الحقيقية مع API
  const handleCreateCampaign = async () => {
    if (numbers.length === 0) {
      alert("❌ من فضلك أضف أرقام جهات الاتصال أولاً");
      return;
    }
    
    if (!campaignName.trim()) {
      alert("❌ من فضلك أدخل اسم للحملة");
      return;
    }
    
    if (scheduleTime === 'scheduled' && !dateTime) {
      alert("❌ من فضلك اختر التاريخ والوقت للإرسال المجدول");
      return;
    }
    
    const confirmed = confirm(`
🚀 تأكيد إرسال الحملة:

📋 الاسم: ${campaignName}
📱 عدد المستلمين: ${numbers.length}
📝 القالب: ${template}
⏰ التوقيت: ${scheduleTime === 'now' ? 'فوراً' : dateTime}

هل أنت متأكد من إرسال الحملة؟
    `);
    
    if (!confirmed) return;
    
    setLoading(true);
    try {
     const response = await fetch('/api/campaigns', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: (session?.user as any).id, // الحقل المطلوب في الباك إند الجديد
    name: campaignName,               // الباك إند ينتظر 'name' وليس 'campaignName'
    templateName: template,           // اسم القالب المختار
    numbers: numbers,                 // مصفوفة الأرقام من الإكسيل أو اليدوية
    scheduled: scheduleTime !== "now" ? dateTime : null
  }),
});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "فشل إرسال الحملة");
      }
      
      // إضافة الحملة الجديدة للقائمة
      const newCampaign = {
        id: Date.now(),
        name: campaignName,
        status: scheduleTime === 'now' ? 'sent' : 'scheduled',
        date: scheduleTime === 'now' ? new Date().toLocaleDateString('ar-EG') : dateTime.split('T')[0],
        recipients: numbers.length,
        template: template
      };
      
      setCampaigns(prev => [newCampaign, ...prev]);
      
      alert(`✅ تم إنشاء الحملة بنجاح!\n📨 ${numbers.length} مستلم\n⏰ ${scheduleTime === 'now' ? 'سيتم الإرسال فوراً' : 'مجدولة في ' + dateTime}`);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('API Error:', error);
      alert(`❌ فشل إنشاء الحملة: ${error.message || 'حدث خطأ غير متوقع'}`);
    } finally {
      setLoading(false);
    }
  };

  // حذف حملة
  const deleteCampaign = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذه الحملة؟")) {
      setCampaigns(campaigns.filter(c => c.id !== id));
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'sent') {
      return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">✅ تم الإرسال</span>;
    }
    return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">⏰ مجدولة</span>;
  };

  return (
    <div className="p-4 lg:p-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الحملات التسويقية</h1>
          <p className="text-gray-600">إنشاء وإدارة حملات واتساب التسويقية</p>
        </div>
        <Button 
          className="bg-green-500 hover:bg-green-600 text-white shadow-lg" 
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="ml-2 w-4 h-4" />
          حملة جديدة
        </Button>
      </div>

      {/* Empty State أو قائمة الحملات */}
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 lg:py-24">
          <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Megaphone className="w-16 h-16 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا يوجد حملات حالياً</h3>
          <p className="text-gray-500 text-center max-w-md mb-6">
            ابدأ الآن في إنشاء أول حملة تسويقية لك وتواصل مع عملائك بسهولة عبر واتساب
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
        <div className="space-y-4">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">إجمالي الحملات</p>
                    <p className="text-2xl font-bold">{campaigns.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">تم الإرسال</p>
                    <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'sent').length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Send className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">مجدولة</p>
                    <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'scheduled').length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">إجمالي المستلمين</p>
                    <p className="text-2xl font-bold">{campaigns.reduce((sum, c) => sum + c.recipients, 0)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaigns List */}
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        {campaign.status === 'sent' ? (
                          <Send className="w-5 h-5 text-green-600" />
                        ) : (
                          <Calendar className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{campaign.name}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {campaign.recipients} مستلم
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {campaign.date}
                          </span>
                          {getStatusBadge(campaign.status)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
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
        </div>
      )}

      {/* Dialog إنشاء حملة جديدة */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">إنشاء حملة تسويقية</DialogTitle>
          </DialogHeader>

          <div className="flex justify-between mb-8 px-10">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {s}
                </div>
                <span className="text-xs text-gray-500">
                  {s === 1 ? 'الجمهور' : s === 2 ? 'القالب' : 'الإعدادات'}
                </span>
              </div>
            ))}
          </div>

          {/* الخطوة 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-200 p-8 rounded-xl text-center hover:border-green-400 transition-colors">
                <input type="file" id="excel-upload" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
                  <FileSpreadsheet className="w-12 h-12 text-green-500 mb-2" />
                  <span className="font-bold text-gray-700">رفع شيت إكسيل</span>
                  <span className="text-xs text-gray-400">اسحب الملف هنا أو اضغط للاختيار</span>
                </label>
              </div>
              
              <div className="space-y-2">
                <Label>أو إضافة أرقام يدوياً (رقم في كل سطر)</Label>
                <Textarea 
                  placeholder="201234567890"
                  value={manualNumbers}
                  onChange={(e) => setManualNumbers(e.target.value)}
                  className="min-h-[100px] font-mono"
                  dir="ltr"
                />
                <p className="text-xs text-gray-400">⚠️ الصيغة الصحيحة: 20 ثم 10 أرقام (مثال: 201234567890)</p>
              </div>

              {numbers.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-bold text-blue-800 mb-2">📱 الأرقام المضافة ({numbers.length})</p>
                  <div className="max-h-32 overflow-y-auto">
                    {numbers.slice(0, 10).map((num, idx) => (
                      <div key={idx} className="inline-flex items-center bg-white px-2 py-1 rounded text-xs m-1">
                        <span className="ml-1">{num}</span>
                        <button onClick={() => removeNumber(idx)} className="text-red-500 hover:text-red-700 mr-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {numbers.length > 10 && (
                      <p className="text-xs text-gray-500 mt-1">...و{numbers.length - 10} أرقام أخرى</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg text-sm">
                <span>إجمالي الأرقام الصالحة: <strong className="text-green-600">{numbers.length}</strong></span>
              </div>

              <Button className="w-full bg-green-500 hover:bg-green-600 text-white" onClick={goToStep2}>
                التالي: اختيار القالب
              </Button>
            </div>
          )}

          {/* الخطوة 2: اختيار القالب */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>قالب الرسالة</Label>
                <Select onValueChange={setTemplate} defaultValue={template}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  {/* ✅ 4. قائمة الاختيار الديناميكية */}
                  <SelectContent>
                    {availableTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.name}>
                        {t.name === 'hello_world' ? '👋 قالب الترحيب' : t.name}
                      </SelectItem>
                    ))}
                    {availableTemplates.length === 0 && (
                      <SelectItem value="none" disabled>لا توجد قوالب معتمدة</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-500 mb-2">📄 معاينة الرسالة:</p>
                <p className="text-gray-700 italic">{getTemplatePreview()}</p>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  <ChevronLeft className="w-4 h-4 ml-2" /> السابق
                </Button>
                <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white" onClick={() => setStep(3)}>
                  التالي: إعدادات الحملة
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

              <div className="space-y-2">
                <Label>وقت الإرسال</Label>
                <div className="flex gap-4">
                  <Button 
                    variant={scheduleTime === 'now' ? 'default' : 'outline'} 
                    className={`flex-1 ${scheduleTime === 'now' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                    onClick={() => setScheduleTime('now')}
                  >
                    <Send className="w-4 h-4 ml-2" /> الآن
                  </Button>
                  <Button 
                    variant={scheduleTime === 'scheduled' ? 'default' : 'outline'} 
                    className={`flex-1 ${scheduleTime === 'scheduled' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                    onClick={() => setScheduleTime('scheduled')}
                  >
                    <Calendar className="w-4 h-4 ml-2" /> جدولة
                  </Button>
                </div>
              </div>

              {scheduleTime === 'scheduled' && (
                <div className="space-y-2">
                  <Label>اختر التاريخ والوقت</Label>
                  <Input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
                </div>
              )}

              <div className="bg-green-50 p-4 rounded-xl space-y-2 border border-green-200">
                <h4 className="font-bold text-green-800">📊 ملخص الحملة</h4>
                <div className="text-sm space-y-1 text-green-700">
                  <p>• الاسم: <strong>{campaignName || 'غير محدد'}</strong></p>
                  <p>• عدد المستلمين: <strong>{numbers.length}</strong></p>
                  <p>• القالب: <strong>{template}</strong></p>
                  <p>• التوقيت: <strong>{scheduleTime === 'now' ? 'إرسال فوري' : dateTime}</strong></p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  <ChevronLeft className="w-4 h-4 ml-2" /> السابق
                </Button>
                <Button 
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white" 
                  onClick={handleCreateCampaign} 
                  disabled={loading || !campaignName}
                >
                  {loading ? "⏳ جاري المعالجة..." : "🚀 إنشاء الحملة"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}