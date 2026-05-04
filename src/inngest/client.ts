import { Inngest } from "inngest";
import * as shopifyFunctions from "./shopify-functions";

export const inngest = new Inngest({
  id: "bsm-alah",
  functions: {
    ...shopifyFunctions,
  },
  // في الـ production Inngest بيقرأ INNGEST_EVENT_KEY من الـ env تلقائي
});