-- Interactive Menu hardening: PROCESSING state for atomic claim
ALTER TYPE "AutomationInteractionState" ADD VALUE IF NOT EXISTS 'PROCESSING';
