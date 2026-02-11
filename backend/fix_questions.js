const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const result = await prisma.question.updateMany({
            where: { examId: null },
            data: { examId: 1 }
        });
        console.log('Updated questions count:', result.count);

        // Also verify
        const questions = await prisma.question.findMany({
            where: { examId: 1 }
        });
        console.log('Questions now linked to exam 1:', questions.length);
    } catch (error) {
        console.error('Error updating questions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
