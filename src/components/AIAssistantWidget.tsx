"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Loader2, ChevronDown } from "lucide-react";
import type { Lang } from "@/lib/translations";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Types
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
interface Message {
  id:   string;
  role: "bot" | "user";
  text: string;
}
type Step = "welcome" | "business" | "goal" | "volume" | "form" | "done";
interface Selections {
  business?: string;
  businessLabel?: string;
  goal?:     string;
  volume?:   string;
}

const STORAGE_KEY = "wp_widget_v1"; // "dismissed" | "done"

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Flow content  (AR + EN)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const FLOW = {
  ar: {
    title:    "Ù…Ø³Ø§Ø¹Ø¯ ÙˆØ§ØªØ³ +AI",
    online:   "Ù…ØªØµÙ„ Ø§Ù„Ø¢Ù†",
    powered:  "Ù…Ø¯Ø¹ÙˆÙ… Ø¨Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ",
    proactive:"Ø¹Ø§ÙŠØ² ØªØ¹Ø±Ù Ø¥Ø°Ø§ ÙˆØ§ØªØ³ Ø¨Ø±Ùˆ Ù…Ù†Ø§Ø³Ø¨ Ù„Ù†Ø´Ø§Ø·ÙƒØŸ ðŸ‘‹",

    welcome:  "ðŸ‘‹ Ø£Ù‡Ù„Ø§Ù‹ Ø¨ÙŠÙƒ ÙÙŠ ÙˆØ§ØªØ³ Ø¨Ø±Ùˆ!\nØ£Ù‚Ø¯Ø± Ø£Ø³Ø§Ø¹Ø¯Ùƒ ØªØ¹Ø±Ù Ø¥Ø°Ø§ Ø§Ù„Ø³ÙŠØ³ØªÙ… Ù…Ù†Ø§Ø³Ø¨ Ù„Ù†Ø´Ø§Ø·Ùƒ ÙÙŠ Ø¯Ù‚ÙŠÙ‚Ø© ÙˆØ§Ø­Ø¯Ø© Ø¨Ø³.",
    welcomeButtons: [
      { label: "Ø§Ø¨Ø¯Ø£ ðŸš€",   value: "start"  },
      { label: "Ù„Ø§Ø­Ù‚Ø§Ù‹",    value: "later"  },
    ],

    step1Q: "Ù…Ù…ØªØ§Ø²! Ù†Ø´Ø§Ø·Ùƒ Ø¥ÙŠÙ‡ØŸ ðŸ‘‡",
    step1Buttons: [
      { label: "ðŸ›ï¸ Ù…ØªØ¬Ø± Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ", value: "store"       },
      { label: "ðŸ¢ Ø´Ø±ÙƒØ© Ø®Ø¯Ù…Ø§Øª",    value: "services"    },
      { label: "ðŸ¥ Ø¹ÙŠØ§Ø¯Ø©",          value: "clinic"      },
      { label: "ðŸ  Ø¹Ù‚Ø§Ø±Ø§Øª",         value: "real_estate" },
      { label: "ðŸ• Ù…Ø·Ø¹Ù…",           value: "restaurant"  },
      { label: "ðŸ’¼ Ù†Ø´Ø§Ø· Ø¢Ø®Ø±",       value: "other"       },
    ],
    valueProps: {
      store:       "ðŸš€ Ù…Ù…ØªØ§Ø²! Ø£ØºÙ„Ø¨ Ø§Ù„Ù…ØªØ§Ø¬Ø± Ø¨ØªØ³ØªØ®Ø¯Ù… ÙˆØ§ØªØ³ Ø¨Ø±Ùˆ Ù„ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø·Ù„Ø¨Ø§ØªØŒ Ø§Ø³ØªØ±Ø¬Ø§Ø¹ Ø§Ù„Ø³Ù„Ø§Øª Ø§Ù„Ù…ØªØ±ÙˆÙƒØ©ØŒ ÙˆØ²ÙŠØ§Ø¯Ø© Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹.",
      services:    "ðŸš€ Ù…Ù…ØªØ§Ø²! Ø´Ø±ÙƒØ§Øª Ø§Ù„Ø®Ø¯Ù…Ø§Øª Ø¨ØªØ³ØªØ®Ø¯Ù… ÙˆØ§ØªØ³ Ø¨Ø±Ùˆ Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ù„ÙŠØ¯Ø² ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ ÙˆØªÙ‚Ù„ÙŠÙ„ ÙˆÙ‚Øª Ø§Ù„Ø±Ø¯ Ø¬Ø¯Ø§Ù‹.",
      clinic:      "ðŸš€ Ù…Ù…ØªØ§Ø²! Ø§Ù„Ø¹ÙŠØ§Ø¯Ø§Øª Ø¨ØªØ³ØªØ®Ø¯Ù… ÙˆØ§ØªØ³ Ø¨Ø±Ùˆ Ù„ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ù…ÙˆØ§Ø¹ÙŠØ¯ ÙˆØªÙ‚Ù„ÙŠÙ„ Ø§Ù„Ù€ no-shows Ø¨Ù†Ø³Ø¨Ø© ØªØµÙ„ Ù„Ù€ 60%.",
      real_estate: "ðŸš€ Ù…Ù…ØªØ§Ø²! Ø§Ù„Ù…Ø·ÙˆØ±ÙŠÙ† Ø§Ù„Ø¹Ù‚Ø§Ø±ÙŠÙŠÙ† Ø¨ÙŠØ³ØªØ®Ø¯Ù…ÙˆØ§ ÙˆØ§ØªØ³ Ø¨Ø±Ùˆ Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø§Ù„Ù…Ù‡ØªÙ…ÙŠÙ† Ø¹Ù„Ù‰ Ù…Ø¯Ø§Ø± Ø§Ù„Ø³Ø§Ø¹Ø©.",
      restaurant:  "ðŸš€ Ù…Ù…ØªØ§Ø²! Ø§Ù„Ù…Ø·Ø§Ø¹Ù… Ø¨ØªØ³ØªØ®Ø¯Ù… ÙˆØ§ØªØ³ Ø¨Ø±Ùˆ Ù„ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø·Ù„Ø¨Ø§ØªØŒ Ø§Ù„ØªÙˆØµÙŠÙ„ØŒ ÙˆØ§Ù„Ø¹Ø±ÙˆØ¶ Ø§Ù„Ø®Ø§ØµØ©.",
      other:       "ðŸš€ Ù…Ù…ØªØ§Ø²! ÙˆØ§ØªØ³ Ø¨Ø±Ùˆ Ù…Ù†Ø§Ø³Ø¨ Ù„Ø£ÙŠ Ù†Ø´Ø§Ø· ØªØ¬Ø§Ø±ÙŠ Ø¨ÙŠØªØ¹Ø§Ù…Ù„ Ù…Ø¹ Ø¹Ù…Ù„Ø§Ø¡ Ø¹Ù„Ù‰ Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨.",
    } as Record<string, string>,

    step2Q: "Ø¥ÙŠÙ‡ Ø£Ù‡Ù… Ø­Ø§Ø¬Ø© Ù…Ø­ØªØ§Ø¬Ù‡Ø§ØŸ ðŸŽ¯",
    step2Buttons: [
      { label: "ðŸ¤– Ø£ØªÙ…ØªØ© Ø§Ù„Ø±Ø¯ÙˆØ¯",   value: "automation"   },
      { label: "ðŸ“¢ Ø­Ù…Ù„Ø§Øª ÙˆØ§ØªØ³Ø§Ø¨",   value: "campaigns"    },
      { label: "ðŸ”— Ø±Ø¨Ø· Ø§Ù„Ù…ØªØ¬Ø±",     value: "integration"  },
      { label: "âœ¨ ÙƒÙ„ Ø¯Ù‡",           value: "all"          },
    ],

    socialProof: "ðŸ”¥ +200 Ø¨ÙŠØ²Ù†Ø³ Ø¨ÙŠØ³ØªØ®Ø¯Ù… ÙˆØ§ØªØ³ Ø¨Ø±Ùˆ ÙŠÙˆÙ…ÙŠØ§Ù‹ Ù„Ø²ÙŠØ§Ø¯Ø© Ù…Ø¨ÙŠØ¹Ø§ØªÙ‡Ù… Ø¹Ù„Ù‰ Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨.",
    step3Q:      "ØªÙ‚Ø±ÙŠØ¨Ù‹Ø§ Ø¨ÙŠÙˆØµÙ„Ùƒ ÙƒØ§Ù… Ø±Ø³Ø§Ù„Ø© ÙŠÙˆÙ…ÙŠÙ‹Ø§ØŸ ðŸ“Š",
    step3Buttons: [
      { label: "Ø£Ù‚Ù„ Ù…Ù† 50",  value: "<50"      },
      { label: "50 â€“ 200",   value: "50-200"   },
      { label: "200 â€“ 1000", value: "200-1000" },
      { label: "+1000",      value: "+1000"    },
    ],

    step4Msg:  "ðŸ‘Œ Ø£Ù‚Ø¯Ø± Ø£Ø¬Ù‡Ø²Ù„Ùƒ Ø£ÙØ¶Ù„ Setup Ù…Ù†Ø§Ø³Ø¨ Ù„Ù†Ø´Ø§Ø·Ùƒ ØªÙ…Ø§Ù…Ù‹Ø§.\n\nØ³ÙŠØ¨ Ø¨ÙŠØ§Ù†Ø§ØªÙƒ ÙˆÙØ±ÙŠÙ‚Ù†Ø§ Ù‡ÙŠØªÙˆØ§ØµÙ„ Ù…Ø¹Ø§Ùƒ Ø®Ù„Ø§Ù„ Ø³Ø§Ø¹Ø§Øª! ðŸŽ‰",
    namePh:    "Ø§Ø³Ù…Ùƒ...",
    phonePh:   "Ø±Ù‚Ù… Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨ (Ù…Ø«Ø§Ù„: 01012345678)",
    submitBtn: "Ø§Ø­Ø¬Ø² Setup Ù…Ø¬Ø§Ù†ÙŠ âœ…",
    sending:   "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„...",
    nameErr:   "Ù…Ù† ÙØ¶Ù„Ùƒ Ø§ÙƒØªØ¨ Ø§Ø³Ù…Ùƒ",
    phoneErr:  "Ù…Ù† ÙØ¶Ù„Ùƒ Ø§ÙƒØªØ¨ Ø±Ù‚Ù… ÙˆØ§ØªØ³Ø§Ø¨ ØµØ­ÙŠØ­",

    doneMsg:      "âœ… ØªÙ…! ÙØ±ÙŠÙ‚ ÙˆØ§ØªØ³ Ø¨Ø±Ùˆ Ù‡ÙŠØªÙˆØ§ØµÙ„ Ù…Ø¹Ø§Ùƒ Ù‚Ø±ÙŠØ¨Ù‹Ø§.",
    ctaWhatsapp:  "ðŸ’¬ ØªÙˆØ§ØµÙ„ Ù…Ø¹ Ø§Ù„Ø³ÙŠÙ„Ø²",
    ctaPricing:   "ðŸ’° Ø´ÙˆÙ Ø§Ù„Ø£Ø³Ø¹Ø§Ø±",
    ctaScroll:    "ðŸ“– Ø§Ø¹Ø±Ù Ø£ÙƒØªØ±",
    waMsg:        (name: string, biz: string, goal: string) =>
      `Ù…Ø±Ø­Ø¨Ø§Ù‹! Ø§Ø³Ù…ÙŠ ${name}ØŒ Ø¹Ù†Ø¯ÙŠ ${biz} ÙˆØ£Ù‡ØªÙ… Ø¨Ù€ ${goal} â€” Ø¹Ø§ÙŠØ² Ø£Ø¹Ø±Ù Ø£ÙƒØªØ± Ø¹Ù† ÙˆØ§ØªØ³ Ø¨Ø±Ùˆ.`,
    progress:     (step: number, total: number) => `${step} / ${total}`,
  },

  en: {
    title:    "WANI +AI Assistant",
    online:   "Online now",
    powered:  "Powered by AI",
    proactive:"Want to know if WANI fits your business? ðŸ‘‹",

    welcome:  "ðŸ‘‹ Welcome to WANI!\nI can help you find out if our system fits your business â€” in just a minute.",
    welcomeButtons: [
      { label: "Let's Start ðŸš€", value: "start" },
      { label: "Maybe Later",    value: "later" },
    ],

    step1Q: "Great! What's your business type? ðŸ‘‡",
    step1Buttons: [
      { label: "ðŸ›ï¸ Online Store",    value: "store"       },
      { label: "ðŸ¢ Service Company", value: "services"    },
      { label: "ðŸ¥ Clinic",          value: "clinic"      },
      { label: "ðŸ  Real Estate",     value: "real_estate" },
      { label: "ðŸ• Restaurant",      value: "restaurant"  },
      { label: "ðŸ’¼ Other",           value: "other"       },
    ],
    valueProps: {
      store:       "ðŸš€ Great! Most online stores use WANI to confirm orders, recover abandoned carts, and automate sales.",
      services:    "ðŸš€ Great! Service companies use WANI to follow up on leads automatically and cut response times.",
      clinic:      "ðŸš€ Great! Clinics use WANI to confirm appointments and reduce no-shows by up to 60%.",
      real_estate: "ðŸš€ Great! Real estate developers use WANI to follow up with interested clients 24/7.",
      restaurant:  "ðŸš€ Great! Restaurants use WANI for order confirmations, delivery updates, and special offers.",
      other:       "ðŸš€ Great! WANI works for any business that communicates with customers on WhatsApp.",
    } as Record<string, string>,

    step2Q: "What's your top priority? ðŸŽ¯",
    step2Buttons: [
      { label: "ðŸ¤– Automate Replies",   value: "automation"  },
      { label: "ðŸ“¢ WhatsApp Campaigns", value: "campaigns"   },
      { label: "ðŸ”— Store Integration",  value: "integration" },
      { label: "âœ¨ All of the above",   value: "all"         },
    ],

    socialProof: "ðŸ”¥ 200+ businesses use WANI daily to boost their WhatsApp sales.",
    step3Q:      "How many messages do you receive daily? ðŸ“Š",
    step3Buttons: [
      { label: "Less than 50", value: "<50"      },
      { label: "50 â€“ 200",     value: "50-200"   },
      { label: "200 â€“ 1,000",  value: "200-1000" },
      { label: "+1,000",       value: "+1000"    },
    ],

    step4Msg:  "ðŸ‘Œ I can help you set up the perfect plan for your business.\n\nLeave your info and our team will reach out within hours! ðŸŽ‰",
    namePh:    "Your name...",
    phonePh:   "WhatsApp number (e.g. +201012345678)",
    submitBtn: "Book Free Setup âœ…",
    sending:   "Sending...",
    nameErr:   "Please enter your name",
    phoneErr:  "Please enter a valid WhatsApp number",

    doneMsg:      "âœ… Done! The WANI team will contact you soon.",
    ctaWhatsapp:  "ðŸ’¬ Chat with Sales",
    ctaPricing:   "ðŸ’° View Pricing",
    ctaScroll:    "ðŸ“– Learn More",
    waMsg:        (name: string, biz: string, goal: string) =>
      `Hi! My name is ${name}, I have a ${biz} and I'm interested in ${goal} â€” I'd love to learn more about WANI.`,
    progress:     (step: number, total: number) => `${step} / ${total}`,
  },
} as const;

const TOTAL_STEPS = 4; // 1:business 2:goal 3:volume 4:form

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Helpers
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let _msgId = 0;
const uid = () => `m${++_msgId}`;

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-gray-400 opacity-60"
          style={{ animation: `wpBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Main Component
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export default function AIAssistantWidget({ lang }: { lang: Lang }) {
  const f   = FLOW[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [isOpen,     setIsOpen]     = useState(false);
  const [step,       setStep]       = useState<Step>("welcome");
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [isTyping,   setIsTyping]   = useState(false);
  const [selections, setSelections] = useState<Selections>({});
  const [showForm,   setShowForm]   = useState(false);
  const [formName,   setFormName]   = useState("");
  const [formPhone,  setFormPhone]  = useState("");
  const [formErr,    setFormErr]    = useState<{name?:string;phone?:string}>({});
  const [formStartT, setFormStartT] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [proactive,  setProactive]  = useState(false);
  const [dismissed,  setDismissed]  = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const openTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proactiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SALES_WA = process.env.NEXT_PUBLIC_SALES_WHATSAPP ?? "201281657907";

  // â”€â”€ Scroll to bottom on new messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, showForm]);

  // â”€â”€ Session storage read â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "done") {
      setStep("done");
    }
    if (stored === "dismissed" || stored === "done") {
      setDismissed(true);
      return;
    }
    // Auto-open after 7s + proactive bubble after 5s
    proactiveTimerRef.current = setTimeout(() => setProactive(true), 5000);
    openTimerRef.current      = setTimeout(() => {
      setIsOpen(true);
      setProactive(false);
    }, 7000);

    return () => {
      if (openTimerRef.current)      clearTimeout(openTimerRef.current);
      if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
    };
  }, []);

  // â”€â”€ Reset messages when lang changes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    setMessages([]);
    setStep("welcome");
    setShowForm(false);
    setSelections({});
  }, [lang]);

  // â”€â”€ Initialize messages when opened (or after lang reset) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!isOpen) return;
    const flow = FLOW[lang];
    setIsTyping(true);
    const t = setTimeout(() => {
      setIsTyping(false);
      setMessages([{ id: uid(), role: "bot", text: flow.welcome }]);
    }, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lang]);

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pushBotMessage = useCallback(
    (text: string, delay = 600) => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { id: uid(), role: "bot", text }]);
      }, delay);
    },
    []
  );

  const pushUserMessage = (text: string) => {
    setMessages(prev => [...prev, { id: uid(), role: "user", text }]);
  };

  // â”€â”€ Open / Close â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleOpen = () => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    setProactive(false);
    setIsOpen(true);
  };
  const handleClose = () => {
    setIsOpen(false);
    if (step !== "done") {
      sessionStorage.setItem(STORAGE_KEY, "dismissed");
      setDismissed(true);
    }
  };

  // â”€â”€ Welcome step buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleWelcomeBtn = (value: string) => {
    if (value === "later") {
      handleClose();
      return;
    }
    pushUserMessage(f.welcomeButtons[0].label);
    setStep("business");
    setTimeout(() => pushBotMessage(f.step1Q, 800), 200);
  };

  // â”€â”€ Step 1: Business â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleBusiness = (value: string, label: string) => {
    pushUserMessage(label);
    setSelections(s => ({ ...s, business: value, businessLabel: label }));
    setStep("goal");
    const vp = f.valueProps[value] ?? f.valueProps["other"];
    setTimeout(() => {
      pushBotMessage(vp, 800);
      setTimeout(() => pushBotMessage(f.step2Q, 1800), 800);
    }, 200);
  };

  // â”€â”€ Step 2: Goal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleGoal = (value: string, label: string) => {
    pushUserMessage(label);
    setSelections(s => ({ ...s, goal: value }));
    setStep("volume");
    setTimeout(() => {
      pushBotMessage(f.socialProof, 800);
      setTimeout(() => pushBotMessage(f.step3Q, 1800), 800);
    }, 200);
  };

  // â”€â”€ Step 3: Volume â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleVolume = (value: string, label: string) => {
    pushUserMessage(label);
    setSelections(s => ({ ...s, volume: value }));
    setStep("form");
    setFormStartT(Date.now());
    setTimeout(() => {
      pushBotMessage(f.step4Msg, 800);
      setTimeout(() => setShowForm(true), 1600);
    }, 200);
  };

  // â”€â”€ Step 4: Form submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSubmit = async () => {
    const errs: typeof formErr = {};
    if (!formName.trim())                         errs.name  = f.nameErr;
    if (!/\d{7,15}/.test(formPhone.replace(/\D/g, ""))) errs.phone = f.phoneErr;
    if (Object.keys(errs).length) { setFormErr(errs); return; }
    setFormErr({});

    setSubmitting(true);
    try {
      await fetch("/api/leads", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:     formName.trim(),
          phone:    formPhone.trim(),
          business: selections.business  ?? "other",
          goal:     selections.goal      ?? "all",
          volume:   selections.volume    ?? "unknown",
          lang,
          source:   typeof window !== "undefined" ? window.location.href : null,
          _t:       formStartT,   // honeypot: server checks elapsed time
        }),
      });
    } catch {
      // silent fail â€” user still sees success
    }
    setSubmitting(false);
    setShowForm(false);
    setStep("done");
    sessionStorage.setItem(STORAGE_KEY, "done");
    pushUserMessage(`${formName} â€” ${formPhone}`);
    setTimeout(() => pushBotMessage(f.doneMsg, 800), 300);
  };

  // â”€â”€ Current step number for progress â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const stepNum =
    step === "welcome" ? 0 :
    step === "business" ? 1 :
    step === "goal"     ? 2 :
    step === "volume"   ? 3 :
    step === "form"     ? 4 : 4;

  // â”€â”€ Buttons to show under messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const showWelcomeBtns = step === "welcome"  && !isTyping && messages.length > 0;
  const showBiz         = step === "business" && !isTyping && messages.length >= 2;
  const showGoal        = step === "goal"     && !isTyping && messages.length >= 4;
  const showVolume      = step === "volume"   && !isTyping && messages.length >= 6;

  // â”€â”€ WhatsApp CTA link â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const waHref = `https://wa.me/${SALES_WA}?text=${encodeURIComponent(
    f.waMsg(formName || "Ø²Ø§Ø¦Ø±", selections.businessLabel ?? selections.business ?? "", selections.goal ?? "")
  )}`;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Render
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  return (
    <>
      {/* â”€â”€ CSS animations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <style>{`
        @keyframes wpBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .6; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes wpGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37,211,102,.5); }
          50%       { box-shadow: 0 0 0 12px rgba(37,211,102,0); }
        }
        @keyframes wpSlideUp {
          from { opacity:0; transform: translateY(16px) scale(.97); }
          to   { opacity:1; transform: translateY(0)    scale(1);   }
        }
        @keyframes wpFadeIn {
          from { opacity:0; transform: translateY(6px); }
          to   { opacity:1; transform: translateY(0);   }
        }
        .wp-slide-up  { animation: wpSlideUp .3s ease forwards; }
        .wp-fade-in   { animation: wpFadeIn .25s ease forwards; }
        .wp-glow-btn  { animation: wpGlow 2.5s ease-in-out infinite; }
      `}</style>

      {/* â”€â”€ Proactive bubble â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {proactive && !isOpen && !dismissed && (
        <button
          onClick={handleOpen}
          dir={dir}
          className="fixed bottom-24 left-6 z-40 bg-white text-gray-800 text-sm font-medium
                     px-4 py-2.5 rounded-2xl shadow-xl border border-gray-100 wp-fade-in
                     hover:shadow-2xl transition-shadow max-w-[220px] text-right"
          style={{ direction: dir }}
        >
          {f.proactive}
        </button>
      )}

      {/* â”€â”€ Chat window â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isOpen && (
        <div
          dir={dir}
          className="fixed bottom-24 left-4 z-50 w-[calc(100vw-2rem)] max-w-[360px]
                     bg-gray-950 border border-gray-800 rounded-3xl shadow-2xl
                     flex flex-col overflow-hidden wp-slide-up"
          style={{ maxHeight: "min(600px, calc(100vh - 120px))" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center flex-shrink-0">
                <img src="/wani.svg" alt="WANI" className="rounded-sm object-cover" style={{ width: 18, height: 18 }} />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-gray-900" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">{f.title}</p>
                <p className="text-green-400 text-[10px] leading-tight">{f.online}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {step !== "done" && stepNum > 0 && (
                <span className="text-gray-500 text-[10px]">{f.progress(stepNum, TOTAL_STEPS)}</span>
              )}
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-300 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {step !== "done" && stepNum > 0 && (
            <div className="h-0.5 bg-gray-800 flex-shrink-0">
              <div
                className="h-full bg-[#25D366] transition-all duration-500"
                style={{ width: `${(stepNum / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-700">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex wp-fade-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "bot" && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E]
                                  flex items-center justify-center flex-shrink-0 mt-1 mx-1.5">
                    <img src="/wani.svg" alt="WANI" style={{ width: 12, height: 12 }} />
                  </div>
                )}
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[#25D366] text-white rounded-br-sm"
                      : "bg-gray-800 text-gray-100 rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-start wp-fade-in">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E]
                                flex items-center justify-center flex-shrink-0 mt-1 mx-1.5">
                  <img src="/wani.svg" alt="WANI" style={{ width: 12, height: 12 }} />
                </div>
                <div className="bg-gray-800 rounded-2xl rounded-bl-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            {/* â”€â”€ Welcome buttons â”€â”€ */}
            {showWelcomeBtns && (
              <div className="flex gap-2 flex-wrap justify-end wp-fade-in">
                {f.welcomeButtons.map(b => (
                  <button key={b.value} onClick={() => handleWelcomeBtn(b.value)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-100 text-sm
                               px-4 py-2 rounded-xl border border-gray-700 hover:border-[#25D366]
                               transition-all duration-200 active:scale-95">
                    {b.label}
                  </button>
                ))}
              </div>
            )}

            {/* â”€â”€ Business buttons â”€â”€ */}
            {showBiz && (
              <div className="grid grid-cols-2 gap-1.5 wp-fade-in">
                {f.step1Buttons.map(b => (
                  <button key={b.value} onClick={() => handleBusiness(b.value, b.label)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-100 text-xs
                               px-3 py-2.5 rounded-xl border border-gray-700 hover:border-[#25D366]
                               transition-all duration-200 active:scale-95 text-center">
                    {b.label}
                  </button>
                ))}
              </div>
            )}

            {/* â”€â”€ Goal buttons â”€â”€ */}
            {showGoal && (
              <div className="grid grid-cols-2 gap-1.5 wp-fade-in">
                {f.step2Buttons.map(b => (
                  <button key={b.value} onClick={() => handleGoal(b.value, b.label)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-100 text-xs
                               px-3 py-2.5 rounded-xl border border-gray-700 hover:border-[#25D366]
                               transition-all duration-200 active:scale-95 text-center">
                    {b.label}
                  </button>
                ))}
              </div>
            )}

            {/* â”€â”€ Volume buttons â”€â”€ */}
            {showVolume && (
              <div className="grid grid-cols-2 gap-1.5 wp-fade-in">
                {f.step3Buttons.map(b => (
                  <button key={b.value} onClick={() => handleVolume(b.value, b.label)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-100 text-xs
                               px-3 py-2.5 rounded-xl border border-gray-700 hover:border-[#25D366]
                               transition-all duration-200 active:scale-95 text-center">
                    {b.label}
                  </button>
                ))}
              </div>
            )}

            {/* â”€â”€ Lead form â”€â”€ */}
            {showForm && step === "form" && (
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 space-y-3 wp-fade-in">
                <div>
                  <input
                    value={formName}
                    onChange={e => { setFormName(e.target.value); setFormErr(p => ({ ...p, name: undefined })); }}
                    placeholder={f.namePh}
                    className={`w-full bg-gray-800 border ${formErr.name ? "border-red-500" : "border-gray-700"}
                                focus:border-[#25D366] rounded-xl px-3 py-2.5 text-sm text-gray-100
                                placeholder-gray-500 outline-none transition`}
                  />
                  {formErr.name && <p className="text-red-400 text-xs mt-1">{formErr.name}</p>}
                </div>
                <div>
                  <input
                    value={formPhone}
                    onChange={e => { setFormPhone(e.target.value); setFormErr(p => ({ ...p, phone: undefined })); }}
                    placeholder={f.phonePh}
                    inputMode="tel"
                    dir="ltr"
                    className={`w-full bg-gray-800 border ${formErr.phone ? "border-red-500" : "border-gray-700"}
                                focus:border-[#25D366] rounded-xl px-3 py-2.5 text-sm text-gray-100
                                placeholder-gray-500 outline-none transition`}
                  />
                  {formErr.phone && <p className="text-red-400 text-xs mt-1">{formErr.phone}</p>}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-[#25D366] hover:bg-[#20bb5a] disabled:opacity-60
                             text-white font-semibold py-2.5 rounded-xl text-sm
                             transition-all duration-200 active:scale-[.98] flex items-center justify-center gap-2"
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" />{f.sending}</>
                    : f.submitBtn}
                </button>
              </div>
            )}

            {/* â”€â”€ Done CTAs â”€â”€ */}
            {step === "done" && !isTyping && messages.some(m => m.text.includes("âœ…")) && (
              <div className="flex flex-col gap-2 wp-fade-in">
                <a href={waHref} target="_blank" rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#20bb5a] text-white font-semibold
                             py-2.5 rounded-xl text-sm text-center transition-all duration-200 active:scale-[.98]">
                  {f.ctaWhatsapp}
                </a>
                <button
                  onClick={() => { setIsOpen(false); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-gray-100
                             py-2.5 rounded-xl text-sm transition-all duration-200 active:scale-[.98]">
                  {f.ctaPricing}
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-800 flex-shrink-0 flex items-center justify-center gap-1">
            <span className="text-[10px] text-gray-600">{f.powered}</span>
            <span className="w-1 h-1 rounded-full bg-gray-700" />
            <span className="text-[10px] text-gray-600">WANI</span>
          </div>
        </div>
      )}

      {/* â”€â”€ Floating bubble button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <button
        onClick={handleOpen}
        aria-label={f.title}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full
                   bg-gradient-to-br from-[#25D366] to-[#128C7E]
                   flex items-center justify-center
                   hover:scale-110 active:scale-95 transition-transform duration-200
                   shadow-lg shadow-green-500/40 wp-glow-btn"
      >
        {isOpen ? (
          <ChevronDown className="w-6 h-6 text-white" />
        ) : (
          <img src="/wani.svg" alt="WANI" className="w-6 h-6 rounded-md object-cover" />
        )}
        {/* Notification dot Ù„Ùˆ ÙÙŠÙ‡ proactive */}
        {proactive && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full
                           border-2 border-white text-white text-[8px] flex items-center justify-center font-bold">
            1
          </span>
        )}
      </button>
    </>
  );
}
