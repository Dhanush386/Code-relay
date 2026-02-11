const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { authenticateOrganizer } = require('../middleware/authMiddleware');
const codeExecutor = require('../services/codeExecutor');

const prisma = new PrismaClient();

// Register organizer
// TEMPORARY: Setup route to create initial admin account
router.post('/setup', async (req, res) => {
    try {
        const email = 'organizer@codeexam.com';
        const password = 'password123';
        const name = 'Admin Organizer';

        // Check if organizer already exists
        const existing = await prisma.organizer.findUnique({ where: { email } });
        if (existing) {
            return res.json({
                message: 'Admin account already exists',
                credentials: { email, password: '(already set)' }
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create organizer
        const organizer = await prisma.organizer.create({
            data: {
                email,
                password: hashedPassword,
                name
            }
        });

        res.status(201).json({
            message: 'Admin organizer created successfully',
            credentials: { email, password }
        });
    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({ error: 'Setup failed' });
    }
});

// Register organizer
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if organizer already exists
        const existing = await prisma.organizer.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Organizer already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create organizer
        const organizer = await prisma.organizer.create({
            data: {
                email,
                password: hashedPassword,
                name: name || null
            }
        });

        res.status(201).json({
            message: 'Organizer registered successfully',
            organizer: { id: organizer.id, email: organizer.email, name: organizer.name }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login organizer
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find organizer
        const organizer = await prisma.organizer.findUnique({ where: { email } });
        if (!organizer) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, organizer.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { organizerId: organizer.id },
            config.jwt.organizerSecret,
            { expiresIn: config.jwt.expiresIn }
        );

        res.json({
            message: 'Login successful',
            token,
            organizer: { id: organizer.id, email: organizer.email, name: organizer.name }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Create exam
router.post('/exams', authenticateOrganizer, async (req, res) => {
    try {
        const { code, title, description, startTime, endTime } = req.body;

        if (!code || !title) {
            return res.status(400).json({ error: 'Code and title are required' });
        }

        const exam = await prisma.exam.create({
            data: {
                code,
                title,
                description: description || null,
                startTime: startTime ? new Date(startTime) : null,
                endTime: endTime ? new Date(endTime) : null,
                organizerId: req.organizerId
            }
        });

        res.status(201).json({ message: 'Exam created successfully', exam });
    } catch (error) {
        console.error('Exam creation error:', error);
        res.status(500).json({ error: 'Failed to create exam' });
    }
});

router.get('/exams', authenticateOrganizer, async (req, res) => {
    try {
        const exams = await prisma.exam.findMany({
            where: { organizerId: req.organizerId },
            include: {
                participants: true,
                questions: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const examData = [];
        for (const exam of exams) {
            const questionIds = exam.questions.map(q => q.id);
            let completedCount = 0;

            if (questionIds.length > 0) {
                const submissions = await prisma.submission.findMany({
                    where: {
                        questionId: { in: questionIds },
                        status: 'COMPLETED'
                    },
                    select: { participantId: true, questionId: true },
                    distinct: ['participantId', 'questionId']
                });

                const participantCounts = {};
                submissions.forEach(s => {
                    participantCounts[s.participantId] = (participantCounts[s.participantId] || 0) + 1;
                });

                completedCount = Object.values(participantCounts).filter(count => count === questionIds.length).length;
            }

            examData.push({ ...exam, completedCount });
        }

        res.json({ exams: examData });
    } catch (error) {
        console.error('Fetch exams error:', error);
        res.status(500).json({ error: 'Failed to fetch exams' });
    }
});

// Update exam
router.put('/exams/:id', authenticateOrganizer, async (req, res) => {
    try {
        const examId = parseInt(req.params.id);
        const { code, title, description, startTime, endTime } = req.body;

        // Verify ownership
        const existing = await prisma.exam.findFirst({
            where: { id: examId, organizerId: req.organizerId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // Update exam
        const exam = await prisma.exam.update({
            where: { id: examId },
            data: {
                code,
                title,
                description,
                startTime: startTime ? new Date(startTime) : null,
                endTime: endTime ? new Date(endTime) : null
            }
        });

        res.json({ message: 'Exam updated successfully', exam });
    } catch (error) {
        console.error('Update exam error:', error);
        res.status(500).json({ error: 'Failed to update exam' });
    }
});

// Delete exam
router.delete('/exams/:id', authenticateOrganizer, async (req, res) => {
    try {
        const examId = parseInt(req.params.id);

        // Verify ownership
        const existing = await prisma.exam.findFirst({
            where: { id: examId, organizerId: req.organizerId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        await prisma.exam.delete({ where: { id: examId } });

        res.json({ message: 'Exam deleted successfully' });
    } catch (error) {
        console.error('Delete exam error:', error);
        res.status(500).json({ error: 'Failed to delete exam' });
    }
});

// Create question
router.post('/questions', authenticateOrganizer, async (req, res) => {
    try {
        const {
            title,
            description,
            inputFormat,
            outputFormat,
            constraints,
            timeLimit,
            memoryLimit,
            allowedLanguages,
            examId,
            maxMarks,
            solution,
            solutionLanguage
        } = req.body;

        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        const question = await prisma.question.create({
            data: {
                title,
                description,
                inputFormat: inputFormat || '',
                outputFormat: outputFormat || '',
                constraints: constraints || '',
                timeLimit: timeLimit || 5,
                memoryLimit: memoryLimit || 256,
                maxMarks: maxMarks || 100,
                allowedLanguages: allowedLanguages || 'C,C++,Python',
                solution: solution || null,
                solutionLanguage: solutionLanguage || 'Python',
                organizerId: req.organizerId,
                examId: examId || null
            }
        });

        res.status(201).json({ message: 'Question created successfully', question });
    } catch (error) {
        console.error('Question creation error:', error);
        res.status(500).json({ error: 'Failed to create question' });
    }
});

// Run solution code against test cases (for organizers)
router.post('/run-solution/:questionId', authenticateOrganizer, async (req, res) => {
    try {
        const questionId = parseInt(req.params.questionId);
        const { solution: bodySolution, solutionLanguage: bodyLanguage } = req.body;

        const question = await prisma.question.findFirst({
            where: {
                id: questionId,
                organizerId: req.organizerId
            },
            include: {
                testcases: true,
                solutionCodes: true
            }
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Determine which solution to use:
        // 1. Provided in request body
        // 2. Language-specific stored solution
        // 3. Question's default legacy solution
        let solutionCode = bodySolution;
        let solutionLang = bodyLanguage || question.solutionLanguage || 'Python';

        if (!solutionCode) {
            // Find stored solution for this language
            const storedSolution = question.solutionCodes.find(s => s.language === solutionLang);
            if (storedSolution) {
                solutionCode = storedSolution.code;
            } else if (question.solutionLanguage === solutionLang) {
                solutionCode = question.solution;
            }
        }

        if (!solutionCode) {
            return res.status(400).json({ error: 'No solution code provided' });
        }

        if (!question.testcases || question.testcases.length === 0) {
            return res.status(400).json({ error: 'No test cases found for this question. Please add test cases first.' });
        }

        console.log(`Running solution for question ${questionId}:`, {
            language: solutionLang,
            testcasesCount: question.testcases.length,
            timeLimit: question.timeLimit,
            memoryLimit: question.memoryLimit
        });

        // Run solution against all test cases
        const results = await codeExecutor.runTestcases(
            solutionCode,
            solutionLang,
            question.testcases,
            question.timeLimit,
            question.memoryLimit
        );

        res.json({ results });
    } catch (error) {
        console.error('Run solution error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: error.message || 'Failed to run solution' });
    }
});

// Get all questions
router.get('/questions', authenticateOrganizer, async (req, res) => {
    try {
        const questions = await prisma.question.findMany({
            where: { organizerId: req.organizerId },
            include: {
                starterCodes: true,
                solutionCodes: true,
                testcases: true,
                _count: {
                    select: { submissions: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ questions });
    } catch (error) {
        console.error('Fetch questions error:', error);
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
});

// Get single question
router.get('/questions/:id', authenticateOrganizer, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);

        const question = await prisma.question.findFirst({
            where: {
                id: questionId,
                organizerId: req.organizerId
            },
            include: {
                starterCodes: true,
                solutionCodes: true,
                testcases: true
            }
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        res.json({ question });
    } catch (error) {
        console.error('Fetch question error:', error);
        res.status(500).json({ error: 'Failed to fetch question' });
    }
});

// Update question
router.put('/questions/:id', authenticateOrganizer, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);
        const updateData = req.body;

        // Verify ownership
        const existing = await prisma.question.findFirst({
            where: { id: questionId, organizerId: req.organizerId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const question = await prisma.question.update({
            where: { id: questionId },
            data: updateData
        });

        res.json({ message: 'Question updated successfully', question });
    } catch (error) {
        console.error('Update question error:', error);
        res.status(500).json({ error: 'Failed to update question' });
    }
});

// Delete question
router.delete('/questions/:id', authenticateOrganizer, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);

        // Verify ownership
        const existing = await prisma.question.findFirst({
            where: { id: questionId, organizerId: req.organizerId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Question not found' });
        }

        await prisma.question.delete({ where: { id: questionId } });

        res.json({ message: 'Question deleted successfully' });
    } catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({ error: 'Failed to delete question' });
    }
});

// Add/Update solution code
router.post('/questions/:id/solution-code', authenticateOrganizer, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);
        const { language, code } = req.body;

        if (!language || !code) {
            return res.status(400).json({ error: 'Language and code are required' });
        }

        // Verify ownership
        const question = await prisma.question.findFirst({
            where: { id: questionId, organizerId: req.organizerId }
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Upsert solution code
        const solutionCode = await prisma.solutionCode.upsert({
            where: {
                questionId_language: {
                    questionId,
                    language
                }
            },
            update: { code },
            create: {
                questionId,
                language,
                code
            }
        });

        res.status(201).json({ message: 'Solution code saved successfully', solutionCode });
    } catch (error) {
        console.error('Solution code error:', error);
        res.status(500).json({ error: 'Failed to save solution code' });
    }
});

// Add/Update starter code
router.post('/questions/:id/starter-code', authenticateOrganizer, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);
        const { language, code } = req.body;

        if (!language || !code) {
            return res.status(400).json({ error: 'Language and code are required' });
        }

        // Verify ownership
        const question = await prisma.question.findFirst({
            where: { id: questionId, organizerId: req.organizerId }
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Upsert starter code
        const starterCode = await prisma.starterCode.upsert({
            where: {
                questionId_language: {
                    questionId,
                    language
                }
            },
            update: { code },
            create: {
                questionId,
                language,
                code
            }
        });

        res.status(201).json({ message: 'Starter code saved successfully', starterCode });
    } catch (error) {
        console.error('Starter code error:', error);
        res.status(500).json({ error: 'Failed to save starter code' });
    }
});

// Add testcase
router.post('/questions/:id/testcases', authenticateOrganizer, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);
        const { input, expectedOutput, visibility } = req.body;

        if (!input || !expectedOutput) {
            return res.status(400).json({ error: 'Input and expected output are required' });
        }

        // Verify ownership
        const question = await prisma.question.findFirst({
            where: { id: questionId, organizerId: req.organizerId }
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const testcase = await prisma.testcase.create({
            data: {
                questionId,
                input,
                expectedOutput,
                visibility: visibility || 'VISIBLE'
            }
        });

        res.status(201).json({ message: 'Testcase added successfully', testcase });
    } catch (error) {
        console.error('Testcase error:', error);
        res.status(500).json({ error: 'Failed to add testcase' });
    }
});

// Update testcase
router.put('/testcases/:id', authenticateOrganizer, async (req, res) => {
    try {
        const testcaseId = parseInt(req.params.id);
        const { input, expectedOutput, visibility } = req.body;

        // Verify ownership through question
        const testcase = await prisma.testcase.findUnique({
            where: { id: testcaseId },
            include: { question: true }
        });

        if (!testcase || testcase.question.organizerId !== req.organizerId) {
            return res.status(404).json({ error: 'Testcase not found' });
        }

        const updatedTestcase = await prisma.testcase.update({
            where: { id: testcaseId },
            data: {
                input,
                expectedOutput,
                visibility
            }
        });

        res.json({ message: 'Testcase updated successfully', testcase: updatedTestcase });
    } catch (error) {
        console.error('Update testcase error:', error);
        res.status(500).json({ error: 'Failed to update testcase' });
    }
});

// Delete testcase
router.delete('/testcases/:id', authenticateOrganizer, async (req, res) => {
    try {
        const testcaseId = parseInt(req.params.id);

        // Verify ownership through question
        const testcase = await prisma.testcase.findUnique({
            where: { id: testcaseId },
            include: { question: true }
        });

        if (!testcase || testcase.question.organizerId !== req.organizerId) {
            return res.status(404).json({ error: 'Testcase not found' });
        }

        await prisma.testcase.delete({ where: { id: testcaseId } });

        res.json({ message: 'Testcase deleted successfully' });
    } catch (error) {
        console.error('Delete testcase error:', error);
        res.status(500).json({ error: 'Failed to delete testcase' });
    }
});

// Get all submissions (with full details)
router.get('/submissions', authenticateOrganizer, async (req, res) => {
    try {
        const submissions = await prisma.submission.findMany({
            where: {
                question: {
                    organizerId: req.organizerId
                }
            },
            include: {
                participant: {
                    include: {
                        exams: {
                            select: { title: true, id: true }
                        }
                    }
                },
                question: {
                    select: {
                        title: true,
                        id: true,
                        maxMarks: true,
                        examId: true,
                        exam: {
                            select: { title: true }
                        }
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

// Delete submissions for a participant (allows re-entry)
router.delete('/submissions/:participantId/:examId', authenticateOrganizer, async (req, res) => {
    try {
        const participantId = parseInt(req.params.participantId);
        const examId = parseInt(req.params.examId);

        // Verify organizer owns this exam
        const exam = await prisma.exam.findFirst({
            where: {
                id: examId,
                organizerId: req.organizerId
            }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found or you do not have permission' });
        }

        // Get all question IDs for this exam
        const questions = await prisma.question.findMany({
            where: { examId: examId },
            select: { id: true }
        });

        const questionIds = questions.map(q => q.id);

        if (questionIds.length === 0) {
            return res.json({
                message: 'No questions found for this exam.',
                deletedCount: 0
            });
        }

        // Verify organizer password (must be provided in request body)
        const { password } = req.body || {}
        if (!password) {
            return res.status(400).json({ error: 'Organizer password is required to delete submissions' })
        }

        const organizer = await prisma.organizer.findUnique({ where: { id: req.organizerId } })
        const isValid = await bcrypt.compare(password, organizer.password)
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid organizer password' })
        }

        // Delete all submissions for this participant for these questions
        const result = await prisma.submission.deleteMany({
            where: {
                participantId: participantId,
                questionId: {
                    in: questionIds
                }
            }
        });

        res.json({
            message: 'Submissions deleted successfully. Participant can now retake the exam.',
            deletedCount: result.count
        });
    } catch (error) {
        console.error('Delete submissions error:', error);
        res.status(500).json({ error: 'Failed to delete submissions' });
    }
});

// Get leaderboard for an exam
router.get('/leaderboard/:examId', authenticateOrganizer, async (req, res) => {
    try {
        const examId = parseInt(req.params.examId);

        // Verify organizer owns this exam
        const exam = await prisma.exam.findFirst({
            where: { id: examId, organizerId: req.organizerId },
            include: {
                questions: {
                    select: { id: true, maxMarks: true }
                }
            }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found or permission denied' });
        }

        const participants = await prisma.participant.findMany({
            where: {
                submissions: {
                    some: {
                        question: { examId }
                    }
                }
            },
            include: {
                submissions: {
                    where: {
                        question: { examId }
                    },
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        questionId: true,
                        score: true,
                        passedTests: true,
                        totalTests: true,
                        executionTime: true,
                        createdAt: true
                    }
                }
            }
        });

        // Process participants to calculate leaderboard stats
        const leaderboard = participants.map(p => {
            // Group submissions by questionId and pick the latest one for each
            const latestSubmissionsByQuestion = {};
            p.submissions.forEach(sub => {
                if (!latestSubmissionsByQuestion[sub.questionId]) {
                    latestSubmissionsByQuestion[sub.questionId] = sub;
                }
            });

            const relevantSubmissions = Object.values(latestSubmissionsByQuestion);

            const totalScore = relevantSubmissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
            const totalPassedTests = relevantSubmissions.reduce((sum, sub) => sum + (sub.passedTests || 0), 0);
            const totalTests = relevantSubmissions.reduce((sum, sub) => sum + (sub.totalTests || 0), 0);
            const totalExecutionTime = relevantSubmissions.reduce((sum, sub) => sum + (sub.executionTime || 0), 0);
            const lastSubmissionTime = p.submissions.length > 0 ? p.submissions[0].createdAt : null;

            return {
                id: p.id,
                participantId: p.participantId,
                collegeName: p.collegeName,
                totalScore,
                totalPassedTests,
                totalTests,
                totalExecutionTime,
                lastSubmissionTime,
                submissionCount: p.submissions.length
            };
        });

        // Sort leaderboard:
        // 1. Total Score (desc)
        // 2. Last Submission Time (asc - earlier is better for ties)
        // 3. Execution Time (asc)
        leaderboard.sort((a, b) => {
            if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;

            // Handle cases with no submissions
            if (!a.lastSubmissionTime && !b.lastSubmissionTime) return 0;
            if (!a.lastSubmissionTime) return 1;
            if (!b.lastSubmissionTime) return -1;

            const timeA = new Date(a.lastSubmissionTime).getTime();
            const timeB = new Date(b.lastSubmissionTime).getTime();
            if (timeA !== timeB) return timeA - timeB;

            return a.totalExecutionTime - b.totalExecutionTime;
        });

        res.json({ leaderboard });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Get all "visitors" (participants who have joined an exam/level)
router.get('/visitors', authenticateOrganizer, async (req, res) => {
    try {
        const organizerId = parseInt(req.organizerId);

        // Find all exams for this organizer with their assignments
        const exams = await prisma.exam.findMany({
            where: { organizerId },
            include: {
                QuestionAssignment: {
                    include: {
                        participant: {
                            select: {
                                id: true,
                                participantId: true,
                                collegeName: true
                            }
                        },
                        question: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    }
                }
            }
        });

        // Get all submission counts for these participants/questions in one go to avoid N+1
        const allAssignments = exams.flatMap(e => e.QuestionAssignment || []);

        // We can optimize this by getting counts grouped by participantId/questionId if possible,
        // but for now let's just use Promise.all to run them in parallel for better speed.
        const visitors = await Promise.all(allAssignments.map(async (assignment) => {
            const submissionsCount = await prisma.submission.count({
                where: {
                    participantId: assignment.participantId,
                    questionId: assignment.questionId
                }
            });

            // Find which exam this assignment belongs to
            const exam = exams.find(e => e.QuestionAssignment.some(a => a.id === assignment.id));

            return {
                participantId: assignment.participant?.id || assignment.participantId,
                teamName: assignment.participant?.participantId || 'Unknown',
                collegeName: assignment.participant?.collegeName || 'N/A',
                examId: exam?.id,
                examTitle: exam?.title || 'Unknown Exam',
                assignedQuestionId: assignment.questionId,
                assignedQuestionTitle: assignment.question?.title || 'No Question Assigned',
                submissionsCount,
                joinedAt: assignment.joinedAt || assignment.assignedAt,
                status: submissionsCount > 0 ? 'Active' : 'Visitor'
            };
        }));

        res.json({ visitors });
    } catch (error) {
        console.error('Fetch visitors error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to fetch visitors', details: error.message });
    }
});

// Remove a participant from an exam/level completely
router.delete('/exams/:examId/participants/:participantId', authenticateOrganizer, async (req, res) => {
    try {
        const examId = parseInt(req.params.examId);
        const participantId = parseInt(req.params.participantId);

        // Verify organizer owns the exam
        const exam = await prisma.exam.findFirst({
            where: { id: examId, organizerId: req.organizerId },
            include: { questions: { select: { id: true } } }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found or permission denied' });
        }

        const questionIds = exam.questions.map(q => q.id);

        // Transaction to ensure atomic removal
        await prisma.$transaction([
            // 1. Delete all submissions for this participant in this exam
            prisma.submission.deleteMany({
                where: {
                    participantId: participantId,
                    questionId: { in: questionIds }
                }
            }),
            // 2. Delete the question assignment
            prisma.questionAssignment.deleteMany({
                where: {
                    participantId: participantId,
                    examId: examId
                }
            }),
            // 3. Disconnect participant from exam (many-to-many relationship)
            prisma.exam.update({
                where: { id: examId },
                data: {
                    participants: {
                        disconnect: { id: participantId }
                    }
                }
            })
        ]);

        res.json({ message: 'Participant removed from exam successfully' });
    } catch (error) {
        console.error('Remove participant error:', error);
        res.status(500).json({ error: 'Failed to remove participant' });
    }
});

module.exports = router;
