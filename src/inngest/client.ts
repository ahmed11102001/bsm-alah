import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "bsm-alah",
  // في الـ production Inngest بيقرأ INNGEST_EVENT_KEY من الـ env تلقائي
});