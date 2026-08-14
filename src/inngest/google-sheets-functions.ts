import { inngest } from "./client";
import prisma from "@/lib/prisma";
import { syncGoogleSheet } from "@/lib/google-sheets-sync";

const INTERVAL_MS: Record<string, number> = {
  hourly: 60 * 60 * 1000,
  "6hours": 6 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
};

export const googleSheetsSyncCron = inngest.createFunction(
  { id: "google-sheets-sync-cron", retries: 1, triggers: [{ cron: "0 * * * *" }] },
  async ({ step }: { step: any }) => {
    return step.run("sync-due-google-sheets-connections", async () => {
      const connections = await prisma.googleSheetsConnection.findMany({
        where: { syncInterval: { in: ["hourly", "6hours", "daily"] }, spreadsheetId: { not: null }, sheetName: { not: null } },
      });
      const now = Date.now();
      const results: Array<{ connectionId: string; success: boolean; skipped?: number; error?: string }> = [];
      for (const connection of connections) {
        const interval = INTERVAL_MS[connection.syncInterval ?? ""];
        if (!interval || (connection.lastSyncAt && now - connection.lastSyncAt.getTime() < interval)) continue;
        try {
          const syncResult = await syncGoogleSheet(connection, { allowPartial: true });
          results.push({ connectionId: connection.id, success: true, skipped: syncResult.skippedByLimit });
        } catch (error: any) {
          console.error(`[GoogleSheets] scheduled sync failed for ${connection.id}`, error);
          results.push({ connectionId: connection.id, success: false, error: error?.message ?? "sync failed" });
        }
      }
      return { scanned: connections.length, results };
    });
  },
);
