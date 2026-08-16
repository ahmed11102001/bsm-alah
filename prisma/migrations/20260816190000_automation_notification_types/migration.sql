-- Notification types for interactive-menu hardening: surface FAILED / loop-protection events
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AUTOMATION_FAILED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AUTOMATION_LOOP_STOPPED';