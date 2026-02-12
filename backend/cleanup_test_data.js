const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    try {
        console.log('--- Cleaning up Test Data ---');

        // Titles to remove (noise from testing)
        const titlesToClear = [
            'Level 1: Beginner',
            'Level 2: Intermediate',
            'Level 3: Hard',
            'Level 4: Expert'
        ];

        const deletedSubmissions = await prisma.submission.deleteMany({
            where: {
                question: {
                    exam: {
                        title: { in: titlesToClear }
                    }
                }
            }
        });
        console.log(`Deleted ${deletedSubmissions.count} submissions`);

        const deletedQuestions = await prisma.question.deleteMany({
            where: {
                exam: {
                    title: { in: titlesToClear }
                }
            }
        });
        console.log(`Deleted ${deletedQuestions.count} questions`);

        const deletedExams = await prisma.exam.deleteMany({
            where: {
                title: { in: titlesToClear }
            }
        });
        console.log(`Deleted ${deletedExams.count} exams`);

        console.log('--- Cleanup Complete ---');
    } catch (error) {
        console.error('Cleanup Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
