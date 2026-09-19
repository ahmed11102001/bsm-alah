-- AlterEnum: add POST_DELIVERY, CART_ABANDONED, VIP_REPEAT, WIN_BACK
-- (ADD VALUE can't run inside migrate's transaction → full enum swap instead)
CREATE TYPE "EmailAutomationType_new" AS ENUM ('BIRTHDAY', 'POST_DELIVERY', 'CART_ABANDONED', 'VIP_REPEAT', 'WIN_BACK');
ALTER TABLE "EmailAutomation" ALTER COLUMN "type" TYPE "EmailAutomationType_new" USING "type"::text::"EmailAutomationType_new";
ALTER TYPE "EmailAutomationType" RENAME TO "EmailAutomationType_old";
ALTER TYPE "EmailAutomationType_new" RENAME TO "EmailAutomationType";
DROP TYPE "EmailAutomationType_old";
