-- DropIndex
DROP INDEX "QueueTicket_fullNumber_key";

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "examination" TEXT,
ADD COLUMN     "vitalsBp" TEXT,
ADD COLUMN     "vitalsPulse" TEXT,
ADD COLUMN     "vitalsTemp" TEXT;
