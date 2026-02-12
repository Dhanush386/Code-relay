const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
    try {
        console.log('--- Starting Grouped Exams Test ---');

        // 1. Setup Organizer
        const organizer = await prisma.organizer.upsert({
            where: { email: 'test_org@example.com' },
            update: {},
            create: {
                name: 'Test Organizer',
                email: 'test_org@example.com',
                password: 'password123'
            }
        });
        console.log('Organizer created:', organizer.id);

        // 2. Clear existing data to avoid conflicts
        await prisma.submission.deleteMany({});
        await prisma.testcase.deleteMany({});
        await prisma.question.deleteMany({});
        await prisma.participant.deleteMany({});
        await prisma.exam.deleteMany({});


        // 3. Create Exams for Level 1 (Beginner) - 2 codes
        const l1a = await prisma.exam.create({
            data: {
                title: 'Level 1: Beginner',
                code: 'L1-CODE-A',
                sequence: 1,
                organizerId: organizer.id
            }
        });
        const l1b = await prisma.exam.create({
            data: {
                title: 'Level 1: Beginner',
                code: 'L1-CODE-B',
                sequence: 1,
                organizerId: organizer.id
            }
        });
        console.log('Level 1 exams created:', l1a.code, l1b.code);

        // 4. Create Exam for Level 2 (Intermediate)
        const l2 = await prisma.exam.create({
            data: {
                title: 'Level 2: Intermediate',
                code: 'L2-CODE',
                sequence: 2,
                organizerId: organizer.id
            }
        });
        console.log('Level 2 exam created:', l2.code);

        // 5. Setup Participant
        const participant = await prisma.participant.upsert({
            where: { participantId: 'TEST-PARTICIPANT' },
            update: { exams: { set: [] } }, // Clear joined exams
            create: {
                participantId: 'TEST-PARTICIPANT',
                collegeName: 'Test College'
            }
        });

        console.log('Participant setup:', participant.participantId);

        // --- Testing Logic ---

        // A. Verify Grouping (Simulate logic from GET /exams)
        const allExams = await prisma.exam.findMany({
            orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }]
        });
        const grouped = [];
        allExams.forEach(e => {
            if (!grouped.some(g => g.title === e.title)) {
                grouped.push({ title: e.title, sequence: e.sequence });
            }
        });
        console.log('Grouped Titles:', grouped.map(g => g.title));
        if (grouped.length === 2) {
            console.log('✅ PASS: Grouping logic works (2 unique titles found for 3 exams)');
        } else {
            console.log('❌ FAIL: Grouping logic failed. Found:', grouped.length);
        }

        // B. Verify Joining by Code
        // Participant joins Level 1 using code A
        await prisma.participant.update({
            where: { id: participant.id },
            data: { exams: { connect: { id: l1a.id } } }
        });
        console.log('Joined L1-CODE-A');

        // Check if level is "joined"
        const pJoined = await prisma.participant.findUnique({
            where: { id: participant.id },
            include: { exams: true }
        });
        const joinedLevel1 = pJoined.exams.some(e => e.title === 'Level 1: Beginner');
        if (joinedLevel1) {
            console.log('✅ PASS: Participant successfully joined Level 1 via specific code');
        } else {
            console.log('❌ FAIL: Participant joining failed');
        }

        // C. Verify Level 2 Lock (Simulate logic from isLevelUnlocked)
        async function checkLevelUnlocked(pid, title) {
            const levels = grouped; // Grouped by title
            const targetLevelIndex = levels.findIndex(l => l.title === title);
            if (targetLevelIndex === -1) return false;
            if (targetLevelIndex === 0) return true;

            const participant = await prisma.participant.findUnique({
                where: { id: pid },
                include: { exams: true }
            });

            // Check all previous levels
            for (let i = 0; i < targetLevelIndex; i++) {
                const prevLevelTitle = levels[i].title;
                const examsInPrevLevel = allExams.filter(e => e.title === prevLevelTitle);
                const joinedExamInPrevLevel = participant.exams.find(e => e.title === prevLevelTitle);

                if (!joinedExamInPrevLevel) {
                    const anyTimedOut = examsInPrevLevel.some(e => e.endTime && new Date().getTime() > new Date(e.endTime).getTime());
                    if (!anyTimedOut) return false;
                    continue;
                }

                const prevQuestions = await prisma.question.findMany({
                    where: { examId: joinedExamInPrevLevel.id },
                    select: { id: true }
                });

                const prevSubmissions = await prisma.submission.findMany({
                    where: {
                        participantId: pid,
                        questionId: { in: prevQuestions.map(q => q.id) },
                        status: 'COMPLETED'
                    },
                    distinct: ['questionId']
                });

                const completed = prevSubmissions.length === prevQuestions.length;
                let timedOut = false;
                if (joinedExamInPrevLevel.endTime) {
                    timedOut = new Date().getTime() > new Date(joinedExamInPrevLevel.endTime).getTime();
                }

                if (!completed && !timedOut && prevQuestions.length > 0) {
                    return false;
                }
            }
            return true;
        }

        const l2Unlocked = await checkLevelUnlocked(participant.id, 'Level 2: Intermediate');
        if (!l2Unlocked) {
            console.log('✅ PASS: Level 2 correctly remains locked because Level 1 is not completed');
        } else {
            console.log('❌ FAIL: Level 2 should be locked');
        }

        // --- NEW TEST: Permissive Unlocking after Timeout ---
        console.log('--- Testing Permissive Unlocking after Timeout ---');
        // Create a new level 3 that is already timed out
        const pastDate = new Date();
        pastDate.setMinutes(pastDate.getMinutes() - 10);

        const l3_timedout = await prisma.exam.create({
            data: {
                code: 'L3-CODE-OLD',
                title: 'Level 3: Hard',
                sequence: 3,
                organizerId: organizer.id,
                endTime: pastDate
            }
        });

        // Add Level 3 to grouped list for our local helper
        grouped.push({ title: 'Level 3: Hard', sequence: 3 });
        allExams.push(l3_timedout);

        // Create Level 4
        await prisma.exam.create({
            data: {
                code: 'L4-CODE',
                title: 'Level 4: Expert',
                sequence: 4,
                organizerId: organizer.id
            }
        });
        grouped.push({ title: 'Level 4: Expert', sequence: 4 });

        const l4Unlocked = await checkLevelUnlocked(participant.id, 'Level 4: Expert');
        if (l4Unlocked) {
            console.log('✅ PASS: Level 4 correctly unlocked because Level 3 timed out (even though not joined)');
        } else {
            console.log('❌ FAIL: Level 4 should be unlocked due to Level 3 timeout');
        }

        console.log('--- Test Completed Successfully ---');

    } catch (error) {
        console.error('Test Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}


runTest();
