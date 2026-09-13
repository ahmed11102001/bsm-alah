"use client";
import { AutomationPageSkeleton } from "@/components/dashboard/DashboardSkeletons";

// â”€â”€â”€ Automation.tsx â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tabs:
//   1. "Ø§Ù„Ø£ØªÙ…ØªØ©"  â†’ inner sub-tabs:
//        - Ø§Ù„ÙƒÙ„Ù…Ø§Øª  : keyword bot (KEYWORD + TEXT)           â€” free text âœ…
//        - Ø§Ù„ØªØ±Ø­ÙŠØ¨  : first-message (FIRST_MESSAGE + TEXT)   â€” free text âœ… (reply to incoming)
//        - Ø§Ù„Ø²Ù…Ù†ÙŠØ©  : time-based (TIME_BASED + TEMPLATE)     â€” template âš ï¸ (outbound)
//        - A/B      : splits random contacts â†’ two campaigns
//   2. "Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ" â†’ unchanged AI agent

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import { useSubscription } from "@/lib/dashboard-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bot, Plus, MoreVertical, Trash2, Edit2, Loader2, MessageSquare, ImageIcon,
  Zap, ToggleLeft, ToggleRight, CheckCircle, Save, Sparkles, Key,
  X, ListFilter, CornerDownLeft,
  Hand, Clock, CalendarClock, FlaskConical, AlertTriangle, Info, LayoutGrid, Lock,
} from "lucide-react";
import SmartFollowUpTab from "@/app/dashboard/automation/SmartFollowUp/page";
import AiAgentDashboard from "@/app/dashboard/automation/_components/AiAgentDashboard";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface AutomationButton {
  buttonId: string;
  text: string;
  nextStepId?: string | null;
  notifyOnSelect?: boolean;
}

interface InteractiveConfig {
  body: string;
  footer?: string;
  buttons: AutomationButton[];
}

interface AutomationRule {
  id: string; name: string; isEnabled: boolean;
  triggerType: string; triggerValue: string | null;
  replyType: string; replyContent: string | null; replyMediaUrl: string | null;
  templateId: string | null;
  interactiveConfig?: InteractiveConfig | null;
  createdAt: string;
}
interface Template { id: string; name: string; content: string; status: string; }
interface Audience {
  id: string; name: string;
  _count?: { contacts: number };
  contacts?: { id: string; phone: string; name: string | null }[];
}
interface AIAgent {
  isEnabled: boolean; provider: "gemini" | "openai";
  brandName: string; businessDesc: string; productsInfo: string;
  pricingInfo: string; workingHours: string; tone: string;
  systemPrompt: string; languageMode: string; websiteUrl: string; websiteButtonText: string; pauseMinutes: number; handoffResumeMinutes: number | null;
  elevenLabsEnabled: boolean;
  elevenLabsApiKey: string;
  elevenLabsAgentId: string;
  textRepliesEnabled?: boolean;
  voiceRepliesEnabled?: boolean;
  elevenLabsVoiceId?: string;
  elevenLabsModelId?: string;
}
type Lang = "ar" | "en";
const tx = (lang: Lang, ar: string, en: string) => (lang === "ar" ? ar : en);
const EMPTY_AGENT: AIAgent = {
  isEnabled: false, provider: "gemini", brandName: "", businessDesc: "",
  productsInfo: "", pricingInfo: "", workingHours: "", tone: "friendly",
  systemPrompt: "", languageMode: "auto", websiteUrl: "", websiteButtonText: "", pauseMinutes: 10, handoffResumeMinutes: 3,
  elevenLabsEnabled: false, elevenLabsApiKey: "", elevenLabsAgentId: "",
  textRepliesEnabled: true,
  voiceRepliesEnabled: false, elevenLabsVoiceId: "", elevenLabsModelId: "",
};
type AutoSubTab = "keywords" | "welcome" | "interactive" | "smart_followup" | "timebased" | "ab";

const DAYS_AR = [
  { key: "sun", ar: "Ø§Ù„Ø£Ø­Ø¯", en: "Sunday" }, { key: "mon", ar: "Ø§Ù„Ø§Ø«Ù†ÙŠÙ†", en: "Monday" },
  { key: "tue", ar: "Ø§Ù„Ø«Ù„Ø§Ø«Ø§Ø¡", en: "Tuesday" }, { key: "wed", ar: "Ø§Ù„Ø£Ø±Ø¨Ø¹Ø§Ø¡", en: "Wednesday" },
  { key: "thu", ar: "Ø§Ù„Ø®Ù…ÙŠØ³", en: "Thursday" }, { key: "fri", ar: "Ø§Ù„Ø¬Ù…Ø¹Ø©", en: "Friday" },
  { key: "sat", ar: "Ø§Ù„Ø³Ø¨Øª", en: "Saturday" },
];

const subTabs: { id: AutoSubTab; ar: string; en: string; icon: any }[] = [
  { id: "interactive", ar: "Ù‚Ø§Ø¦Ù…Ø© ØªÙØ§Ø¹Ù„ÙŠØ©", en: "Interactive Menu", icon: ListFilter },
  { id: "keywords", ar: "Ø§Ù„ÙƒÙ„Ù…Ø§Øª", en: "Keywords", icon: Key },
  { id: "welcome", ar: "Ø§Ù„ØªØ±Ø­ÙŠØ¨", en: "Welcome", icon: Hand },
  { id: "smart_followup", ar: "Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø°ÙƒÙŠØ©", en: "Smart Follow-up", icon: Sparkles },
  { id: "timebased", ar: "Ø§Ù„Ø²Ù…Ù†ÙŠØ©", en: "Scheduled", icon: CalendarClock },
  { id: "ab", ar: "A/B Ø§Ø®ØªØ¨Ø§Ø±", en: "A/B Test", icon: FlaskConical },
];

// â”€â”€â”€ Small reusable pieces â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EmptyState({ icon, title, desc, action }: {
  icon: React.ReactNode; title: string; desc: string; action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-5">{icon}</div>
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</h3>
      <p className="text-gray-400 text-sm mb-6 max-w-xs">{desc}</p>
      {action}
    </div>
  );
}

function OutboundWarning({ lang }: { lang: Lang }) {
  return (
    <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-300">
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
      <div>
        <p className="font-semibold mb-0.5">{tx(lang, "ÙŠØ³ØªØ®Ø¯Ù… Ù‚ÙˆØ§Ù„Ø¨ Ø±Ø³Ù…ÙŠØ© ÙÙ‚Ø·", "Uses approved templates only")}</p>
        <p className="text-xs leading-relaxed">{tx(lang, "Ù‡Ø°Ø§ Ø§Ù„Ù†ÙˆØ¹ ÙŠØ¨Ø§Ø¯Ø± Ø¨Ø¥Ø±Ø³Ø§Ù„ Ø±Ø³Ø§Ù„Ø© Ù„Ù„Ø¹Ù…ÙŠÙ„ â€” ÙˆØ§ØªØ³Ø§Ø¨ ÙŠØ´ØªØ±Ø· Ù‚ÙˆØ§Ù„Ø¨ Ù…Ø¹ØªÙ…Ø¯Ø© Ù…Ù† Meta Ù„ØªØ¬Ù†Ø¨ Ø§Ù„Ø­Ø¸Ø±.", "This flow starts outbound messages, so WhatsApp requires Meta-approved templates.")}</p>
      </div>
    </div>
  );
}

function WelcomeInfo({ lang }: { lang: Lang }) {
  return (
    <div className="flex items-start gap-2.5 bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-xl p-3 text-sm text-primary">
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />`r`n      <div>
        <p className="font-semibold mb-0.5">{tx(lang, "Ù†Øµ Ø­Ø± Ù…Ø³Ù…ÙˆØ­ Ø¨Ù‡ Ù‡Ù†Ø§", "Free text is allowed here")}</p>
        <p className="text-xs leading-relaxed">{tx(lang, "Ø±Ø³Ø§Ù„Ø© Ø§Ù„ØªØ±Ø­ÙŠØ¨ Ù‡ÙŠ Ø±Ø¯ Ø¹Ù„Ù‰ Ø±Ø³Ø§Ù„Ø© ÙˆØ±Ø¯Øª Ù…Ù† Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø£ÙˆÙ„Ø§Ù‹ â€” Ø£Ù†Øª Ø¯Ø§Ø®Ù„ Ù†Ø§ÙØ°Ø© 24 Ø³Ø§Ø¹Ø©ØŒ Ù„Ø°Ø§ Ø§Ù„Ù†Øµ Ø§Ù„Ø­Ø± Ø¢Ù…Ù† Ø¨Ø¯ÙˆÙ† Ù‚Ø§Ù„Ø¨.", "Welcome replies are inside the 24-hour customer service window, so free text is safe without template.")}</p>
      </div>
    </div>
  );
}

function TemplatePicker({ templates, value, onChange, lang }: {
  templates: Template[]; value: string; onChange: (id: string) => void; lang: Lang;
}) {
  const approved = templates.filter(t => t.status?.toLowerCase() === "approved");
  if (approved.length === 0) return (
    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2.5 border border-amber-100 dark:border-amber-800">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      {tx(lang, "Ù„Ø§ ØªÙˆØ¬Ø¯ Ù‚ÙˆØ§Ù„Ø¨ Ù…Ø¹ØªÙ…Ø¯Ø© â€” Ø§Ø°Ù‡Ø¨ Ù„ØµÙØ­Ø© Ø§Ù„Ù‚ÙˆØ§Ù„Ø¨ ÙˆØ£Ø¶Ù Ù‚Ø§Ù„Ø¨Ø§Ù‹ Ø£ÙˆÙ„Ø§Ù‹", "No approved templates â€” go to Templates page and add one first")}
    </div>
  );
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={tx(lang, "Ø§Ø®ØªØ± Ù‚Ø§Ù„Ø¨Ø§Ù‹ Ù…Ø¹ØªÙ…Ø¯Ø§Ù‹...", "Choose an approved template...")} /></SelectTrigger>
      <SelectContent>
        {approved.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function RuleCard({ rule, onToggle, onEdit, onDelete, showKeyword = true, allRules = [], lang }: {
  rule: AutomationRule; onToggle: () => void; onEdit: () => void;
  onDelete: () => void; showKeyword?: boolean; allRules?: AutomationRule[]; lang: Lang;
}) {
  const isInteractive = rule.replyType === "INTERACTIVE_MENU";
  const interactiveCfg = rule.interactiveConfig;

  return (
    <div className={`bg-white dark:bg-gray-800 border rounded-2xl p-4 flex flex-col gap-3 shadow-sm transition-all
      ${rule.isEnabled ? "border-gray-200 dark:border-gray-700 hover:shadow-md" : "border-gray-100 dark:border-gray-700/50 opacity-60"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
            ${rule.isEnabled
              ? (isInteractive ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" : "bg-primary/10 text-primary")
              : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}>
            {isInteractive ? <ListFilter className="w-4 h-4" /> : <Key className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{rule.name}</p>
            {isInteractive ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium">
                  {rule.triggerType === "FIRST_MESSAGE" ? tx(lang, "Ø£ÙˆÙ„ Ø±Ø³Ø§Ù„Ø© (ØªØ±Ø­ÙŠØ¨)", "First Message (Welcome)") : `"${rule.triggerValue}"`}
                </span>
                <span className="text-[11px] text-gray-400">
                  {interactiveCfg?.buttons?.length ?? 0} {tx(lang, "Ø£Ø²Ø±Ø§Ø±", "buttons")}
                </span>
              </div>
            ) : (
              showKeyword && rule.triggerValue && (
                <p className="text-xs text-gray-400 mt-0.5 font-mono">"{rule.triggerValue}"</p>
              )
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onToggle} className={`transition-colors ${rule.isEnabled ? "text-primary" : "text-gray-300"}`}>
            {rule.isEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><MoreVertical className="w-4 h-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={onEdit}><Edit2 className="w-4 h-4" /> {tx(lang, "ØªØ¹Ø¯ÙŠÙ„", "Edit")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-sm text-red-600 cursor-pointer focus:text-red-600" onClick={onDelete}><Trash2 className="w-4 h-4" /> {tx(lang, "Ø­Ø°Ù", "Delete")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isInteractive ? (
        <div className="space-y-2">
          {interactiveCfg?.body && (
            <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 line-clamp-2 leading-relaxed whitespace-pre-wrap">
              {interactiveCfg.body}
            </p>
          )}
          {interactiveCfg?.buttons && interactiveCfg.buttons.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {interactiveCfg.buttons.map((b, idx) => {
                const targetRule = allRules.find(r => r.id === b.nextStepId);
                return (
                  <span key={b.buttonId || idx} className="text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-0.5 flex items-center gap-1">
                    <span className="font-medium">{b.text}</span>
                    {targetRule && (
                      <span className="text-indigo-600 dark:text-indigo-400 text-[10px] flex items-center gap-0.5">
                        <CornerDownLeft className="w-2.5 h-2.5" />
                        {targetRule.name}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {rule.replyMediaUrl && (
            <div className="relative w-full rounded-lg overflow-hidden max-h-24">
              <img src={rule.replyMediaUrl} alt="" className="w-full object-cover max-h-24" />
              {rule.replyContent && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
                  <p className="text-[10px] text-white line-clamp-1">{rule.replyContent}</p>
                </div>
              )}
            </div>
          )}
          {!rule.replyMediaUrl && rule.replyContent && (
            <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 line-clamp-2 leading-relaxed">{rule.replyContent}</p>
          )}
          {rule.templateId && <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg w-fit">{tx(lang, "Ù‚Ø§Ù„Ø¨ ÙˆØ§ØªØ³Ø§Ø¨ Ù…Ø¹ØªÙ…Ø¯", "Approved WhatsApp template")}</span>}
        </>
      )}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Main Component
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export default function Automation() {
  const { planTier } = useSubscription();
  const { locale, dir } = useLanguage();
  const lang: Lang = locale === "en" ? "en" : "ar";
  const [activeTab, setActiveTab] = useState<"automation" | "ai">("automation");
  const [activeSubTab, setActiveSubTab] = useState<AutoSubTab>("interactive");

  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [agent, setAgent] = useState<AIAgent>({ ...EMPTY_AGENT });
  const [loading, setLoading] = useState(true);

  const [savingAgent, setSavingAgent] = useState(false);
  const [agentDirty, setAgentDirty] = useState(false);
  const [agentSaved, setAgentSaved] = useState(false);

  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<AutoSubTab>("keywords");
  const [editTarget, setEditTarget] = useState<AutomationRule | null>(null);
  const [saving, setSaving] = useState(false);

  const [ruleForm, setRuleForm] = useState({
    name: "", keyword: "", reply: "", replyMediaUrl: "", templateId: "",
    days: [] as string[], hour: "09", minute: "00",
    tbAudienceId: "", tbMaxContacts: "500",
  });
  const [mediaUploading, setMediaUploading] = useState(false);

  const [abForm, setAbForm] = useState({
    name: "", audienceId: "", sampleSize: "100", splitRatio: "50",
    varAName: "Ù†Ø³Ø®Ø© Ø£", varATemplate: "", varBName: "Ù†Ø³Ø®Ø© Ø¨", varBTemplate: "",
  });
  const [launchingAb, setLaunchingAb] = useState(false);
  const isEnterprise = planTier === "enterprise";
  const isProOrAbove = planTier === "pro" || planTier === "enterprise";
  const isFree = planTier === "free";

  const aiLockMsg = tx(
    lang,
    "ØªØ¨ÙˆÙŠØ¨ Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ Ù…ØªØ§Ø­ ÙÙ‚Ø· ÙÙŠ Ø¨Ø§Ù‚Ø© Max. Ù‚Ù… Ø¨ØªØ±Ù‚ÙŠØ© Ø§Ù„Ø¨Ø§Ù‚Ø©.",
    "AI tab is available only on Max plan. Please upgrade."
  );
  const proLockMsg = tx(
    lang,
    "Ø§Ù„Ù…ÙŠØ²Ø© Ù…ØªØ§Ø­Ø© Ù…Ù† Ø¨Ø§Ù‚Ø© Pro ÙÙ…Ø§ ÙÙˆÙ‚. Ù‚Ù… Ø¨ØªØ±Ù‚ÙŠØ© Ø§Ù„Ø¨Ø§Ù‚Ø©.",
    "This feature is available on Pro plan and above. Please upgrade."
  );
  const showLockToast = (msg: string) => {
    toast.dismiss("plan-lock");
    toast.error(msg, { id: "plan-lock" });
  };

  // â”€â”€â”€ Load all data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, agentRes, templatesRes, audRes] = await Promise.all([
        fetch("/api/automation"), fetch("/api/ai-agent"),
        fetch("/api/templates"), fetch("/api/audiences"),
      ]);
      const rulesData = await rulesRes.json();
      const agentData = await agentRes.json();
      const templatesData = await templatesRes.json();
      const audData = await audRes.json();

      setRules(Array.isArray(rulesData) ? rulesData : []);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setAudiences(Array.isArray(audData.audiences) ? audData.audiences : []);
      setAgent({
        isEnabled: agentData.isEnabled ?? false,
        provider: agentData.provider ?? "gemini",
        brandName: agentData.brandName ?? "",
        businessDesc: agentData.businessDesc ?? "",
        productsInfo: agentData.productsInfo ?? "",
        pricingInfo: agentData.pricingInfo ?? "",
        workingHours: agentData.workingHours ?? "",
        tone: agentData.tone ?? "friendly",
        systemPrompt: agentData.systemPrompt ?? "",
        languageMode: agentData.languageMode ?? "auto",
        websiteUrl: agentData.websiteUrl ?? "",
        websiteButtonText: agentData.websiteButtonText ?? "",
        pauseMinutes: agentData.pauseMinutes ?? 10,
        handoffResumeMinutes: agentData.handoffResumeMinutes !== undefined ? agentData.handoffResumeMinutes : 3,
        elevenLabsEnabled: agentData.elevenLabsEnabled ?? false,
        elevenLabsApiKey: agentData.elevenLabsApiKey ?? "",
        elevenLabsAgentId: agentData.elevenLabsAgentId ?? "",
        textRepliesEnabled: agentData.textRepliesEnabled ?? true,
        voiceRepliesEnabled: agentData.voiceRepliesEnabled ?? false,
        elevenLabsVoiceId: agentData.elevenLabsVoiceId ?? "",
        elevenLabsModelId: agentData.elevenLabsModelId ?? "",
      });
    } catch { toast.error(tx(lang, "Ø®Ø·Ø£ ÙÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª", "Failed to load data")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kwRules = rules.filter(r => r.triggerType === "KEYWORD" && r.replyType !== "INTERACTIVE_MENU");
  const welcomeRules = rules.filter(r => r.triggerType === "FIRST_MESSAGE" && r.replyType !== "INTERACTIVE_MENU");
  const interactiveRules = rules.filter(r => r.replyType === "INTERACTIVE_MENU");
  const timeRules = rules.filter(r => r.triggerType === "TIME_BASED");

  // â”€â”€â”€ Interactive Menu form state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [interactiveForm, setInteractiveForm] = useState<{
    name: string;
    triggerType: "FIRST_MESSAGE" | "KEYWORD";
    keyword: string;
    body: string;
    footer: string;
    buttons: Array<{ buttonId: string; text: string; nextStepId: string; notifyOnSelect: boolean }>;
  }>({
    name: "",
    triggerType: "FIRST_MESSAGE",
    keyword: "",
    body: "",
    footer: "",
    buttons: [{ buttonId: `btn_${Date.now()}_1`, text: "", nextStepId: "", notifyOnSelect: false }],
  });

  const handleAddInteractiveButton = () => {
    if (interactiveForm.buttons.length >= 3) return;
    setInteractiveForm(f => ({
      ...f,
      buttons: [
        ...f.buttons,
        { buttonId: `btn_${Date.now()}_${f.buttons.length + 1}`, text: "", nextStepId: "", notifyOnSelect: false }
      ],
    }));
  };

  const handleUpdateInteractiveButton = (
    index: number,
    field: "text" | "nextStepId" | "notifyOnSelect",
    value: string | boolean,
  ) => {
    setInteractiveForm(f => {
      const updated = [...f.buttons];
      updated[index] = { ...updated[index], [field]: value };
      return { ...f, buttons: updated };
    });
  };

  const handleRemoveInteractiveButton = (index: number) => {
    if (interactiveForm.buttons.length <= 1) return;
    setInteractiveForm(f => ({
      ...f,
      buttons: f.buttons.filter((_, i) => i !== index),
    }));
  };

  // â”€â”€â”€ Dialog open â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleMediaUpload = async (file: File) => {
    setMediaUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/automation/upload", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); toast.error(e.error ?? "ÙØ´Ù„ Ø±ÙØ¹ Ø§Ù„ØµÙˆØ±Ø©"); return; }
      const { url } = await res.json();
      setRuleForm(f => ({ ...f, replyMediaUrl: url }));
      toast.success("ØªÙ… Ø±ÙØ¹ Ø§Ù„ØµÙˆØ±Ø© âœ“");
    } catch { toast.error("Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø±ÙØ¹"); }
    finally { setMediaUploading(false); }
  };

  const openCreate = (mode: AutoSubTab) => {
    setDialogMode(mode); setEditTarget(null);
    if (mode === "interactive") {
      setInteractiveForm({
        name: "",
        triggerType: "FIRST_MESSAGE",
        keyword: "",
        body: "",
        footer: "",
        buttons: [{ buttonId: `btn_${Date.now()}_1`, text: "", nextStepId: "", notifyOnSelect: false }],
      });
    } else {
      setRuleForm({ name: "", keyword: "", reply: "", replyMediaUrl: "", templateId: "", days: [], hour: "09", minute: "00", tbAudienceId: "", tbMaxContacts: "500" });
    }
    setShowDialog(true);
  };

  const openEdit = (rule: AutomationRule, mode: AutoSubTab) => {
    setDialogMode(mode); setEditTarget(rule);
    if (mode === "interactive") {
      const cfg = rule.interactiveConfig;
      setInteractiveForm({
        name: rule.name,
        triggerType: (rule.triggerType === "KEYWORD" ? "KEYWORD" : "FIRST_MESSAGE"),
        keyword: rule.triggerValue ?? "",
        body: cfg?.body || rule.replyContent || "",
        footer: cfg?.footer || "",
        buttons: (cfg?.buttons && cfg.buttons.length > 0)
          ? cfg.buttons.map(b => ({
              buttonId: b.buttonId,
              text: b.text,
              nextStepId: b.nextStepId || "",
              notifyOnSelect: b.notifyOnSelect === true,
            }))
          : [{ buttonId: `btn_${Date.now()}_1`, text: "", nextStepId: "", notifyOnSelect: false }],
      });
    } else {
      let days: string[] = []; let hour = "09"; let minute = "00";
      let tbAudienceId = ""; let tbMaxContacts = "500";
      if (rule.triggerType === "TIME_BASED" && rule.triggerValue) {
        try { const p = JSON.parse(rule.triggerValue); days = p.days ?? []; hour = p.hour ?? "09"; minute = p.minute ?? "00"; tbAudienceId = p.audienceId ?? ""; tbMaxContacts = String(p.maxContacts ?? 500); } catch { }
      }
      setRuleForm({
        name: rule.name, keyword: rule.triggerValue ?? "", reply: rule.replyContent ?? "", replyMediaUrl: rule.replyMediaUrl ?? "",
        templateId: rule.templateId ?? "",
        days, hour, minute, tbAudienceId, tbMaxContacts,
      });
    }
    setShowDialog(true);
  };

  // â”€â”€â”€ Save rule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const saveRule = async () => {
    if (dialogMode === "interactive") {
      const { name, triggerType, keyword, body, footer, buttons } = interactiveForm;
      if (!name.trim()) { toast.error(tx(lang, "Ø§Ø³Ù… Ø§Ù„Ù‚Ø§Ø¹Ø¯Ø© Ù…Ø·Ù„ÙˆØ¨", "Rule name is required")); return; }
      if (triggerType === "KEYWORD" && !keyword.trim()) {
        toast.error(tx(lang, "Ø§Ù„ÙƒÙ„Ù…Ø© Ø§Ù„Ù…ÙØªØ§Ø­ÙŠØ© Ù…Ø·Ù„ÙˆØ¨Ø©", "Keyword is required"));
        return;
      }
      if (!body.trim()) {
        toast.error(tx(lang, "Ù†Øµ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ù…Ø·Ù„ÙˆØ¨", "Message body is required"));
        return;
      }
      if (buttons.length === 0 || buttons.length > 3) {
        toast.error(tx(lang, "ÙŠØ¬Ø¨ ØªØ­Ø¯ÙŠØ¯ Ø¨ÙŠÙ† 1 Ùˆ 3 Ø£Ø²Ø±Ø§Ø±", "Must specify between 1 and 3 buttons"));
        return;
      }
      for (let i = 0; i < buttons.length; i++) {
        if (!buttons[i].text.trim()) {
          toast.error(tx(lang, `Ù†Øµ Ø§Ù„Ø²Ø± ${i + 1} Ù…Ø·Ù„ÙˆØ¨`, `Button ${i + 1} text is required`));
          return;
        }
        if (buttons[i].text.trim().length > 20) {
          toast.error(tx(lang, `Ù†Øµ Ø§Ù„Ø²Ø± ${i + 1} Ù„Ø§ ÙŠØªØ¬Ø§ÙˆØ² 20 Ø­Ø±ÙØ§Ù‹ (Ø­Ø¯ ÙˆØ§ØªØ³Ø§Ø¨)`, `Button ${i + 1} text must not exceed 20 characters`));
          return;
        }
        if (editTarget && buttons[i].nextStepId === editTarget.id) {
          toast.error(tx(lang, "Ù„Ø§ ÙŠÙ…ÙƒÙ† Ù„Ù„Ø²Ø± Ø§Ù„Ø§Ù†ØªÙ‚Ø§Ù„ Ù„Ù†ÙØ³ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ù„Ù…Ù†Ø¹ Ø§Ù„ØªÙƒØ±Ø§Ø± Ø§Ù„Ù„Ø§Ù†Ù‡Ø§Ø¦ÙŠ", "A button cannot transition to its own rule"));
          return;
        }
      }

      setSaving(true);
      try {
        const payload = {
          name: name.trim(),
          triggerType,
          triggerValue: triggerType === "KEYWORD" ? keyword.trim() : null,
          replyType: "INTERACTIVE_MENU",
          replyContent: body.trim(),
          interactiveConfig: {
            body: body.trim(),
            footer: footer.trim() || undefined,
            buttons: buttons.map(b => ({
              buttonId: b.buttonId,
              text: b.text.trim(),
              nextStepId: b.nextStepId.trim() || null,
              notifyOnSelect: b.notifyOnSelect === true,
            })),
          },
          humanKeywords: [],
          pauseOnReply: true,
        };
        const method = editTarget ? "PATCH" : "POST";
        const bodyReq = editTarget ? JSON.stringify({ id: editTarget.id, ...payload }) : JSON.stringify(payload);
        const r = await fetch("/api/automation", { method, headers: { "Content-Type": "application/json" }, body: bodyReq });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (editTarget) {
          toast.success(tx(lang, "ØªÙ… Ø§Ù„ØªØ¹Ø¯ÙŠÙ„", "Updated"));
          setRules(prev => prev.map(x => x.id === editTarget.id ? d : x));
        } else {
          toast.success(tx(lang, "ØªÙ… Ø§Ù„Ø¥Ø¶Ø§ÙØ©", "Added"));
          setRules(prev => [...prev, d]);
        }
        window.dispatchEvent(new Event("trigger-review-prompt"));
        setShowDialog(false);
      } catch (e: any) {
        toast.error(e.message ?? tx(lang, "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø­ÙØ¸", "Save failed"));
      } finally {
        setSaving(false);
      }
      return;
    }

    const { name, keyword, reply, templateId, days, hour, minute, tbAudienceId, tbMaxContacts } = ruleForm;
    if (!name.trim()) { toast.error(tx(lang, "Ø§Ø³Ù… Ø§Ù„Ù‚Ø§Ø¹Ø¯Ø© Ù…Ø·Ù„ÙˆØ¨", "Rule name is required")); return; }

    let triggerType = "KEYWORD"; let triggerValue: string | null = null;
    let replyType = "TEXT"; let replyContent: string | null = null; let tplId: string | null = null;

    if (dialogMode === "keywords") {
      if (!keyword.trim()) { toast.error(tx(lang, "Ø§Ù„ÙƒÙ„Ù…Ø© Ø§Ù„Ù…ÙØªØ§Ø­ÙŠØ© Ù…Ø·Ù„ÙˆØ¨Ø©", "Keyword is required")); return; }
      if (!reply.trim()) { toast.error(tx(lang, "Ù†Øµ Ø§Ù„Ø±Ø¯ Ù…Ø·Ù„ÙˆØ¨", "Reply text is required")); return; }
      triggerType = "KEYWORD"; triggerValue = keyword.trim();
      replyType = "TEXT"; replyContent = reply.trim();
    } else if (dialogMode === "welcome") {
      if (!reply.trim()) { toast.error(tx(lang, "Ù†Øµ Ø§Ù„Ø±Ø¯ Ù…Ø·Ù„ÙˆØ¨", "Reply text is required")); return; }
      triggerType = "FIRST_MESSAGE"; replyType = "TEXT"; replyContent = reply.trim();
    } else if (dialogMode === "timebased") {
      if (days.length === 0) { toast.error(tx(lang, "Ø§Ø®ØªØ± ÙŠÙˆÙ…Ø§Ù‹ ÙˆØ§Ø­Ø¯Ø§Ù‹ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„", "Choose at least one day")); return; }
      if (!tbAudienceId) { toast.error(tx(lang, "Ø§Ø®ØªØ± Ø§Ù„Ø¬Ù…Ù‡ÙˆØ± Ø§Ù„Ù…Ø³ØªÙ‡Ø¯Ù", "Choose target audience")); return; }
      if (!templateId) { toast.error(tx(lang, "Ø§Ø®ØªØ± Ù‚Ø§Ù„Ø¨Ø§Ù‹ Ù…Ø¹ØªÙ…Ø¯Ø§Ù‹", "Choose an approved template")); return; }
      const maxN = Number(tbMaxContacts);
      if (!maxN || maxN < 1) { toast.error(tx(lang, "Ø¹Ø¯Ø¯ Ø¬Ù‡Ø§Øª Ø§Ù„Ø§ØªØµØ§Ù„ ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø£ÙƒØ¨Ø± Ù…Ù† 0", "Contacts count must be greater than 0")); return; }
      triggerType = "TIME_BASED";
      triggerValue = JSON.stringify({ days, hour, minute, audienceId: tbAudienceId, maxContacts: maxN });
      replyType = "TEMPLATE"; tplId = templateId;
    }

    setSaving(true);
    try {
      const payload = { name: name.trim(), triggerType, triggerValue, replyType, replyContent, replyMediaUrl: ruleForm.replyMediaUrl?.trim() || null, templateId: tplId, humanKeywords: [], pauseOnReply: dialogMode !== "keywords" };
      const method = editTarget ? "PATCH" : "POST";
      const body = editTarget ? JSON.stringify({ id: editTarget.id, ...payload }) : JSON.stringify(payload);
      const r = await fetch("/api/automation", { method, headers: { "Content-Type": "application/json" }, body });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (editTarget) { toast.success(tx(lang, "ØªÙ… Ø§Ù„ØªØ¹Ø¯ÙŠÙ„", "Updated")); setRules(prev => prev.map(x => x.id === editTarget.id ? d : x)); }
      else { toast.success(tx(lang, "ØªÙ… Ø§Ù„Ø¥Ø¶Ø§ÙØ©", "Added")); setRules(prev => [...prev, d]); }
      window.dispatchEvent(new Event("trigger-review-prompt"));
      setShowDialog(false);
    } catch (e: any) { toast.error(e.message ?? tx(lang, "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø­ÙØ¸", "Save failed")); }
    finally { setSaving(false); }
  };

  const toggleRule = async (rule: AutomationRule) => {
    try {
      await fetch("/api/automation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: rule.id, isEnabled: !rule.isEnabled }) });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isEnabled: !r.isEnabled } : r));
    } catch { toast.error(tx(lang, "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„ØªØ­Ø¯ÙŠØ«", "Update failed")); }
  };

  const deleteRule = async (id: string) => {
    try {
      const r = await fetch("/api/automation", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!r.ok) throw new Error();
      toast.success(tx(lang, "ØªÙ… Ø§Ù„Ø­Ø°Ù", "Deleted")); setRules(prev => prev.filter(x => x.id !== id));
    } catch { toast.error(tx(lang, "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø­Ø°Ù", "Delete failed")); }
  };

  // â”€â”€â”€ A/B launch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const launchABTest = async () => {
    const { name, audienceId, sampleSize, splitRatio, varAName, varATemplate, varBName, varBTemplate } = abForm;
    if (!name.trim()) { toast.error(tx(lang, "Ø§Ø³Ù… Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± Ù…Ø·Ù„ÙˆØ¨", "Test name is required")); return; }
    if (!audienceId) { toast.error(tx(lang, "Ø§Ø®ØªØ± Ø¬Ù…Ù‡ÙˆØ±Ø§Ù‹", "Choose audience")); return; }
    if (!varATemplate) { toast.error(tx(lang, "Ø§Ø®ØªØ± Ù‚Ø§Ù„Ø¨ Ø§Ù„Ù†Ø³Ø®Ø© Ø£", "Choose variant A template")); return; }
    if (!varBTemplate) { toast.error(tx(lang, "Ø§Ø®ØªØ± Ù‚Ø§Ù„Ø¨ Ø§Ù„Ù†Ø³Ø®Ø© Ø¨", "Choose variant B template")); return; }
    if (varATemplate === varBTemplate) { toast.error(tx(lang, "ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ù„ÙƒÙ„ Ù†Ø³Ø®Ø© Ù‚Ø§Ù„Ø¨ Ù…Ø®ØªÙ„Ù", "Each variant must use a different template")); return; }

    setLaunchingAb(true);
    try {
      const audRes = await fetch(`/api/audiences?audienceId=${audienceId}&includeContacts=all`);
      const audData = await audRes.json();
      const contacts: { phone: string }[] = audData.audience?.contacts ?? [];
      if (contacts.length === 0) { toast.error(tx(lang, "Ø§Ù„Ø¬Ù…Ù‡ÙˆØ± ÙØ§Ø±Øº", "Audience is empty")); return; }

      const shuffled = [...contacts].sort(() => Math.random() - 0.5);
      const n = Math.min(Number(sampleSize), shuffled.length);
      const sample = shuffled.slice(0, n);
      const splitPct = Math.max(10, Math.min(90, Number(splitRatio)));
      const aCount = Math.round(sample.length * splitPct / 100);
      const groupA = sample.slice(0, aCount).map(c => c.phone);
      const groupB = sample.slice(aCount).map(c => c.phone);

      if (groupA.length === 0 || groupB.length === 0) { toast.error(tx(lang, "ÙƒÙ„ Ù…Ø¬Ù…ÙˆØ¹Ø© ØªØ­ØªØ§Ø¬ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„ Ø¬Ù‡Ø© Ø§ØªØµØ§Ù„ ÙˆØ§Ø­Ø¯Ø©", "Each group needs at least one contact")); return; }

      const tplA = templates.find(t => t.id === varATemplate);
      const tplB = templates.find(t => t.id === varBTemplate);
      if (!tplA || !tplB) { toast.error(tx(lang, "Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø§Ù„Ù‚ÙˆØ§Ù„Ø¨", "Templates not found")); return; }

      const [resA, resB] = await Promise.all([
        fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `${name} â€” ${varAName}`, templateName: tplA.id, numbers: groupA }) }),
        fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `${name} â€” ${varBName}`, templateName: tplB.id, numbers: groupB }) }),
      ]);

      if (!resA.ok || !resB.ok) {
        const errA = await resA.json().catch(() => ({}));
        const errB = await resB.json().catch(() => ({}));
        throw new Error(errA.error ?? errB.error ?? tx(lang, "Ø®Ø·Ø£ ÙÙŠ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø­Ù…Ù„Ø§Øª", "Failed to create campaigns"));
      }

      toast.success(tx(lang, `âœ“ ØªÙ… Ø¥Ø·Ù„Ø§Ù‚ Ø§Ø®ØªØ¨Ø§Ø± A/B â€” ${groupA.length} Ù„Ù„Ù†Ø³Ø®Ø© Ø£ØŒ ${groupB.length} Ù„Ù„Ù†Ø³Ø®Ø© Ø¨`, `âœ“ A/B test launched â€” ${groupA.length} for variant A, ${groupB.length} for variant B`));
      setAbForm({ name: "", audienceId: "", sampleSize: "100", splitRatio: "50", varAName: "Ù†Ø³Ø®Ø© Ø£", varATemplate: "", varBName: "Ù†Ø³Ø®Ø© Ø¨", varBTemplate: "" });
    } catch (e: any) { toast.error(e.message ?? tx(lang, "Ø®Ø·Ø£ ÙÙŠ Ø¥Ø·Ù„Ø§Ù‚ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±", "Failed to launch test")); }
    finally { setLaunchingAb(false); }
  };

  // â”€â”€â”€ AI helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const saveAgent = async () => {
    setSavingAgent(true);
    try {
      const r = await fetch("/api/ai-agent", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(agent) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(tx(lang, "ØªÙ… Ø­ÙØ¸ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ÙˆÙƒÙŠÙ„ Ø§Ù„Ø°ÙƒÙŠ", "AI agent settings saved"));
      setAgentDirty(false); setAgentSaved(true);
    } catch (e: any) { toast.error(e.message ?? tx(lang, "Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø­ÙØ¸", "Save failed")); }
    finally { setSavingAgent(false); }
  };

  const updateAgent = (patch: Partial<AIAgent>) => { setAgent(a => ({ ...a, ...patch })); setAgentDirty(true); setAgentSaved(false); };
  const toggleDay = (day: string) => setRuleForm(f => ({ ...f, days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day] }));

  // â”€â”€â”€ Badge count â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const badgeCount: Record<AutoSubTab, number> = {
    keywords: kwRules.filter(r => r.isEnabled).length,
    welcome: welcomeRules.filter(r => r.isEnabled).length,
    interactive: interactiveRules.filter(r => r.isEnabled).length,
    smart_followup: 0,
    timebased: timeRules.filter(r => r.isEnabled).length,
    ab: 0,
  };

  useEffect(() => {
    setAbForm(prev => ({
      ...prev,
      varAName: prev.varAName === "Ù†Ø³Ø®Ø© Ø£" || prev.varAName === "Variant A" ? tx(lang, "Ù†Ø³Ø®Ø© Ø£", "Variant A") : prev.varAName,
      varBName: prev.varBName === "Ù†Ø³Ø®Ø© Ø¨" || prev.varBName === "Variant B" ? tx(lang, "Ù†Ø³Ø®Ø© Ø¨", "Variant B") : prev.varBName,
    }));
  }, [lang]);

  if (loading) return (
    <AutomationPageSkeleton />
  );

  // â”€â”€â”€ Sub-tab content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderSubTab = () => {
    if (activeSubTab === "keywords") return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{tx(lang, "Ø¨ÙˆØª Ø§Ù„ÙƒÙ„Ù…Ø§Øª Ø§Ù„Ù…ÙØªØ§Ø­ÙŠØ©", "Keyword bot")}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{kwRules.length > 0 ? tx(lang, `${kwRules.filter(r => r.isEnabled).length} Ù…ÙØ¹Ù‘Ù„Ø© Ù…Ù† ${kwRules.length}`, `${kwRules.filter(r => r.isEnabled).length} active out of ${kwRules.length}`) : tx(lang, "Ø±Ø¯ÙˆØ¯ Ø«Ø§Ø¨ØªØ© ÙÙˆØ±ÙŠØ© Ø¹Ù„Ù‰ ÙƒÙ„Ù…Ø§Øª Ø¨Ø¹ÙŠÙ†Ù‡Ø§", "Instant fixed replies for specific keywords")}</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-9 text-sm" onClick={() => openCreate("keywords")}><Plus className="w-4 h-4" /> {tx(lang, "ÙƒÙ„Ù…Ø© Ø¬Ø¯ÙŠØ¯Ø©", "New keyword")}</Button>
        </div>
        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 mb-4 text-sm text-blue-700 dark:text-blue-300">
          <Zap className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
          <span>{tx(lang, "Ù„Ù…Ø§ Ø§Ù„Ø¹Ù…ÙŠÙ„ ÙŠÙƒØªØ¨ Ø§Ù„ÙƒÙ„Ù…Ø©ØŒ Ø§Ù„Ø¨ÙˆØª ÙŠØ±Ø¯ ÙÙˆØ±Ø§Ù‹ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¨ØºØ¶ Ø§Ù„Ù†Ø¸Ø± Ø¹Ù† Ø£ÙŠ Ø­Ø§Ø¬Ø© ØªØ§Ù†ÙŠØ©.", "When a customer sends the keyword, the bot replies instantly regardless of anything else.")}</span>
        </div>
        {kwRules.length === 0 ? (
          <EmptyState icon={<MessageSquare className="w-10 h-10 text-green-300" />} title={tx(lang, "Ù„Ø§ ØªÙˆØ¬Ø¯ ÙƒÙ„Ù…Ø§Øª Ø¨Ø¹Ø¯", "No keywords yet")} desc={tx(lang, "Ø£Ø¶Ù ÙƒÙ„Ù…Ø© Ù…ÙØªØ§Ø­ÙŠØ© ÙˆØ±Ø¯Ù‘Ù‡Ø§ Ø§Ù„Ø«Ø§Ø¨Øª", "Add a keyword and its fixed reply")}
            action={<Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={() => openCreate("keywords")}><Plus className="w-4 h-4" /> {tx(lang, "Ø£Ø¶Ù Ø£ÙˆÙ„ ÙƒÙ„Ù…Ø©", "Add your first keyword")}</Button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kwRules.map(rule => (
              <RuleCard key={rule.id} rule={rule} lang={lang} allRules={rules} onToggle={() => toggleRule(rule)} onEdit={() => openEdit(rule, "keywords")} onDelete={() => deleteRule(rule.id)} />
            ))}
          </div>
        )}
      </div>
    );

    if (activeSubTab === "welcome") return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{tx(lang, "Ø±Ø³Ø§Ù„Ø© Ø§Ù„ØªØ±Ø­ÙŠØ¨ Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠØ©", "Automatic welcome message")}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{tx(lang, "ØªØ±Ø¯ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¹Ù„Ù‰ Ø£ÙˆÙ„ Ø±Ø³Ø§Ù„Ø© Ù…Ù† Ø£ÙŠ Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯", "Replies automatically to the first message from any new customer")}</p>
          </div>
          {welcomeRules.length === 0 && <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-9 text-sm" onClick={() => openCreate("welcome")}><Plus className="w-4 h-4" /> {tx(lang, "Ø¥Ø¶Ø§ÙØ© ØªØ±Ø­ÙŠØ¨", "Add welcome")}</Button>}
        </div>
        <WelcomeInfo lang={lang} />
        <div className="mt-4">
          {welcomeRules.length === 0 ? (
            <EmptyState icon={<Hand className="w-10 h-10 text-green-300" />} title={tx(lang, "Ù„Ø§ ÙŠÙˆØ¬Ø¯ ØªØ±Ø­ÙŠØ¨ ØªÙ„Ù‚Ø§Ø¦ÙŠ", "No automatic welcome yet")} desc={tx(lang, "Ø£Ø¶Ù Ø±Ø³Ø§Ù„Ø© ØªØ±Ø­ÙŠØ¨ ØªÙØ±Ø³Ù„ ÙÙˆØ± ØªÙˆØ§ØµÙ„ Ø£ÙŠ Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯", "Add a welcome message sent as soon as any new customer contacts you")}
              action={<Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={() => openCreate("welcome")}><Plus className="w-4 h-4" /> {tx(lang, "Ø¥Ø¶Ø§ÙØ© Ø±Ø³Ø§Ù„Ø© Ø§Ù„ØªØ±Ø­ÙŠØ¨", "Add welcome message")}</Button>} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {welcomeRules.map(rule => (
                <RuleCard key={rule.id} rule={rule} lang={lang} allRules={rules} showKeyword={false} onToggle={() => toggleRule(rule)} onEdit={() => openEdit(rule, "welcome")} onDelete={() => deleteRule(rule.id)} />
              ))}
              {welcomeRules.length < 3 && (
                <button onClick={() => openCreate("welcome")}
                  className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 flex flex-col items-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-all">
                  <Plus className="w-6 h-6" /><span className="text-sm">{tx(lang, "Ø¥Ø¶Ø§ÙØ© Ø±Ø³Ø§Ù„Ø© ØªØ±Ø­ÙŠØ¨ Ø£Ø®Ø±Ù‰", "Add another welcome message")}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );

    if (activeSubTab === "interactive") return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{tx(lang, "Ù‚Ø§Ø¦Ù…Ø© ØªÙØ§Ø¹Ù„ÙŠØ© (Reply Buttons)", "Interactive Menu")}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {interactiveRules.length > 0
                ? tx(lang, `${interactiveRules.filter(r => r.isEnabled).length} Ù…ÙØ¹Ù‘Ù„Ø© Ù…Ù† ${interactiveRules.length}`, `${interactiveRules.filter(r => r.isEnabled).length} active out of ${interactiveRules.length}`)
                : tx(lang, "Ø£Ø±Ø³Ù„ Ø±Ø³Ø§Ø¦Ù„ Ø¨Ø£Ø²Ø±Ø§Ø± Ø®ÙŠØ§Ø±Ø§Øª ØªÙ…ÙƒÙ‘Ù† Ø§Ù„Ø¹Ù…ÙŠÙ„ Ù…Ù† Ø§Ù„ØªÙØ§Ø¹Ù„ Ø§Ù„ÙÙˆØ±ÙŠ", "Send messages with reply buttons for instant customer actions")}
            </p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-9 text-sm shadow-sm" onClick={() => openCreate("interactive")}>
            <Plus className="w-4 h-4" /> {tx(lang, "Ù‚Ø§Ø¦Ù…Ø© Ø¬Ø¯ÙŠØ¯Ø©", "New Menu")}
          </Button>
        </div>

        <div className="flex items-start gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-3 mb-4 text-sm text-indigo-700 dark:text-indigo-300">
          <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-indigo-500" />
          <span>{tx(lang, "Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ØªÙØ§Ø¹Ù„ÙŠØ© ØªØ±Ø³Ù„ Ø±Ø³Ø§Ù„Ø© ÙˆØ§ØªØ³Ø§Ø¨ Ù…Ø¹ Ø­ØªÙ‰ 3 Ø£Ø²Ø±Ø§Ø± Ø±Ø¯ Ø³Ø±ÙŠØ¹Ø©. Ø¹Ù†Ø¯ Ø¶ØºØ· Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¹Ù„Ù‰ Ø£ÙŠ Ø²Ø± ÙŠØªÙ… ØªÙ†ÙÙŠØ° Ø§Ù„Ø®Ø·ÙˆØ© Ø§Ù„ØªØ§Ù„ÙŠØ© Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù‡ ÙÙˆØ±Ø§Ù‹.", "Interactive menu sends a WhatsApp message with up to 3 reply buttons. When the customer clicks a button, its connected next step executes automatically.")}</span>
        </div>

        {interactiveRules.length === 0 ? (
          <EmptyState
            icon={<ListFilter className="w-10 h-10 text-indigo-300" />}
            title={tx(lang, "Ù„Ø§ ØªÙˆØ¬Ø¯ Ù‚ÙˆØ§Ø¦Ù… ØªÙØ§Ø¹Ù„ÙŠØ© Ø¨Ø¹Ø¯", "No interactive menus yet")}
            desc={tx(lang, "Ø£Ù†Ø´Ø¦ Ù‚Ø§Ø¦Ù…Ø© ØªÙØ§Ø¹Ù„ÙŠØ© Ù„ØªÙ…ÙƒÙŠÙ† Ø¹Ù…Ù„Ø§Ø¦Ùƒ Ù…Ù† Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø®Ø¯Ù…Ø§Øª Ø£Ùˆ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø¨Ø¶ØºØ·Ø© Ø²Ø± ÙˆØ§Ø­Ø¯Ø©", "Create an interactive menu to let customers choose services or products with a single tap")}
            action={
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={() => openCreate("interactive")}>
                <Plus className="w-4 h-4" /> {tx(lang, "Ø¥Ù†Ø´Ø§Ø¡ Ø£ÙˆÙ„ Ù‚Ø§Ø¦Ù…Ø© ØªÙØ§Ø¹Ù„ÙŠØ©", "Create your first interactive menu")}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {interactiveRules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                lang={lang}
                allRules={rules}
                onToggle={() => toggleRule(rule)}
                onEdit={() => openEdit(rule, "interactive")}
                onDelete={() => deleteRule(rule.id)}
              />
            ))}
          </div>
        )}
      </div>
    );

    if (activeSubTab === "smart_followup") return (
      <SmartFollowUpTab lang={lang} />
    );

    if (activeSubTab === "timebased") return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{tx(lang, "Ø§Ù„Ø£ØªÙ…ØªØ© Ø§Ù„Ø²Ù…Ù†ÙŠØ©", "Scheduled automation")}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{tx(lang, "Ø¥Ø±Ø³Ø§Ù„ Ù‚ÙˆØ§Ù„Ø¨ ÙÙŠ Ø£ÙˆÙ‚Ø§Øª ÙˆØ£ÙŠØ§Ù… Ù…Ø­Ø¯Ø¯Ø© Ø£Ø³Ø¨ÙˆØ¹ÙŠØ§Ù‹", "Send templates at specific times and days each week")}</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-9 text-sm" onClick={() => openCreate("timebased")}><Plus className="w-4 h-4" /> {tx(lang, "Ø¬Ø¯ÙˆÙ„Ø© Ø¬Ø¯ÙŠØ¯Ø©", "New schedule")}</Button>
        </div>
        <OutboundWarning lang={lang} />

        {timeRules.length === 0 ? (
          <EmptyState icon={<CalendarClock className="w-10 h-10 text-purple-300" />} title={tx(lang, "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¬Ø¯ÙˆÙ„Ø© Ø¨Ø¹Ø¯", "No schedules yet")} desc={tx(lang, "Ø£Ø¶Ù Ù‚Ø§Ø¹Ø¯Ø© Ù„Ø¥Ø±Ø³Ø§Ù„ Ø±Ø³Ø§Ø¦Ù„ ÙÙŠ ÙˆÙ‚Øª ÙˆØ£ÙŠØ§Ù… Ù…Ø­Ø¯Ø¯Ø©", "Add a rule to send messages at a specific time and days")}
            action={<Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={() => openCreate("timebased")}><Plus className="w-4 h-4" /> {tx(lang, "Ø¥Ø¶Ø§ÙØ© Ø¬Ø¯ÙˆÙ„Ø©", "Add schedule")}</Button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {timeRules.map(rule => {
              let schedLabel = "";
              try {
                const p = JSON.parse(rule.triggerValue ?? "{}");
                const daysAr = (p.days ?? []).map((d: string) => {
                  const day = DAYS_AR.find(x => x.key === d);
                  return day ? (lang === "ar" ? day.ar : day.en) : d;
                }).join(lang === "ar" ? "ØŒ " : ", ");
                const aud = audiences.find(a => a.id === p.audienceId);
                schedLabel = `${daysAr} â€” ${p.hour}:${p.minute}`;
                if (aud) schedLabel += ` Â· ${aud.name}`;
                if (p.maxContacts) schedLabel += lang === "ar"
                  ? ` (${p.maxContacts.toLocaleString()} ÙƒØ­Ø¯ Ø£Ù‚ØµÙ‰)`
                  : ` (${p.maxContacts.toLocaleString()} max)`;
              } catch { }
              return (
                <div key={rule.id} className={`bg-white dark:bg-gray-800 border rounded-2xl p-4 shadow-sm ${rule.isEnabled ? "border-gray-200 dark:border-gray-700" : "border-gray-100 dark:border-gray-700/50 opacity-60"}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${rule.isEnabled ? "bg-purple-50 text-purple-600" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}><CalendarClock className="w-4 h-4" /></div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{rule.name}</p>
                        {schedLabel && <p className="text-xs text-gray-400 mt-0.5">{schedLabel}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => toggleRule(rule)} className={`transition-colors ${rule.isEnabled ? "text-primary" : "text-gray-300"}`}>{rule.isEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}</button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><MoreVertical className="w-4 h-4" /></button></DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-36">
                          <DropdownMenuItem className="gap-2 text-sm cursor-pointer" onClick={() => openEdit(rule, "timebased")}><Edit2 className="w-4 h-4" /> {tx(lang, "ØªØ¹Ø¯ÙŠÙ„", "Edit")}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-sm text-red-600 cursor-pointer focus:text-red-600" onClick={() => deleteRule(rule.id)}><Trash2 className="w-4 h-4" /> {tx(lang, "Ø­Ø°Ù", "Delete")}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {rule.templateId && <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg">{tx(lang, "Ù‚Ø§Ù„Ø¨ Ù…Ø¹ØªÙ…Ø¯", "Approved template")}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );

    if (activeSubTab === "ab") return (
      <div>
        <div className="mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{tx(lang, "Ø§Ø®ØªØ¨Ø§Ø± A/B Ù„Ù„Ø±Ø³Ø§Ø¦Ù„", "A/B test for messages")}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{tx(lang, "Ø§Ø®ØªØ¨Ø± Ù‚Ø§Ù„Ø¨ÙŠÙ† Ù…Ø®ØªÙ„ÙÙŠÙ† Ø¹Ù„Ù‰ Ø¹ÙŠÙ†Ø© Ø¹Ø´ÙˆØ§Ø¦ÙŠØ© Ù…Ù† Ø¬Ù‡Ø§Øª Ø§ØªØµØ§Ù„Ùƒ", "Test two different templates on a random sample of your contacts")}</p>
        </div>
        <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 mb-5 text-sm text-blue-700 dark:text-blue-300">
          <FlaskConical className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
          <div>
            <p className="font-semibold mb-0.5">{tx(lang, "ÙƒÙŠÙ ÙŠØ¹Ù…Ù„", "How it works")}</p>
            <p className="text-xs leading-relaxed">{tx(lang, "ÙŠØ®ØªØ§Ø± Ø¹Ø´ÙˆØ§Ø¦ÙŠØ§Ù‹ Ø¹Ø¯Ø¯Ø§Ù‹ Ù…Ù† Ø¬Ù‡Ø§Øª Ø§ØªØµØ§Ù„Ùƒ ÙˆÙŠÙ‚Ø³Ù‘Ù…Ù‡Ù… Ø¨ÙŠÙ† Ù†Ø³Ø®ØªÙŠÙ†ØŒ Ø«Ù… ÙŠØ·Ù„Ù‚ Ø­Ù…Ù„ØªÙŠÙ† Ù…Ù†ÙØµÙ„ØªÙŠÙ†. ØªØªØ¨Ù‘Ø¹ Ø§Ù„Ù†ØªØ§Ø¦Ø¬ ÙÙŠ ØµÙØ­Ø© Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±.", "It randomly selects a number of your contacts, splits them into two versions, and launches two separate campaigns. Track the results in the reports page.")}</p>
          </div>
        </div>
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 text-sm">{tx(lang, "Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±", "Test settings")}</h4>
            <div className="space-y-4">
              <div>
                <Label className="text-sm mb-1.5 block">{tx(lang, "Ø§Ø³Ù… Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±", "Test name")} *</Label>
                <Input value={abForm.name} onChange={e => setAbForm(f => ({ ...f, name: e.target.value }))} placeholder={tx(lang, "Ù…Ø«Ø§Ù„: Ø§Ø®ØªØ¨Ø§Ø± Ø¹Ø±Ø¶ Ø±Ù…Ø¶Ø§Ù†", "Example: Ramadan offer test")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "Ø§Ù„Ø¬Ù…Ù‡ÙˆØ± Ø§Ù„Ù…Ø³ØªÙ‡Ø¯Ù", "Target audience")} *</Label>
                  <Select value={abForm.audienceId} onValueChange={v => setAbForm(f => ({ ...f, audienceId: v }))}>
                    <SelectTrigger><SelectValue placeholder={tx(lang, "Ø§Ø®ØªØ± Ø¬Ù…Ù‡ÙˆØ±Ø§Ù‹...", "Choose an audience...")} /></SelectTrigger>
                    <SelectContent>
                      {audiences.map(a => <SelectItem key={a.id} value={a.id}>{a.name} {a._count ? `(${a._count.contacts})` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "Ø­Ø¬Ù… Ø§Ù„Ø¹ÙŠÙ†Ø©", "Sample size")}</Label>
                  <Input type="number" min={10} max={10000} dir="ltr" value={abForm.sampleSize} onChange={e => setAbForm(f => ({ ...f, sampleSize: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="text-sm mb-1.5 block flex items-center justify-between">
                  <span>{tx(lang, "Ù†Ø³Ø¨Ø© Ø§Ù„ØªÙ‚Ø³ÙŠÙ… â€” Ø£ / Ø¨", "Split ratio â€” A / B")}</span>
                  <span className="font-mono text-gray-500">{abForm.splitRatio}% / {100 - Number(abForm.splitRatio)}%</span>
                </Label>
                <input type="range" min="10" max="90" step="5" dir="ltr" value={abForm.splitRatio}
                  onChange={e => setAbForm(f => ({ ...f, splitRatio: e.target.value }))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gradient-to-l from-amber-400 to-blue-400" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>10/90</span><span>50/50</span><span>90/10</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">A</div>
                <Input value={abForm.varAName} onChange={e => setAbForm(f => ({ ...f, varAName: e.target.value }))} className="font-semibold border-0 p-0 h-7 focus-visible:ring-0 bg-transparent dark:bg-transparent" />
              </div>
              <p className="text-xs text-gray-400 mb-2">{tx(lang, "Ø§Ù„Ù‚Ø§Ù„Ø¨", "Template")}</p>
              <TemplatePicker templates={templates} value={abForm.varATemplate} onChange={v => setAbForm(f => ({ ...f, varATemplate: v }))} lang={lang} />
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">â‰ˆ {Math.round(Number(abForm.sampleSize) * Number(abForm.splitRatio) / 100)} {tx(lang, "Ø¬Ù‡Ø© Ø§ØªØµØ§Ù„", "contacts")}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border-2 border-amber-200 dark:border-amber-700 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">B</div>
                <Input value={abForm.varBName} onChange={e => setAbForm(f => ({ ...f, varBName: e.target.value }))} className="font-semibold border-0 p-0 h-7 focus-visible:ring-0 bg-transparent dark:bg-transparent" />
              </div>
              <p className="text-xs text-gray-400 mb-2">{tx(lang, "Ø§Ù„Ù‚Ø§Ù„Ø¨", "Template")}</p>
              <TemplatePicker templates={templates} value={abForm.varBTemplate} onChange={v => setAbForm(f => ({ ...f, varBTemplate: v }))} lang={lang} />
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">â‰ˆ {Math.round(Number(abForm.sampleSize) * (100 - Number(abForm.splitRatio)) / 100)} {tx(lang, "Ø¬Ù‡Ø© Ø§ØªØµØ§Ù„", "contacts")}</p>
            </div>
          </div>

          <Button onClick={launchABTest} disabled={launchingAb}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 py-6 text-base font-semibold shadow-lg">
            {launchingAb ? <Loader2 className="w-5 h-5 animate-spin" /> : <FlaskConical className="w-5 h-5" />}
            {launchingAb ? tx(lang, "Ø¬Ø§Ø±ÙŠ Ø¥Ø·Ù„Ø§Ù‚ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±...", "Launching the test...") : tx(lang, "Ø¥Ø·Ù„Ø§Ù‚ Ø§Ø®ØªØ¨Ø§Ø± A/B", "Launch A/B test")}
          </Button>
        </div>
      </div>
    );

    return null;
  };

  // â”€â”€â”€ Main render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto" dir={dir}>

      {/* Main Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-8 w-fit">
        {(["automation", "ai"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              if (tab === "ai" && !isEnterprise) {
                showLockToast(aiLockMsg);
                return;
              }
              setActiveTab(tab);
            }}
            onPointerDown={() => {
              if (tab === "ai" && !isEnterprise) showLockToast(aiLockMsg);
            }}
            onMouseEnter={() => {
              if (tab === "ai" && !isEnterprise) showLockToast(aiLockMsg);
            }}
            title={tab === "ai" && !isEnterprise ? aiLockMsg : undefined}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${tab === "ai" && !isEnterprise
                ? "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-70"
                : activeTab === tab
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}>
            {tab === "automation" ? (
              <LayoutGrid className="w-4 h-4" />
            ) : (
              <img
                src="/aiasstant.svg"
                alt=""
                aria-hidden="true"
                className="w-5 h-5 rounded-full object-cover"
              />
            )}
            {tab === "automation" ? tx(lang, "Ø§Ù„Ø£ØªÙ…ØªØ©", "Automation") : tx(lang, "AI ÙˆÙ†ÙŠ", "AI Wani")}
            {tab === "ai" && !isEnterprise && <span className="text-[10px]">ðŸ”’</span>}
            {tab === "ai" && agent.isEnabled && <span className="w-2 h-2 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {/* Automation Tab */}
      {activeTab === "automation" && (
        <>
          {/* Inner sub-tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-6">
            {subTabs.map(st => {
              const isSmart = st.id === "smart_followup";
              // smart_followup Ùˆ timebased Ùˆ ab â€” pro ÙØ£Ø¹Ù„Ù‰ ÙÙ‚Ø·
              const needsPro = st.id === "smart_followup" || st.id === "timebased" || st.id === "ab";
              const isLocked = needsPro && !isProOrAbove;
              const isActive = activeSubTab === st.id;

              let btnStyle = "";
              if (isLocked) {
                btnStyle = "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-60";
              } else if (isSmart) {
                btnStyle = isActive
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25 ring-2 ring-violet-400/40"
                  : "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60 hover:bg-violet-100 dark:hover:bg-violet-900/40 font-bold";
              } else if (isActive) {
                btnStyle = "bg-primary text-primary-foreground shadow-sm";
              } else {
                btnStyle = "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700";
              }

              return (
                <button key={st.id}
                  onClick={() => {
                    if (isLocked) {
                      showLockToast(proLockMsg);
                      return;
                    }
                    setActiveSubTab(st.id);
                  }}
                  onPointerDown={() => {
                    if (isLocked) showLockToast(proLockMsg);
                  }}
                  onMouseEnter={() => {
                    if (isLocked) showLockToast(proLockMsg);
                  }}
                  title={isLocked ? proLockMsg : undefined}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${btnStyle}`}>
                  <st.icon className={`w-3.5 h-3.5 ${isSmart && !isLocked && !isActive ? "text-violet-600 dark:text-violet-400" : ""}`} />
                  {lang === "ar" ? st.ar : st.en}
                  {isLocked && <span className="text-[10px]">ðŸ”’</span>}
                  {!isLocked && badgeCount[st.id] > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? "bg-white/20 text-white" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"}`}>
                      {badgeCount[st.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {renderSubTab()}
        </>
      )}

      {/* AI Tab â€” Phase 2 UX Dashboard, Knowledge Cards & Live Test Chat */}
      {activeTab === "ai" && <AiAgentDashboard lang={lang} />}

      {/* Dialog â€” shared for keyword / welcome / interactive / timebased */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) setShowDialog(false); }}>
        <DialogContent className={dialogMode === "interactive" ? "max-w-2xl max-h-[90vh] overflow-y-auto" : "max-w-md"} dir={lang === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {dialogMode === "keywords" && <><Key className="w-5 h-5 text-primary" /> {editTarget ? tx(lang, "ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„ÙƒÙ„Ù…Ø©", "Edit keyword") : tx(lang, "ÙƒÙ„Ù…Ø© Ù…ÙØªØ§Ø­ÙŠØ© Ø¬Ø¯ÙŠØ¯Ø©", "New keyword")}</>}
              {dialogMode === "welcome" && <><Hand className="w-5 h-5 text-primary" /> {editTarget ? tx(lang, "ØªØ¹Ø¯ÙŠÙ„ Ø±Ø³Ø§Ù„Ø© Ø§Ù„ØªØ±Ø­ÙŠØ¨", "Edit welcome message") : tx(lang, "Ø±Ø³Ø§Ù„Ø© ØªØ±Ø­ÙŠØ¨ Ø¬Ø¯ÙŠØ¯Ø©", "New welcome message")}</>}
              {dialogMode === "interactive" && <><ListFilter className="w-5 h-5 text-indigo-600" /> {editTarget ? tx(lang, "ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ØªÙØ§Ø¹Ù„ÙŠØ©", "Edit Interactive Menu") : tx(lang, "Ù‚Ø§Ø¦Ù…Ø© ØªÙØ§Ø¹Ù„ÙŠØ© Ø¬Ø¯ÙŠØ¯Ø©", "New Interactive Menu")}</>}
              {dialogMode === "timebased" && <><CalendarClock className="w-5 h-5 text-purple-500" /> {editTarget ? tx(lang, "ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø¬Ø¯ÙˆÙ„Ø©", "Edit schedule") : tx(lang, "Ø¬Ø¯ÙˆÙ„Ø© Ø²Ù…Ù†ÙŠØ© Ø¬Ø¯ÙŠØ¯Ø©", "New schedule")}</>}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "keywords" && tx(lang, "Ù„Ù…Ø§ Ø§Ù„Ø¹Ù…ÙŠÙ„ ÙŠÙƒØªØ¨ Ø§Ù„ÙƒÙ„Ù…Ø© Ø¯ÙŠØŒ Ø§Ù„Ø¨ÙˆØª ÙŠØ±Ø¯ ÙÙˆØ±Ø§Ù‹", "When the customer sends this keyword, the bot replies instantly")}
              {dialogMode === "welcome" && tx(lang, "ØªØ±Ø³Ù„ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¹Ù„Ù‰ Ø£ÙˆÙ„ Ø±Ø³Ø§Ù„Ø© Ù…Ù† Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯", "Sent automatically on the first message from a new customer")}
              {dialogMode === "interactive" && tx(lang, "Ø£Ø±Ø³Ù„ Ø±Ø³Ø§Ù„Ø© ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø£Ø²Ø±Ø§Ø± Ø®ÙŠØ§Ø±Ø§Øª ØªÙØ§Ø¹Ù„ÙŠØ©ØŒ ÙˆÙŠÙ†ØªÙ‚Ù„ Ø§Ù„Ø¹Ù…ÙŠÙ„ Ù„Ù„Ø®Ø·ÙˆØ© Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨ÙƒÙ„ Ø²Ø±", "Send an interactive menu with reply buttons that execute connected next steps")}
              {dialogMode === "timebased" && tx(lang, "ØªØ±Ø³Ù„ Ù‚Ø§Ù„Ø¨Ø§Ù‹ ÙÙŠ ÙˆÙ‚Øª ÙˆØ£ÙŠØ§Ù… Ù…Ø­Ø¯Ø¯Ø© Ø£Ø³Ø¨ÙˆØ¹ÙŠØ§Ù‹", "Sends a template at selected weekly time slots")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {dialogMode !== "interactive" && (
              <div>
                <Label className="text-sm mb-1.5 block">{tx(lang, "Ø§Ø³Ù… Ø§Ù„Ù‚Ø§Ø¹Ø¯Ø©", "Rule name")} *</Label>
                <Input value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} placeholder={tx(lang, "Ù…Ø«Ø§Ù„: Ø±Ø¯ Ø§Ù„Ø³Ø¹Ø±", "e.g. Price reply")} />
              </div>
            )}

            {dialogMode === "interactive" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Form fields */}
                <div className="md:col-span-7 space-y-4">
                  <div>
                    <Label className="text-sm mb-1.5 block">{tx(lang, "Ø§Ø³Ù… Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©", "Menu name")} *</Label>
                    <Input
                      value={interactiveForm.name}
                      onChange={e => setInteractiveForm(f => ({ ...f, name: e.target.value }))}
                      placeholder={tx(lang, "Ù…Ø«Ø§Ù„: Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© / Ø®ÙŠØ§Ø±Ø§Øª Ø§Ù„Ø®Ø¯Ù…Ø©", "e.g. Main Menu / Service Options")}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm mb-1.5 block">{tx(lang, "Ù†ÙˆØ¹ Ø§Ù„Ù…Ø´ØºÙ‘Ù„ (Trigger)", "Trigger Type")} *</Label>
                      <Select
                        value={interactiveForm.triggerType}
                        onValueChange={(v: "FIRST_MESSAGE" | "KEYWORD") => setInteractiveForm(f => ({ ...f, triggerType: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIRST_MESSAGE">{tx(lang, "Ø£ÙˆÙ„ Ø±Ø³Ø§Ù„Ø© (ØªØ±Ø­ÙŠØ¨)", "First Message (Welcome)")}</SelectItem>
                          <SelectItem value="KEYWORD">{tx(lang, "ÙƒÙ„Ù…Ø© Ù…ÙØªØ§Ø­ÙŠØ©", "Keyword")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {interactiveForm.triggerType === "KEYWORD" && (
                      <div>
                        <Label className="text-sm mb-1.5 block">{tx(lang, "Ø§Ù„ÙƒÙ„Ù…Ø© Ø§Ù„Ù…ÙØªØ§Ø­ÙŠØ©", "Keyword")} *</Label>
                        <Input
                          value={interactiveForm.keyword}
                          onChange={e => setInteractiveForm(f => ({ ...f, keyword: e.target.value }))}
                          placeholder={tx(lang, "Ù…Ø«Ø§Ù„: Ù‚Ø§Ø¦Ù…Ø© / Ø®Ø¯Ù…Ø§Øª", "e.g. menu / services")}
                          dir="rtl"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-sm block">{tx(lang, "Ù†Øµ Ø§Ù„Ø±Ø³Ø§Ù„Ø© (Message Body)", "Message Body")} *</Label>
                      <span className="text-[11px] text-gray-400 font-mono">{interactiveForm.body.length}/1024</span>
                    </div>
                    <Textarea
                      value={interactiveForm.body}
                      onChange={e => setInteractiveForm(f => ({ ...f, body: e.target.value.slice(0, 1024) }))}
                      placeholder={tx(lang, "Ø£Ù‡Ù„Ø§Ù‹ Ø¨Ùƒ ðŸ‘‹\nØ§Ø®ØªØ± Ø§Ù„Ø®Ø¯Ù…Ø© Ø§Ù„ØªÙŠ ØªÙ†Ø§Ø³Ø¨Ùƒ Ù…Ù† Ø§Ù„Ø®ÙŠØ§Ø±Ø§Øª Ø§Ù„ØªØ§Ù„ÙŠØ©:", "Hello ðŸ‘‹\nPlease choose a service from the options below:")}
                      className="min-h-[100px] resize-none text-sm"
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-sm block flex items-center gap-1.5">
                        <span>{tx(lang, "Ù†Øµ Ø§Ù„ØªØ°ÙŠÙŠÙ„ (Footer)", "Footer text")}</span>
                        <span className="text-gray-400 font-normal text-xs">{tx(lang, "(Ø§Ø®ØªÙŠØ§Ø±ÙŠ)", "(optional)")}</span>
                      </Label>
                      <span className="text-[11px] text-gray-400 font-mono">{interactiveForm.footer.length}/60</span>
                    </div>
                    <Input
                      value={interactiveForm.footer}
                      onChange={e => setInteractiveForm(f => ({ ...f, footer: e.target.value.slice(0, 60) }))}
                      placeholder={tx(lang, "Ù…Ø«Ø§Ù„: Ø§Ø®ØªØ± Ø®ÙŠØ§Ø±Ø§Ù‹ Ù„Ù„Ù…ØªØ§Ø¨Ø¹Ø©", "e.g. Select to continue")}
                      dir="rtl"
                    />
                  </div>

                  {/* Buttons Builder */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <span>{tx(lang, "Ø£Ø²Ø±Ø§Ø± Ø§Ù„Ø±Ø¯ (Reply Buttons)", "Reply Buttons")}</span>
                        <span className="text-xs font-normal text-gray-400 font-mono">({interactiveForm.buttons.length}/3)</span>
                      </Label>
                    </div>

                    <div className="space-y-3">
                      {interactiveForm.buttons.map((btn, idx) => (
                        <div key={btn.buttonId || idx} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              {tx(lang, `Ø§Ù„Ø²Ø± ${idx + 1}`, `Button ${idx + 1}`)}
                            </span>
                            {interactiveForm.buttons.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveInteractiveButton(idx)}
                                className="text-gray-400 hover:text-red-500 transition p-1"
                                title={tx(lang, "Ø­Ø°Ù Ø§Ù„Ø²Ø±", "Delete button")}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <Label className="text-xs text-gray-500">{tx(lang, "Ù†Øµ Ø§Ù„Ø²Ø±", "Button Text")} *</Label>
                                <span className="text-[10px] text-gray-400 font-mono">{btn.text.length}/20</span>
                              </div>
                              <Input
                                value={btn.text}
                                onChange={e => handleUpdateInteractiveButton(idx, "text", e.target.value.slice(0, 20))}
                                placeholder={idx === 0 ? tx(lang, "Ø§Ù„Ø£Ø³Ø¹Ø§Ø±", "Pricing") : idx === 1 ? tx(lang, "Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª", "Products") : tx(lang, "Ø®Ø¯Ù…Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡", "Support")}
                                className="h-8 text-xs bg-white dark:bg-gray-800"
                                dir="rtl"
                              />
                            </div>

                            <div>
                              <Label className="text-xs text-gray-500 mb-1 block">{tx(lang, "Ø§Ù„Ø®Ø·ÙˆØ© Ø§Ù„ØªØ§Ù„ÙŠØ© (Next Step)", "Next Step")}</Label>
                              <Select
                                value={btn.nextStepId || "NONE"}
                                onValueChange={v => handleUpdateInteractiveButton(idx, "nextStepId", v === "NONE" ? "" : v)}
                              >
                                <SelectTrigger className="h-8 text-xs bg-white dark:bg-gray-800">
                                  <SelectValue placeholder={tx(lang, "Ø§Ø®ØªØ± Ø§Ù„Ø®Ø·ÙˆØ© Ø§Ù„ØªØ§Ù„ÙŠØ©...", "Choose next step...")} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NONE">{tx(lang, "Ø¨Ø¯ÙˆÙ† Ø®Ø·ÙˆØ© ØªØ§Ù„ÙŠØ© (ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø§Ø®ØªÙŠØ§Ø± ÙÙ‚Ø·)", "None (Record choice only)")}</SelectItem>
                                  {rules
                                    .filter(r => r.id !== editTarget?.id)
                                    .map(r => (
                                      <SelectItem key={r.id} value={r.id}>
                                        {r.name} {r.replyType === "INTERACTIVE_MENU" ? `(${tx(lang, "Ù‚Ø§Ø¦Ù…Ø©", "menu")})` : ""}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                              <input
                                type="checkbox"
                                checked={btn.notifyOnSelect === true}
                                onChange={e => handleUpdateInteractiveButton(idx, "notifyOnSelect", e.target.checked)}
                                className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-xs text-gray-600 dark:text-gray-300">
                                {tx(lang, "Ø¥Ø´Ø¹Ø§Ø± Ø¹Ù†Ø¯ Ø§Ø®ØªÙŠØ§Ø± Ù‡Ø°Ø§ Ø§Ù„Ø²Ø±", "Notify when this button is selected")}
                              </span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddInteractiveButton}
                        disabled={interactiveForm.buttons.length >= 3}
                        className="w-full gap-1.5 text-xs h-9 border-dashed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {tx(lang, "Ø¥Ø¶Ø§ÙØ© Ø²Ø± Ø¬Ø¯ÙŠØ¯", "Add Button")}
                      </Button>
                      {interactiveForm.buttons.length >= 3 && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center mt-1 font-medium">
                          {tx(lang, "Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ 3 Ø£Ø²Ø±Ø§Ø± (ÙˆÙÙ‚Ø§Ù‹ Ù„Ù‚ÙŠÙˆØ¯ ÙˆØ§ØªØ³Ø§Ø¨ Ø§Ù„Ø±Ø³Ù…ÙŠØ©)", "Maximum 3 buttons (WhatsApp Cloud API limit)")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live WhatsApp Preview */}
                <div className="md:col-span-5 flex flex-col items-center justify-start pt-2">
                  <Label className="text-xs font-semibold text-gray-500 mb-2">{tx(lang, "Ù…Ø¹Ø§ÙŠÙ†Ø© ÙˆØ§ØªØ³Ø§Ø¨ Ø§Ù„Ù…Ø¨Ø§Ø´Ø±Ø©", "WhatsApp Live Preview")}</Label>
                  <div className="w-full max-w-[260px] bg-[#EFEAE2] dark:bg-[#0b141a] rounded-2xl p-3 border border-gray-300 dark:border-gray-800 shadow-inner">
                    <div className="bg-white dark:bg-[#202c33] rounded-2xl rounded-tr-sm p-3 shadow-sm border border-gray-200/50 dark:border-gray-700/50 space-y-2">
                      <p className="text-xs text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                        {interactiveForm.body || tx(lang, "Ù†Øµ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø³ÙŠØ¸Ù‡Ø± Ù‡Ù†Ø§...", "Message body will appear here...")}
                      </p>
                      {interactiveForm.footer && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700/50 pt-1">
                          {interactiveForm.footer}
                        </p>
                      )}
                      <div className="text-[9px] text-gray-400 text-left pt-0.5">
                        12:00 PM
                      </div>
                    </div>

                    {/* Interactive buttons mockup */}
                    <div className="mt-1.5 space-y-1">
                      {interactiveForm.buttons.map((b, idx) => (
                        <div
                          key={b.buttonId || idx}
                          className="bg-white dark:bg-[#202c33] text-[#00a884] dark:text-[#00a884] font-medium text-xs text-center py-2 px-3 rounded-xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 truncate cursor-default select-none hover:bg-gray-50 dark:hover:bg-[#222e35] transition"
                        >
                          {b.text.trim() || `${tx(lang, "Ø²Ø±", "Button")} ${idx + 1}`}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {dialogMode === "keywords" && (
              <>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "Ø§Ù„ÙƒÙ„Ù…Ø© Ø§Ù„Ù…ÙØªØ§Ø­ÙŠØ©", "Keyword")} *</Label>
                  <Input value={ruleForm.keyword} onChange={e => setRuleForm(f => ({ ...f, keyword: e.target.value }))} placeholder={tx(lang, "Ù…Ø«Ø§Ù„: Ø³Ø¹Ø±", "Example: price")} dir="rtl" />
                  <p className="text-xs text-gray-400 mt-1">{tx(lang, "ÙŠÙÙØ¹ÙŽÙ‘Ù„ Ù„Ùˆ Ø§Ù„Ø±Ø³Ø§Ù„Ø© ÙÙŠÙ‡Ø§ Ø§Ù„ÙƒÙ„Ù…Ø© ÙÙŠ Ø£ÙŠ Ù…ÙƒØ§Ù†", "It activates if the message contains the keyword anywhere")}</p>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "Ù†Øµ Ø§Ù„Ø±Ø¯", "Reply text")} *</Label>
                  <Textarea value={ruleForm.reply} onChange={e => setRuleForm(f => ({ ...f, reply: e.target.value }))} placeholder={tx(lang, "Ø§ÙƒØªØ¨ Ø§Ù„Ø±Ø¯ Ø§Ù„Ù„ÙŠ Ù‡ÙŠØªØ¨Ø¹Øª ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹...", "Write the reply that will be sent automatically...")} className="min-h-[100px] resize-none text-sm" dir="rtl" />
                </div>

                <div>
                  <Label className="text-sm mb-1.5 block flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                    {tx(lang, "ØµÙˆØ±Ø© Ù…Ø±ÙÙ‚Ø©", "Attached image")} <span className="text-gray-400 font-normal text-xs">{tx(lang, "(Ø§Ø®ØªÙŠØ§Ø±ÙŠ)", "(optional)")}</span>
                    {isFree && <Lock className="w-3 h-3 text-amber-500" />}
                  </Label>
                  {isFree ? (
                    <div className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 cursor-not-allowed">
                      <Lock className="w-5 h-5 text-amber-400 mb-1" />
                      <span className="text-xs text-amber-500 font-medium">{tx(lang, "Ù…ØªØ§Ø­Ø© Ù…Ù† Ø¨Ø§Ù‚Ø© Go ÙÙ…Ø§ ÙÙˆÙ‚", "Available on Go plan and above")}</span>
                    </div>
                  ) : ruleForm.replyMediaUrl ? (
                    <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
                      <img src={ruleForm.replyMediaUrl} alt="preview" className="w-full max-h-40 object-cover" />
                      <button
                        type="button"
                        onClick={() => setRuleForm(f => ({ ...f, replyMediaUrl: "" }))}
                        className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                      ><X className="w-3 h-3" /></button>
                      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">{tx(lang, "ØµÙˆØ±Ø© Ù…Ø±ÙÙ‚Ø©", "Attached image")} âœ“</div>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition
                      ${mediaUploading ? "border-blue-300 bg-blue-50 dark:bg-blue-900/10" : "border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"}`}>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); e.target.value = ""; }} />
                      {mediaUploading
                        ? <><Loader2 className="w-5 h-5 text-blue-500 animate-spin mb-1" /><span className="text-xs text-blue-500">{tx(lang, "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø±ÙØ¹...", "Uploading...")}</span></>
                        : <><ImageIcon className="w-5 h-5 text-gray-400 mb-1" /><span className="text-xs text-gray-400">{tx(lang, "Ø§Ø¶ØºØ· Ù„Ø±ÙØ¹ ØµÙˆØ±Ø© (JPG/PNG/WebP â€” max 5MB)", "Click to upload an image (JPG/PNG/WebP â€” max 5MB)")}</span></>}
                    </label>
                  )}
                  {ruleForm.replyMediaUrl && ruleForm.reply && (
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" /> {tx(lang, "Ø§Ù„Ù†Øµ Ù‡ÙŠØ¸Ù‡Ø± ÙƒÙ€ caption ØªØ­Øª Ø§Ù„ØµÙˆØ±Ø© ÙÙŠ ÙˆØ§ØªØ³Ø§Ø¨", "The text will appear as a caption under the image in WhatsApp")}
                    </p>
                  )}
                </div>
              </>
            )}

            {dialogMode === "welcome" && (
              <>
                <WelcomeInfo lang={lang} />
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "Ù†Øµ Ø±Ø³Ø§Ù„Ø© Ø§Ù„ØªØ±Ø­ÙŠØ¨", "Welcome message text")} *</Label>
                  <Textarea value={ruleForm.reply} onChange={e => setRuleForm(f => ({ ...f, reply: e.target.value }))} placeholder={tx(lang, "Ù…Ø«Ø§Ù„: Ø£Ù‡Ù„Ø§Ù‹ ÙˆØ³Ù‡Ù„Ø§Ù‹! ðŸ‘‹ Ù†ÙˆØ±Øª Ù…ØªØ¬Ø±Ù†Ø§. ÙƒÙŠÙ ÙŠÙ…ÙƒÙ†Ù†ÙŠ Ù…Ø³Ø§Ø¹Ø¯ØªÙƒØŸ", "Example: Welcome! ðŸ‘‹ Thank you for reaching our store. How can I help you?")} className="min-h-[120px] resize-none text-sm" dir="rtl" />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                    {tx(lang, "ØµÙˆØ±Ø© Ù…Ø±ÙÙ‚Ø©", "Attached image")} <span className="text-gray-400 font-normal text-xs">{tx(lang, "(Ø§Ø®ØªÙŠØ§Ø±ÙŠ)", "(optional)")}</span>
                    {isFree && <Lock className="w-3 h-3 text-amber-500" />}
                  </Label>
                  {isFree ? (
                    <div className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 cursor-not-allowed">
                      <Lock className="w-5 h-5 text-amber-400 mb-1" />
                      <span className="text-xs text-amber-500 font-medium">{tx(lang, "Ù…ØªØ§Ø­Ø© Ù…Ù† Ø¨Ø§Ù‚Ø© Go ÙÙ…Ø§ ÙÙˆÙ‚", "Available on Go plan and above")}</span>
                    </div>
                  ) : ruleForm.replyMediaUrl ? (
                    <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
                      <img src={ruleForm.replyMediaUrl} alt="preview" className="w-full max-h-40 object-cover" />
                      <button type="button" onClick={() => setRuleForm(f => ({ ...f, replyMediaUrl: "" }))}
                        className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer transition
                      ${mediaUploading ? "border-blue-300 bg-blue-50" : "border-gray-200 dark:border-gray-700 hover:border-blue-300"}`}>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); e.target.value = ""; }} />
                      {mediaUploading
                        ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        : <><ImageIcon className="w-5 h-5 text-gray-400 mb-1" /><span className="text-xs text-gray-400">{tx(lang, "Ø±ÙØ¹ ØµÙˆØ±Ø© (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)", "Upload image (optional)")}</span></>}
                    </label>
                  )}
                </div>
              </>
            )}

            {dialogMode === "timebased" && (
              <>
                <OutboundWarning lang={lang} />
                <div>
                  <Label className="text-sm mb-2 block">{tx(lang, "Ø£ÙŠØ§Ù… Ø§Ù„Ø¥Ø±Ø³Ø§Ù„", "Send days")} *</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_AR.map(d => (
                      <button key={d.key} onClick={() => toggleDay(d.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${ruleForm.days.includes(d.key) ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200"}`}>
                        {lang === "ar" ? d.ar : d.en}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "ÙˆÙ‚Øª Ø§Ù„Ø¥Ø±Ø³Ø§Ù„", "Send time")}</Label>
                  <div className="flex items-center gap-2">
                    <Select value={ruleForm.hour} onValueChange={v => setRuleForm(f => ({ ...f, hour: v }))}>
                      <SelectTrigger className="w-20 font-mono"><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                    <span className="text-gray-400 font-bold">:</span>
                    <Select value={ruleForm.minute} onValueChange={v => setRuleForm(f => ({ ...f, minute: v }))}>
                      <SelectTrigger className="w-20 font-mono"><SelectValue /></SelectTrigger>
                      <SelectContent>{["00", "15", "30", "45"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "Ø§Ù„Ø¬Ù…Ù‡ÙˆØ± Ø§Ù„Ù…Ø³ØªÙ‡Ø¯Ù", "Target audience")} *</Label>
                  <Select value={ruleForm.tbAudienceId} onValueChange={v => setRuleForm(f => ({ ...f, tbAudienceId: v }))}>
                    <SelectTrigger><SelectValue placeholder={tx(lang, "Ø§Ø®ØªØ± Ø¬Ù…Ù‡ÙˆØ±Ø§Ù‹...", "Choose an audience...")} /></SelectTrigger>
                    <SelectContent>
                      {audiences.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} {a._count ? `(${a._count.contacts} ${tx(lang, "Ø¬Ù‡Ø© Ø§ØªØµØ§Ù„", "contacts")})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block flex items-center justify-between">
                    <span>{tx(lang, "Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ Ù„Ø¹Ø¯Ø¯ Ø§Ù„Ù…ÙØ±Ø³ÙŽÙ„ Ø¥Ù„ÙŠÙ‡Ù…", "Maximum recipients")} *</span>
                    {ruleForm.tbAudienceId && (() => {
                      const aud = audiences.find(a => a.id === ruleForm.tbAudienceId);
                      const total = aud?._count?.contacts ?? 0;
                      return total > 0 ? <span className="text-xs text-gray-400 font-normal">{tx(lang, "Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¬Ù…Ù‡ÙˆØ±", "Total audience")}: {total.toLocaleString()}</span> : null;
                    })()}
                  </Label>
                  <Input type="number" min={1} max={100000} dir="ltr"
                    value={ruleForm.tbMaxContacts}
                    onChange={e => setRuleForm(f => ({ ...f, tbMaxContacts: e.target.value }))}
                    placeholder={tx(lang, "Ù…Ø«Ø§Ù„: 500", "Example: 500")} />
                  <p className="text-xs text-gray-400 mt-1">
                    {tx(lang, "Ù„Ùˆ Ø§Ù„Ø¬Ù…Ù‡ÙˆØ± Ø£ÙƒØ¨Ø± Ù…Ù† Ø§Ù„Ø¹Ø¯Ø¯ Ø¯Ù‡ØŒ ÙŠØªØ§Ø®ØªØ§Ø± Ù…Ù†Ù‡Ù… Ø¹Ø´ÙˆØ§Ø¦ÙŠØ§Ù‹", "If the audience is larger than this number, contacts will be selected randomly")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{tx(lang, "Ø§Ù„Ù‚Ø§Ù„Ø¨ Ø§Ù„Ù…Ø¹ØªÙ…Ø¯", "Approved template")} *</Label>
                  <TemplatePicker templates={templates} value={ruleForm.templateId} onChange={v => setRuleForm(f => ({ ...f, templateId: v }))} lang={lang} />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button variant="outline" onClick={() => setShowDialog(false)}>{tx(lang, "Ø¥Ù„ØºØ§Ø¡", "Cancel")}</Button>
            <div className="flex-1" />
            <Button
              className={dialogMode === "interactive" ? "bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5" : "bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"}
              onClick={saveRule}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {editTarget ? tx(lang, "Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª", "Save changes") : tx(lang, "Ø¥Ø¶Ø§ÙØ©", "Add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

