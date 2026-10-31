-- AlterTable
ALTER TABLE "features" ADD COLUMN     "phaseId" TEXT;

-- CreateTable
CREATE TABLE "project_phases" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "project_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_dependencies" (
    "featureId" TEXT NOT NULL,
    "dependsOnId" TEXT NOT NULL,

    CONSTRAINT "feature_dependencies_pkey" PRIMARY KEY ("featureId","dependsOnId")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_phases_projectId_code_key" ON "project_phases"("projectId", "code");

-- CreateIndex
CREATE INDEX "feature_dependencies_dependsOnId_idx" ON "feature_dependencies"("dependsOnId");

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "project_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_dependencies" ADD CONSTRAINT "feature_dependencies_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_dependencies" ADD CONSTRAINT "feature_dependencies_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;
