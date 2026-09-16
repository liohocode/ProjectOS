/*
  Warnings:

  - Added the required column `summary` to the `docs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "docs" ADD COLUMN     "summary" TEXT NOT NULL;
