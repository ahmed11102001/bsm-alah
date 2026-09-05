-- AlterTable: ads click IDs for Conversions API attribution (Meta fbc + OpenAI oppref)
ALTER TABLE "User" ADD COLUMN "metaClickId" TEXT,
ADD COLUMN "openaiClickId" TEXT;
