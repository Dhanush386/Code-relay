const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { authenticateParticipant } = require('../middleware/authMiddleware');
const codeExecutor = require('../services/codeExecutor');

const prisma = new PrismaClient();
const crypto = require('crypto');

// Register participant (Global One-Time)
router.post('/register', async (req, res) => {
    try {
        const { participantId, collegeName } = req.body;
        const normalizedParticipantId = participantId?.trim();

        if (!normalizedParticipantId) {
            return res.status(400).json({ error: 'Team Name is required' });
        }

        // Check if team name is already taken globally
        const existing = await prisma.participant.findUnique({
            where: { participantId: normalizedParticipantId }
        });

        if (existing) {
            return res.status(400).json({ error: 'Team name already registered. Please choose a different name.' });
        }

        // Create participant globally
        const participant = await prisma.participant.create({
            data: {
                participantId: normalizedParticipantId,
                collegeName: collegeName?.trim() || null
            }
        });

        // Get the first exam (Level 1) to return in response
        const firstExam = await prisma.exam.findFirst({
            orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }]
        });

        const token = jwt.sign(
            { participantId: participant.id, examId: firstExam?.id || null },
            config.jwt.participantSecret,
            { expiresIn: config.jwt.expiresIn }
        );

        res.status(201).json({
            message: 'Participant registered successfully',
            token,
            participant: {
                id: participant.id,
                participantId: participant.participantId,
                collegeName: participant.collegeName,
                examId: firstExam?.id || null
            }
        });
    } catch (error) {
        console.error('Participant registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login participant (Global)
router.post('/login', async (req, res) => {
    try {
        const { participantId } = req.body;
        const normalizedParticipantId = participantId?.trim();

        if (!normalizedParticipantId) {
            return res.status(400).json({ error: 'Team Name is required' });
        }

        // Find participant globally
        const participant = await prisma.participant.findUnique({
            where: { participantId: normalizedParticipantId }
        });

        if (!participant) {
            return res.status(401).json({ error: 'Invalid credentials. Team name not found.' });
        }

        // Find their current/latest unlocked exam to start with
        const exams = await prisma.exam.findMany({
            orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }]
        });

        let activeExam = exams[0]; // Default to first level

        // Find the highest unlocked exam
        for (let i = 0; i < exams.length; i++) {
            const exam = exams[i];
            if (i === 0) {
                activeExam = exam;
                continue;
            }

            const prevExam = exams[i - 1];
            const prevQuestions = await prisma.question.findMany({
                where: { examId: prevExam.id },
                select: { id: true }
            });

            const prevSubmissions = await prisma.submission.findMany({
                where: {
                    participantId: participant.id,
                    questionId: { in: prevQuestions.map(q => q.id) },
                    score: { gt: 0 } // Or any logic for "completed"
                },
                distinct: ['questionId']
            });

            if (prevSubmissions.length === prevQuestions.length && prevQuestions.length > 0) {
                activeExam = exam;
            } else {
                break; // Level locked
            }
        }

        // Generate token (global but can include activeExamId for convenience)
        const token = jwt.sign(
            { participantId: participant.id, examId: activeExam?.id || null },
            config.jwt.participantSecret,
            { expiresIn: config.jwt.expiresIn }
        );

        res.json({
            message: 'Login successful',
            token,
            participant: {
                id: participant.id,
                participantId: participant.participantId,
                collegeName: participant.collegeName,
                activeExamId: activeExam?.id || null,
                activeExamTitle: activeExam?.title || null
            }
        });
    } catch (error) {
        console.error('Participant login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Join an exam by verifying the exam code
// Join an exam by verifying the exam code
router.post('/join-exam', authenticateParticipant, async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Exam code is required' });
        }

        // Find the exam globally by code
        const exam = await prisma.exam.findFirst({
            where: { code: { equals: code.trim(), mode: 'insensitive' } }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Invalid exam code' });
        }

        // Security: Check if level is unlocked
        const unlocked = await isLevelUnlocked(req.participantId, exam.title);
        if (!unlocked) {
            return res.status(403).json({ error: 'This level is locked. Complete previous levels first.' });
        }

        // Check if already joined ANY exam with this same title (level)
        const participantJoined = await prisma.participant.findUnique({
            where: { id: req.participantId },
            include: { exams: { where: { title: exam.title } } }
        });

        if (participantJoined.exams.length > 0) {
            if (participantJoined.exams[0].id === exam.id) {
                return res.json({ message: 'Already joined this exam', joined: true, examId: exam.id });
            } else {
                return res.status(400).json({ error: 'You have already joined a different exam for this level.' });
            }
        }

        // Add participant to exam
        await prisma.participant.update({
            where: { id: req.participantId },
            data: {
                exams: {
                    connect: { id: exam.id }
                }
            }
        });

        res.json({ message: 'Successfully joined exam', joined: true, examId: exam.id });
    } catch (error) {
        console.error('Join exam error:', error);
        res.status(500).json({ error: 'Failed to join exam' });
    }
});


// Get all levels (exams) and their status for the current participant
router.get('/exams', authenticateParticipant, async (req, res) => {
    try {
        // Get participant with their joined exams
        let participant = await prisma.participant.findUnique({
            where: { id: req.participantId },
            include: { exams: { select: { id: true } } }
        });

        const allExams = await prisma.exam.findMany({
            orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
            select: {
                id: true,
                code: true,
                title: true,
                description: true,
                sequence: true,
                startTime: true,
                endTime: true
            }
        });

        const joinedExamIds = new Set(participant.exams.map(e => e.id));

        // Group exams by title (Levels)
        const groupedExams = [];
        allExams.forEach(exam => {
            let group = groupedExams.find(g => g.title === exam.title);
            if (!group) {
                group = {
                    title: exam.title,
                    sequence: exam.sequence,
                    exams: []
                };
                groupedExams.push(group);
            }
            group.exams.push(exam);
        });

        const examStatus = [];
        let previousLevelUnlocked = true;
        const now = new Date();

        for (let i = 0; i < groupedExams.length; i++) {
            const group = groupedExams[i];

            // Check if ANY exam in this group is joined
            const joinedExam = group.exams.find(e => joinedExamIds.has(e.id));
            const joined = !!joinedExam;

            let unlocked = false;
            let completed = false;
            let isLive = false;
            let currentExam = joinedExam || group.exams[0]; // Logic base for status if not joined

            // 1. Check if Level is Unlocked
            if (i === 0) {
                unlocked = true;
            } else if (previousLevelUnlocked) {
                const prevLevel = groupedExams[i - 1];
                const prevJoinedExam = prevLevel.exams.find(e => joinedExamIds.has(e.id));

                if (prevJoinedExam) {
                    const prevQuestions = await prisma.question.findMany({
                        where: { examId: prevJoinedExam.id },
                        select: { id: true }
                    });

                    if (prevQuestions.length > 0) {
                        const prevSubmissions = await prisma.submission.findMany({
                            where: {
                                participantId: req.participantId,
                                questionId: { in: prevQuestions.map(q => q.id) },
                                status: 'COMPLETED'
                            },
                            distinct: ['questionId']
                        });

                        const prevCompleted = prevSubmissions.length === prevQuestions.length;
                        let timedOut = false;
                        if (prevJoinedExam.endTime) {
                            timedOut = now.getTime() > new Date(prevJoinedExam.endTime).getTime();
                        }
                        unlocked = prevCompleted || timedOut;
                    } else {
                        unlocked = true; // No questions = automatic unlock next
                    }
                } else {
                    // NEW: Unlock if ANY exam in the previous level has timed out, even if not joined
                    const anyPrevTimedOut = prevLevel.exams.some(e => {
                        return e.endTime && now.getTime() > new Date(e.endTime).getTime();
                    });
                    unlocked = anyPrevTimedOut;
                }

            }

            // 2. Check Completion for THIS Level
            if (joinedExam) {
                const currentQuestions = await prisma.question.findMany({
                    where: { examId: joinedExam.id },
                    select: { id: true }
                });
                if (currentQuestions.length > 0) {
                    const currentSubmissions = await prisma.submission.findMany({
                        where: {
                            participantId: req.participantId,
                            questionId: { in: currentQuestions.map(q => q.id) },
                            status: 'COMPLETED'
                        },
                        distinct: ['questionId']
                    });
                    completed = currentSubmissions.length === currentQuestions.length;
                } else {
                    completed = true;
                }
            }

            // 3. Check if Live
            const targetExam = joinedExam || group.exams[0];
            if (targetExam.startTime || targetExam.endTime) {
                const start = targetExam.startTime ? new Date(targetExam.startTime) : null;
                const end = targetExam.endTime ? new Date(targetExam.endTime) : null;
                const nowTime = now.getTime();

                if (start && end) {
                    isLive = nowTime >= start.getTime() && nowTime <= end.getTime();
                } else if (start) {
                    isLive = nowTime >= start.getTime();
                } else if (end) {
                    isLive = nowTime <= end.getTime();
                }
            } else {
                isLive = true;
            }

            previousLevelUnlocked = unlocked;

            examStatus.push({
                id: targetExam.id, // Current joined ID or fallback
                title: group.title,
                description: targetExam.description,
                unlocked,
                joined,
                needsCode: !joined,
                completed,
                isLive,
                startTime: targetExam.startTime,
                endTime: targetExam.endTime,
                sequence: group.sequence
            });
        }

        res.json({ exams: examStatus });
    } catch (error) {
        console.error('Fetch exams error:', error);
        res.status(500).json({ error: 'Failed to fetch levels' });
    }
});


// Helper to check if a level (by title) is unlocked for a participant
async function isLevelUnlocked(participantId, levelTitle) {
    const allExams = await prisma.exam.findMany({
        orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, title: true, sequence: true, endTime: true }
    });

    // Grouping by title to find level sequence
    const levels = [];
    allExams.forEach(exam => {
        if (!levels.some(l => l.title === exam.title)) {
            levels.push({ title: exam.title, sequence: exam.sequence });
        }
    });

    const targetLevelIndex = levels.findIndex(l => l.title === levelTitle);
    if (targetLevelIndex === -1) return false;
    if (targetLevelIndex === 0) return true; // First level always unlocked

    const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: { exams: true }
    });

    // Check all previous levels
    for (let i = 0; i < targetLevelIndex; i++) {
        const prevLevelTitle = levels[i].title;
        const examsInPrevLevel = allExams.filter(e => e.title === prevLevelTitle);
        const joinedExamInPrevLevel = participant.exams.find(e => e.title === prevLevelTitle);

        if (!joinedExamInPrevLevel) {
            // Check if ANY exam in that level has timed out
            const anyTimedOut = examsInPrevLevel.some(e => e.endTime && new Date().getTime() > new Date(e.endTime).getTime());
            if (!anyTimedOut) return false; // Not joined AND not timed out = Locked
            continue; // Moving to next level check because this one timed out
        }

        const prevQuestions = await prisma.question.findMany({
            where: { examId: joinedExamInPrevLevel.id },
            select: { id: true }
        });

        const prevSubmissions = await prisma.submission.findMany({
            where: {
                participantId: participantId,
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


// Updated helper to check if an exam is unlocked (wrapper for isLevelUnlocked)
async function isExamUnlocked(participantId, examId) {
    const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { title: true } });
    if (!exam) return false;
    return isLevelUnlocked(participantId, exam.title);
}

// Get questions for exam (WITHOUT hidden testcases)
router.get('/questions', authenticateParticipant, async (req, res) => {
    try {
        const examId = parseInt(req.query.examId) || req.examId;

        if (!examId) {
            return res.status(400).json({ error: 'Exam ID is required' });
        }

        // Security: Check if exam is unlocked
        const unlocked = await isExamUnlocked(req.participantId, examId);
        if (!unlocked) {
            return res.status(403).json({ error: 'This level is locked. Complete previous levels first.' });
        }

        const participant = await prisma.participant.findUnique({
            where: { id: req.participantId },
            include: { exams: { where: { id: examId } } }
        });

        // Allow access ONLY if explicitly joined with code
        if (!participant.exams.some(e => e.id === examId)) {
            return res.status(403).json({ error: 'Please enter the exam code to access this level.' });
        }

        // --- NEW: Deterministic Shuffling of ALL Questions ---
        // Fetch all questions for this exam
        const questions = await prisma.question.findMany({
            where: { examId },
            select: {
                id: true,
                title: true,
                description: true,
                inputFormat: true,
                outputFormat: true,
                constraints: true,
                timeLimit: true,
                memoryLimit: true,
                allowedLanguages: true,
                starterCodes: true,
                testcases: {
                    where: { visibility: 'VISIBLE' }, // ONLY visible testcases
                    select: {
                        id: true,
                        input: true,
                        expectedOutput: true
                    }
                },
                submissions: {
                    where: { participantId: req.participantId },
                    orderBy: { createdAt: 'desc' },
                    select: {
                        code: true,
                        language: true,
                        createdAt: true,
                        score: true,
                        status: true
                    }
                }
            }
        });

        if (questions.length === 0) {
            return res.status(404).json({ error: 'No questions available for this level.' });
        }

        // Shuffle questions deterministically based on participant and exam
        const seedStr = `${req.participantId}-${examId}`;

        // Simple seeded random number generator (Mulberry32 inspired)
        const seededRandom = (s) => {
            let h = 0xdeadbeef;
            for (let i = 0; i < s.length; i++) {
                h = Math.imul(h ^ s.charCodeAt(i), 0x517cc1b7);
            }
            return () => {
                h = Math.imul(h ^ (h >>> 16), 0x22468225);
                h = Math.imul(h ^ (h >>> 13), 0x3266489a);
                return ((h ^= h >>> 16) >>> 0) / 4294967296;
            };
        };

        const rng = seededRandom(seedStr);
        const finalShuffled = [...questions];
        for (let i = finalShuffled.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [finalShuffled[i], finalShuffled[j]] = [finalShuffled[j], finalShuffled[i]];
        }

        res.json({ questions: finalShuffled });
    } catch (error) {
        console.error('Fetch questions error:', error);
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
});

// Get single question (WITHOUT hidden testcases)
router.get('/questions/:id', authenticateParticipant, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);

        const question = await prisma.question.findUnique({
            where: { id: questionId },
            select: {
                id: true,
                examId: true,
                title: true,
                description: true,
                inputFormat: true,
                outputFormat: true,
                constraints: true,
                timeLimit: true,
                memoryLimit: true,
                allowedLanguages: true,
                starterCodes: true,
                testcases: {
                    where: { visibility: 'VISIBLE' },
                    select: { id: true, input: true, expectedOutput: true }
                },
                submissions: {
                    where: { participantId: req.participantId },
                    orderBy: { createdAt: 'desc' },
                    select: { code: true, language: true, createdAt: true, score: true, status: true }
                }
            }
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Security: Check if exam is unlocked
        const unlocked = await isExamUnlocked(req.participantId, question.examId);
        if (!unlocked) {
            return res.status(403).json({ error: 'This level is locked.' });
        }

        // Security: Check if this specific level is joined
        const participant = await prisma.participant.findUnique({
            where: { id: req.participantId },
            include: { exams: { select: { id: true } } }
        });

        if (!participant.exams.some(e => e.id === question.examId)) {
            return res.status(403).json({ error: 'Please enter the exam code to access this level.' });
        }

        res.json({ question });
    } catch (error) {
        console.error('Fetch question error:', error);
        res.status(500).json({ error: 'Failed to fetch question' });
    }
});

// Run code (ONLY against visible testcases)
router.post('/run', authenticateParticipant, async (req, res) => {
    try {
        const { questionId, language, code, customInput } = req.body;

        if (!questionId || !language || !code) {
            return res.status(400).json({ error: 'Question ID, language, and code are required' });
        }

        // Get question with ALL testcases to check for custom input match
        const question = await prisma.question.findUnique({
            where: { id: questionId },
            include: { testcases: true }
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Security: Check if exam is unlocked
        const unlocked = await isExamUnlocked(req.participantId, question.examId);
        if (!unlocked) {
            return res.status(403).json({ error: 'Level locked' });
        }

        // Security: Check if this specific level is joined
        const participant = await prisma.participant.findUnique({
            where: { id: req.participantId },
            include: { exams: { select: { id: true } } }
        });

        if (!participant.exams.some(e => e.id === question.examId)) {
            return res.status(403).json({ error: 'Please enter the exam code to access this level.' });
        }

        let testcasesToRun = [];

        if (customInput !== undefined && customInput !== null) {
            // Check if custom input matches any existing testcase (visible or hidden)
            // Normalize inputs by trimming
            const normalizedCustomInput = customInput.trim();
            const matchingTestcase = question.testcases.find(tc => tc.input.trim() === normalizedCustomInput);

            // Use matching testcase's output if found, otherwise use user-provided or empty
            const expectedOutput = matchingTestcase
                ? matchingTestcase.expectedOutput
                : (req.body.customExpectedOutput || '');

            // Run against custom input
            testcasesToRun = [{
                id: 'custom',
                input: customInput,
                expectedOutput: expectedOutput
            }];
        } else {
            // Filter to only VISIBLE testcases for default run
            const visibleTestcases = question.testcases.filter(tc => tc.visibility === 'VISIBLE');

            if (visibleTestcases.length === 0) {
                return res.status(400).json({ error: 'No visible testcases available' });
            }
            testcasesToRun = visibleTestcases;
        }

        // Run code
        const results = await codeExecutor.runTestcases(
            code,
            language,
            testcasesToRun,
            question.timeLimit ? question.timeLimit * 1000 : 5000,
            question.memoryLimit ? `${question.memoryLimit}m` : '256m'
        );

        // Send back results for visible testcases
        const response = results.map(r => ({
            testcaseId: r.testcaseId,
            passed: r.passed,
            input: r.input,
            expectedOutput: r.expectedOutput,
            actualOutput: r.actualOutput,
            error: r.error,
            executionTime: r.executionTime
        }));

        res.json({ results: response });
    } catch (error) {
        console.error('Run code error:', error);
        res.status(500).json({ error: 'Failed to run code' });
    }
});

// Submit code (runs against ALL testcases, but only returns score)
router.post('/submit', authenticateParticipant, async (req, res) => {
    try {
        const { questionId, language, code } = req.body;

        if (!questionId || !language || !code) {
            return res.status(400).json({ error: 'Question ID, language, and code are required' });
        }

        // Get question with ALL testcases
        const question = await prisma.question.findUnique({
            where: { id: questionId },
            include: { testcases: true }
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Security: Check if exam is unlocked
        const unlocked = await isExamUnlocked(req.participantId, question.examId);
        if (!unlocked) {
            return res.status(403).json({ error: 'Level locked' });
        }

        // Security: Check if this specific level is joined
        const participant = await prisma.participant.findUnique({
            where: { id: req.participantId },
            include: { exams: { select: { id: true } } }
        });

        if (!participant.exams.some(e => e.id === question.examId)) {
            return res.status(403).json({ error: 'Please enter the exam code to access this level.' });
        }

        if (question.testcases.length === 0) {
            return res.status(400).json({ error: 'No testcases available' });
        }

        // Run code against ALL testcases
        const results = await codeExecutor.runTestcases(
            code,
            language,
            question.testcases,
            question.timeLimit * 1000,
            `${question.memoryLimit}m`
        );

        // Calculate score based on maxMarks
        const totalTests = results.length;
        const passedTests = results.filter(r => r.passed).length;
        const scorePercentage = passedTests / totalTests;
        const score = scorePercentage * question.maxMarks;

        // Calculate average execution time
        const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalTests;

        // Save submission
        const submission = await prisma.submission.create({
            data: {
                participantId: req.participantId,
                questionId,
                language,
                code,
                score,
                totalTests,
                passedTests,
                status: 'COMPLETED',
                executionTime: avgExecutionTime
            }
        });

        // Return submission status, score AND visible testcase results
        const visibleTestcaseResults = results
            .filter(r => {
                const tc = question.testcases.find(t => t.id === r.testcaseId);
                return tc && tc.visibility === 'VISIBLE';
            })
            .map(r => ({
                testcaseId: r.testcaseId,
                passed: r.passed,
                input: r.input,
                expectedOutput: r.expectedOutput,
                actualOutput: r.actualOutput,
                error: r.error,
                executionTime: r.executionTime
            }));

        res.json({
            message: 'Code submitted successfully',
            submission: {
                id: submission.id,
                score: submission.score,
                totalTests: submission.totalTests,
                passedTests: submission.passedTests,
                status: submission.status,
                executionTime: submission.executionTime,
                createdAt: submission.createdAt,
                testcaseResults: visibleTestcaseResults
            }
        });
    } catch (error) {
        console.error('Submit code error:', error);
        res.status(500).json({ error: 'Failed to submit code' });
    }
});

// Get participant's own submissions
router.get('/submissions', authenticateParticipant, async (req, res) => {
    try {
        const submissions = await prisma.submission.findMany({
            where: { participantId: req.participantId },
            include: {
                question: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ submissions });
    } catch (error) {
        console.error('Fetch submissions error:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

module.exports = router;
