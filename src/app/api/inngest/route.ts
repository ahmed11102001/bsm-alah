// src/app/api/inngest/route.ts
// ─── Inngest Handler ──────────────────────────────────────────────────────────
// ده الباب اللي Inngest بيكلم مشروعك من خلاله
// لازم يكون accessible (مش محمي بـ auth)

import { serve }            from "inngest/next";
import { inngest }          from "@/inngest/client";
import { processCampaign, sendDirectMessage } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client:    inngest,
  functions: [processCampaign, sendDirectMessage],
});