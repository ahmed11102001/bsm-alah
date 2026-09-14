-- Agent Beta Access: dedicated notification types (shown in preferences modal)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGENT_BETA_ACTIVATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGENT_BETA_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGENT_BETA_LOW_TOKENS';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGENT_BETA_ENDED';
