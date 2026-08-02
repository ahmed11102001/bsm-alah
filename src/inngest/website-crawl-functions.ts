import { inngest } from "./client";
import { crawlWebsite } from "@/lib/website-crawl";

export const websiteCrawlOnDemand = inngest.createFunction(
  { id: "website-crawl-on-demand", retries: 1, triggers: [{ event: "website/crawl.requested" }] },
  async ({ event, step }: { event: any; step: any }) => {
    const { userId, rootUrl } = event.data as { userId: string; rootUrl: string };
    if (!userId || !rootUrl) return { success: false, error: "userId and rootUrl are required" };
    return step.run("crawl-website", () => crawlWebsite(userId, rootUrl));
  },
);
