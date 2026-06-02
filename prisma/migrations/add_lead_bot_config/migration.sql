-- CreateTable: LeadBotConfig
-- يخزن إعدادات بوت الليدز — قالب واتساب يتبعت تلقائياً لكل lead جديد

CREATE TABLE "LeadBotConfig" (
    "id"              TEXT NOT NULL,
    "ownerId"         TEXT NOT NULL,
    "templateId"      TEXT,
    "templateName"    TEXT,
    "templateLang"    TEXT NOT NULL DEFAULT 'ar',
    "isActive"        BOOLEAN NOT NULL DEFAULT false,
    "lastSentLeadId"  TEXT,
    "sentCount"       INTEGER NOT NULL DEFAULT 0,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadBotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadBotConfig_ownerId_key" ON "LeadBotConfig"("ownerId");
CREATE INDEX "LeadBotConfig_isActive_idx" ON "LeadBotConfig"("isActive");
