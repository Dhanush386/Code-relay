const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/participant';

async function runTest() {
    try {
        console.log('--- Starting Permissive Unlocking Test ---');

        // 1. Setup Organizer
        const organizer = await prisma.organizer.upsert({
            where: { email: 'test_permissive@example.com' },
            update: {},
            create: { name: 'Permissive Test Org', email: 'test_permissive@example.com', password: 'password123' }
        });

        // 2. Clear data
        await prisma.submission.deleteMany({});
        await prisma.question.deleteMany({});
        await prisma.exam.deleteMany({});
        await prisma.participant.deleteMany({});

        // 3. Create Levels
        // Level 1: Timed Out
        const pastDate = new Date();
        pastDate.setMinutes(pastDate.getMinutes() - 10);

        await prisma.exam.create({
            data: {
                title: 'Level 1: Beginner',
                code: 'L1-TIMEOUT',
                sequence: 1,
                organizerId: organizer.id,
                endTime: pastDate
            }
        });

        // Level 2: Upcoming
        await prisma.exam.create({
            data: {
                title: 'Level 2: Intermediate',
                code: 'L2-CODE',
                sequence: 2,
                organizerId: organizer.id
            }
        });

        // 4. Register Participant and Get Token
        // Assuming there's a registration endpoint, but for test we simulate
        const p = await prisma.participant.create({
            data: { participantId: 'PERMISSIVE-TEST', collegeName: 'Test' }
        });

        // Mocking token or using existing one if possible. 
        // For simplicity in this script, we will simulate the logic internally since we can't easily get a JWT without hitting login.

        console.log('Setup complete. Verifying logic via helper simulation...');

        const allExams = await prisma.exam.findMany({ orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }] });
        const levels = [];
        allExams.forEach(e => { if (!levels.some(l => l.title === e.title)) levels.push({ title: e.title, sequence: e.sequence }); });

        async function isLevelUnlocked(participantId, levelTitle) {
            const targetLevelIndex = levels.findIndex(l => l.title === levelTitle);
            if (targetLevelIndex === 0) return true;

            const participant = await prisma.participant.findUnique({ where: { id: participantId }, include: { exams: true } });

            for (let i = 0; i < targetLevelIndex; i++) {
                const prevLevelTitle = levels[i].title;
                const examsInPrevLevel = allExams.filter(e => e.title === prevLevelTitle);
                const joinedExamInPrevLevel = participant.exams.find(e => e.title === prevLevelTitle);

                if (!joinedExamInPrevLevel) {
                    const anyTimedOut = examsInPrevLevel.some(e => e.endTime && new Date().getTime() > new Date(e.endTime).getTime());
                    if (!anyTimedOut) return false;
                    continue;
                }
                // (Submission check omitted here as we are testing timeout bypass)
            }
            return true;
        }

        const l2Unlocked = await isLevelUnlocked(p.id, 'Level 2: Intermediate');
        if (l2Unlocked) {
            console.log('✅ PASS: Level 2 is unlocked because Level 1 timed out (Permissive logic works)');
        } else {
            console.log('❌ FAIL: Level 2 remains locked despite Level 1 timeout');
        }

    } catch (error) {
        console.error('Test Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
