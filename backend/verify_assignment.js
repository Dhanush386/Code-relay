const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyRandomAssignment() {
    try {
        console.log('--- Starting Verification ---');

        // 1. Get an existing exam and its questions
        const exam = await prisma.exam.findFirst({
            include: { questions: true }
        });

        if (!exam || exam.questions.length < 2) {
            console.log('Warning: Need an exam with at least 2 questions for meaningful random testing.');
            if (!exam) return;
        }

        console.log(`Testing with Exam: ${exam.title} (ID: ${exam.id})`);
        console.log(`Questions in pool: ${exam.questions.map(q => q.id).join(', ')}`);

        // 2. Mock some participants
        const participantAId = 1; // Assuming these exist or using fixed IDs if possible
        const participantBId = 2;

        console.log(`\nVerifying Assignment for Participant ${participantAId}...`);

        // Simulating the logic from participantRoutes.js
        async function getOrAssign(pId, eId) {
            let assignment = await prisma.questionAssignment.findUnique({
                where: { participantId_examId: { participantId: pId, examId: eId } }
            });

            if (!assignment) {
                const availableQuestions = await prisma.question.findMany({
                    where: { examId: eId },
                    select: { id: true }
                });
                const randomIndex = Math.floor(Math.random() * availableQuestions.length);
                const assignedQuestionId = availableQuestions[randomIndex].id;
                assignment = await prisma.questionAssignment.create({
                    data: { participantId: pId, examId: eId, questionId: assignedQuestionId }
                });
                console.log(`   [NEW] Assigned Question ${assignedQuestionId} to Participant ${pId}`);
            } else {
                console.log(`   [EXISTING] Participant ${pId} already has Question ${assignment.questionId}`);
            }
            return assignment;
        }

        const assignA1 = await getOrAssign(participantAId, exam.id);
        const assignA2 = await getOrAssign(participantAId, exam.id);

        if (assignA1.questionId === assignA2.questionId) {
            console.log('✅ Persistence Check Passed: Same question returned on second call.');
        } else {
            console.log('❌ Persistence Check Failed: Different question returned!');
        }

        console.log(`\nVerifying Assignment for Participant ${participantBId}...`);
        const assignB = await getOrAssign(participantBId, exam.id);

        console.log(`\nParticipant A: ${assignA1.questionId}`);
        console.log(`Participant B: ${assignB.questionId}`);

        if (exam.questions.length > 1 && assignA1.questionId !== assignB.questionId) {
            console.log('ℹ️ Randomness Check: Participants got different questions (as expected with multiple questions).');
        } else if (exam.questions.length > 1) {
            console.log('ℹ️ Randomness Check: Participants got the same question (possible by chance).');
        }

        console.log('\n--- Verification Complete ---');
    } catch (error) {
        console.error('Verification Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyRandomAssignment();
