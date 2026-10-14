-- DropForeignKey
ALTER TABLE "features" DROP CONSTRAINT "features_ownerId_fkey";

-- AlterTable
ALTER TABLE "features" ADD COLUMN     "plannedEnd" DATE,
ADD COLUMN     "plannedStart" DATE,
ALTER COLUMN "ownerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
