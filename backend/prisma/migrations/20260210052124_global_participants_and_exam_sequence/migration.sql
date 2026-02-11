/*
  Warnings:

  - You are about to drop the column `examId` on the `Participant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[participantId]` on the table `Participant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Participant" DROP CONSTRAINT "Participant_examId_fkey";

-- DropIndex
DROP INDEX "Participant_examId_participantId_key";

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "sequence" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Participant" DROP COLUMN "examId";

-- CreateTable
CREATE TABLE "_ExamToParticipant" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ExamToParticipant_AB_unique" ON "_ExamToParticipant"("A", "B");

-- CreateIndex
CREATE INDEX "_ExamToParticipant_B_index" ON "_ExamToParticipant"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_participantId_key" ON "Participant"("participantId");

-- AddForeignKey
ALTER TABLE "_ExamToParticipant" ADD CONSTRAINT "_ExamToParticipant_A_fkey" FOREIGN KEY ("A") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExamToParticipant" ADD CONSTRAINT "_ExamToParticipant_B_fkey" FOREIGN KEY ("B") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
