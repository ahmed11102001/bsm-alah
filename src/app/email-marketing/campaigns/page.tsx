"use client";

import { useState, useEffect, useCallback } from "react";
import EmailCampaignList from "./_components/EmailCampaignList";
import CreateEmailCampaignModal from "./_components/CreateEmailCampaignModal";
import EmailDeliveryLogTable from "./_components/EmailDeliveryLogTable";
import type { EmailCampaignDTO, EmailDeliveryDTO, EmailTemplateDTO } from "../types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function EmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaignDTO[]>([]);
  const [templates, setTemplates] = useState<EmailTemplateDTO[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [deliveries, setDeliveries] = useState<EmailDeliveryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [selectedCampaignForLogs, setSelectedCampaignForLogs] =
    useState<EmailCampaignDTO | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [campaignsRes, templatesRes, contactsRes] = await Promise.all([
        fetch("/api/email/campaigns"),
        fetch("/api/email/templates"),
        fetch("/api/email/contacts?limit=100"),
      ]);

      const [cData, tData, cntData] = await Promise.all([
        campaignsRes.json(),
        templatesRes.json(),
        contactsRes.json(),
      ]);

      if (campaignsRes.ok && Array.isArray(cData)) setCampaigns(cData);
      if (templatesRes.ok && Array.isArray(tData)) setTemplates(tData);
      if (contactsRes.ok && cntData.contacts) {
        setTotalContacts(cntData.total || cntData.contacts.length);
        const tags = Array.from(
          new Set(cntData.contacts.flatMap((c: any) => c.tags || []))
        ) as string[];
        setAvailableTags(tags);
      }
    } catch (err) {
      console.error("[EmailCampaignsPage] Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // تحديث دوري تلقائي لو فيه حملات في حالة QUEUED أو SENDING للمتابعة اللحظية
  useEffect(() => {
    const hasActive = campaigns.some(
      (c) => c.status === "QUEUED" || c.status === "SENDING"
    );
    if (!hasActive) return;

    const interval = setInterval(() => {
      loadData();
    }, 4000);

    return () => clearInterval(interval);
  }, [campaigns, loadData]);

  const handleCreateCampaign = async (
    newCampaign: { name: string; subject: string; templateId: string; targetTag: string | null },
    sendNow: boolean
  ) => {
    try {
      const res = await fetch("/api/email/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCampaign.name,
          subject: newCampaign.subject,
          templateId: newCampaign.templateId,
          targetTag: newCampaign.targetTag,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "فشل إنشاء الحملة");
        return;
      }

      if (sendNow) {
        toast.loading("جاري جدولة الحملة في طابور Inngest للخلفية...", { id: "send-toast" });
        const sendRes = await fetch(`/api/email/campaigns/${data.id}/send`, {
          method: "POST",
        });
        const sendData = await sendRes.json();

        if (sendRes.ok) {
          toast.success(
            "تم وضع الحملة في طابور الإرسال عبر Inngest بنجاح! يتم الإرسال في الخلفية 🚀",
            { id: "send-toast" }
          );
        } else {
          toast.error(sendData.error || "حصل خطأ أثناء الجدولة", { id: "send-toast" });
        }
      } else {
        toast.success(`تم حفظ مسودة الحملة "${data.name}" بنجاح.`);
      }

      loadData();
    } catch {
      toast.error("حدث خطأ في الاتصال أثناء إنشاء الحملة.");
    }
  };

  const handleSendNow = async (campaign: EmailCampaignDTO) => {
    const toastId = toast.loading(`جاري وضع حملة "${campaign.name}" في طابور الإرسال عبر Inngest...`);
    try {
      const res = await fetch(`/api/email/campaigns/${campaign.id}/send`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(
          `تم إدراج الحملة في طابور Inngest بنجاح! يتم معالجة الإرسال في الخلفية ومتابعة التقدم تلقائيًا 🚀`,
          { id: toastId }
        );
        loadData();
      } else {
        toast.error(data.error || "فشل إطلاق الحملة البريدية.", { id: toastId });
      }
    } catch {
      toast.error("حدث خطأ في الشبكة أثناء الإرسال.", { id: toastId });
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/email/campaigns/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
        toast.success("تم حذف الحملة بنجاح.");
      } else {
        toast.error("فشل حذف الحملة.");
      }
    } catch {
      toast.error("حدث خطأ في الشبكة أثناء الحذف.");
    }
  };

  const handleOpenLogs = async (campaign: EmailCampaignDTO) => {
    setSelectedCampaignForLogs(campaign);
    setIsLogsOpen(true);
    try {
      const res = await fetch(`/api/email/campaigns/${campaign.id}`);
      const data = await res.json();
      if (res.ok && data.deliveries) {
        setDeliveries(data.deliveries);
      }
    } catch (err) {
      console.error("[EmailCampaignsPage] Failed to fetch delivery logs:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">حملات البريد الإلكتروني (Email Campaigns)</h1>
        <p className="mt-1 text-sm text-slate-500">
          أطلق حملات بريدية مستهدفة، اختر القالب المناسب، وراقب نتائج التسليم ومعدلات الفتح لحظة بلحظة.
        </p>
      </div>

      {/* Campaigns List Table */}
      <EmailCampaignList
        campaigns={campaigns}
        onOpenCreate={() => setIsCreateOpen(true)}
        onViewLogs={handleOpenLogs}
        onSendNow={handleSendNow}
        onDelete={handleDeleteCampaign}
      />

      {/* Create Modal Wizard */}
      <CreateEmailCampaignModal
        isOpen={isCreateOpen}
        templates={templates}
        availableTags={availableTags}
        totalContactsCount={totalContacts}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateCampaign}
      />

      {/* Delivery Logs Viewer */}
      <EmailDeliveryLogTable
        isOpen={isLogsOpen}
        campaign={selectedCampaignForLogs}
        deliveries={deliveries}
        onClose={() => setIsLogsOpen(false)}
      />
    </div>
  );
}
