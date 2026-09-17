"use client";

import { useState } from "react";
import EmailCampaignList from "./_components/EmailCampaignList";
import CreateEmailCampaignModal from "./_components/CreateEmailCampaignModal";
import EmailDeliveryLogTable from "./_components/EmailDeliveryLogTable";
import {
  MOCK_CAMPAIGNS,
  MOCK_TEMPLATES,
  MOCK_CONTACTS,
  MOCK_DELIVERIES,
} from "../constants";
import type { EmailCampaignDTO, EmailDeliveryDTO } from "../types";
import { toast } from "sonner";

export default function EmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaignDTO[]>(MOCK_CAMPAIGNS);
  const [deliveries, setDeliveries] = useState<EmailDeliveryDTO[]>(MOCK_DELIVERIES);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [selectedCampaignForLogs, setSelectedCampaignForLogs] =
    useState<EmailCampaignDTO | null>(null);

  // Derive unique tags from contacts
  const availableTags = Array.from(
    new Set(MOCK_CONTACTS.flatMap((c) => c.tags))
  );

  const handleCreateCampaign = (newCampaign: EmailCampaignDTO, sendNow: boolean) => {
    setCampaigns((prev) => [newCampaign, ...prev]);

    // If sent immediately, generate mock delivery records
    if (sendNow) {
      const generatedDeliveries: EmailDeliveryDTO[] = MOCK_CONTACTS.slice(0, 4).map((c, i) => ({
        id: `del_gen_${Date.now()}_${i}`,
        campaignId: newCampaign.id,
        contactEmail: c.email,
        contactName: c.firstName ? `${c.firstName} ${c.lastName || ""}` : null,
        status: i === 3 ? "FAILED" : "DELIVERED",
        errorMessage: i === 3 ? "Mailbox full / quota exceeded" : null,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }));

      setDeliveries((prev) => [...generatedDeliveries, ...prev]);
    }
  };

  const handleSendNow = async (campaign: EmailCampaignDTO) => {
    const toastId = toast.loading(`جاري بدء إرسال حملة "${campaign.name}"...`);
    await new Promise((r) => setTimeout(r, 1200));

    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaign.id
          ? {
              ...c,
              status: "COMPLETED",
              sentCount: c.targetCount,
              deliveredCount: Math.max(0, c.targetCount - 1),
              failedCount: 1,
              completedAt: new Date().toISOString(),
            }
          : c
      )
    );

    toast.success(`تم إرسال الحملة "${campaign.name}" بنجاح! 🎉`, { id: toastId });
  };

  const handleDeleteCampaign = (id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    toast.success("تم حذف الحملة بنجاح.");
  };

  const handleOpenLogs = (campaign: EmailCampaignDTO) => {
    setSelectedCampaignForLogs(campaign);
    setIsLogsOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-white">حملات البريد الإلكتروني (Email Campaigns)</h1>
        <p className="mt-1 text-sm text-white/60">
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
        templates={MOCK_TEMPLATES}
        availableTags={availableTags}
        totalContactsCount={MOCK_CONTACTS.length}
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
