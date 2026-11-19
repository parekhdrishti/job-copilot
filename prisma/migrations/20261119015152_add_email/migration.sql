-- CreateEnum
CREATE TYPE "EmailCategory" AS ENUM ('RECRUITER', 'OA', 'INTERVIEW', 'REJECTION', 'OFFER', 'CONFIRMATION', 'OTHER');

-- AlterTable
ALTER TABLE "MatchScore" ALTER COLUMN "jobDescription" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Email" (
    "id" SERIAL NOT NULL,
    "gmailId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "category" "EmailCategory" NOT NULL,
    "summary" TEXT NOT NULL,
    "company" TEXT,
    "dueAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicationId" INTEGER,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Email_gmailId_key" ON "Email"("gmailId");

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
