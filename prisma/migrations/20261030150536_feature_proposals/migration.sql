-- CreateEnum
CREATE TYPE "FeatureStatus" AS ENUM ('proposed', 'active', 'rejected');

-- AlterTable
ALTER TABLE "features" ADD COLUMN     "proposal" TEXT,
ADD COLUMN     "proposedAt" TIMESTAMP(3),
ADD COLUMN     "proposedById" TEXT,
ADD COLUMN     "rejectedReason" TEXT,
ADD COLUMN     "status" "FeatureStatus" NOT NULL DEFAULT 'active';

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
