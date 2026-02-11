'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import CodeEditor from '../../../components/CodeEditor'
import Toast from '../../../components/Toast'
import ConfirmDialog from '../../../components/ConfirmDialog'
import ResizableLayout from '../../../components/ResizableLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

function getDefaultCode(language) {
    switch (language) {
        case 'C':
            return `#include <stdio.h>

int main() {
    // Your code here
    return 0;
}`
        case 'C++':
            return `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Your code here
    return 0;
}`
        case 'Java':
            return `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Your code here
        sc.close();
    }
}`
        case 'Python':
        default:
            return `# Write your solution here

def solve():
    pass


if __name__ == "__main__":
    solve()`
    }
}

const parseUTCDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export default function ParticipantDashboard() {
    const router = useRouter()
    const [questions, setQuestions] = useState([])
    const [exams, setExams] = useState([])
    const [selectedExamId, setSelectedExamId] = useState(null)
    const [selectedQuestion, setSelectedQuestion] = useState(null)
    const [language, setLanguage] = useState('Python')
    const [code, setCode] = useState('')
    const [runResults, setRunResults] = useState(null)
    const [submissionResult, setSubmissionResult] = useState(null)
    const [loading, setLoading] = useState(true)
    const [fetchingQuestions, setFetchingQuestions] = useState(false)
    const [running, setRunning] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [participantData, setParticipantData] = useState(null)
    const [examEndTime, setExamEndTime] = useState(null)
    const [timeRemaining, setTimeRemaining] = useState(null)
    const [tabSwitchCount, setTabSwitchCount] = useState(0)
    const [examBlocked, setExamBlocked] = useState(false)
    const [notification, setNotification] = useState(null)
    const [showConfirm, setShowConfirm] = useState(false)

    // Custom Input State
    const [showCustomInput, setShowCustomInput] = useState(false)
    const [customInput, setCustomInput] = useState('')
    const [customExpectedOutput, setCustomExpectedOutput] = useState('')

    // Exam Code Gatekeeper State
    const [isExamJoined, setIsExamJoined] = useState(false)
    const [enteredCode, setEnteredCode] = useState('')
    const [joinedExams, setJoinedExams] = useState(new Set())

    // Unified Security & Anti-Cheating Controls
    useEffect(() => {
        const handleViolation = () => {
            if (examBlocked) return
            setTabSwitchCount((prev) => {
                const newCount = prev + 1
                if (newCount === 1) {
                    setNotification({ message: '⚠️ Warning: Violation detected! (Tab switch/restricted key). 1 warning left.', type: 'warning' })
                } else if (newCount >= 2) {
                    setNotification({ message: '🚫 Exam Terminated! Maximum violations exceeded.', type: 'error' })
                    setExamBlocked(true)
                    localStorage.removeItem('participantToken')
                    router.push('/')
                }
                return newCount
            })
        }

        const handleVisibilityChange = () => { if (document.hidden && !examBlocked) handleViolation() }
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.key === 'Tab' || e.key === 'Escape' || e.metaKey) {
                e.preventDefault()
                handleViolation()
            }
        }
        const handleContextMenu = (e) => e.preventDefault()
        const handlePaste = (e) => e.preventDefault()

        document.addEventListener('visibilitychange', handleVisibilityChange)
        document.addEventListener('contextmenu', handleContextMenu)
        document.addEventListener('paste', handlePaste)
        document.addEventListener('keydown', handleKeyDown, true)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            document.removeEventListener('contextmenu', handleContextMenu)
            document.removeEventListener('paste', handlePaste)
            document.removeEventListener('keydown', handleKeyDown, true)
        }
    }, [examBlocked, router])

    // Load participant info and exams
    useEffect(() => {
        const token = localStorage.getItem('participantToken')
        const data = localStorage.getItem('participantData')
        if (!token) { router.push('/participant/login'); return }

        if (data) {
            const parsedData = JSON.parse(data)
            setParticipantData(parsedData)
            setSelectedExamId(parsedData.activeExamId)
            if (parsedData.examEndTime) setExamEndTime(parseUTCDate(parsedData.examEndTime))
        }
        fetchExams()
    }, [])

    // Countdown timer — depends on examEndTime, exams and selectedExamId so it has fresh data
    useEffect(() => {
        if (!examEndTime) return

        const interval = setInterval(() => {
            const now = new Date()
            const remaining = examEndTime - now
            if (remaining <= 0) {
                setTimeRemaining(0)
                clearInterval(interval)

                // Find next level if any using latest exams array
                const currentIndex = exams.findIndex(e => e.id === selectedExamId)
                if (currentIndex !== -1 && currentIndex < exams.length - 1) {
                    const nextLevelId = exams[currentIndex + 1].id
                    setNotification({ message: `Time up for ${exams[currentIndex].title}! Moving to next level...`, type: 'warning' })

                    // Refresh exams and use fresh data from the promise
                    fetchExams().then((freshExams) => {
                        if (!freshExams) return

                        const updatedNextLevel = freshExams.find(e => e.id === nextLevelId)
                        setSelectedExamId(nextLevelId)

                        // If next level is already joined, fetch questions
                        if (updatedNextLevel?.joined) {
                            if (updatedNextLevel.endTime) setExamEndTime(parseUTCDate(updatedNextLevel.endTime))
                            fetchQuestions(nextLevelId)
                            setIsExamJoined(true)
                        } else {
                            setIsExamJoined(false)
                        }
                    })
                } else {
                    alert('Time is up for the final level!')
                    handleLogout()
                }
            } else {
                setTimeRemaining(remaining)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [examEndTime, exams, selectedExamId])

    // Reset editor when question or language changes
    useEffect(() => {
        if (!selectedQuestion) return
        const previousSubmission = selectedQuestion.submissions?.find((s) => s.language === language)
        if (previousSubmission) {
            setCode(previousSubmission.code)
        } else {
            const starterCode = selectedQuestion.starterCodes?.find((sc) => sc.language === language)
            setCode(starterCode?.code || getDefaultCode(language))
        }
        setRunResults(null)
        setSubmissionResult(null)
    }, [selectedQuestion, language])

    useEffect(() => {
        if (selectedExamId) {
            const currentExam = exams.find(e => e.id === selectedExamId)
            setIsExamJoined(!!currentExam?.joined)
            setEnteredCode('')

            // Set exam end time if it exists
            if (currentExam) {
                if (currentExam.endTime) {
                    setExamEndTime(parseUTCDate(currentExam.endTime))
                } else if (currentExam.startTime) {
                    const startTime = parseUTCDate(currentExam.startTime)
                    const durationMs = (currentExam.duration || 3600) * 1000
                    setExamEndTime(new Date(startTime.getTime() + durationMs))
                } else {
                    setExamEndTime(null)
                }
            }

            // Fetch questions only if joined, otherwise clear loading state to show join screen
            if (currentExam?.joined) {
                fetchQuestions(selectedExamId)
            } else {
                setLoading(false)
            }
        }
    }, [selectedExamId, exams])

    const fetchExams = async () => {
        try {
            const token = localStorage.getItem('participantToken')
            const response = await axios.get(`${API_URL}/api/participant/exams`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const fetchedExams = response.data.exams || []
            setExams(fetchedExams)

            // If no exam selected yet, pick the first unlocked one
            if (!selectedExamId && fetchedExams.length > 0) {
                const firstUnlocked = fetchedExams.find(e => e.unlocked)
                if (firstUnlocked) {
                    setSelectedExamId(firstUnlocked.id)
                }
            }
            return fetchedExams
        } catch (error) {
            console.error('Fetch exams error:', error)
            setNotification({ message: 'Failed to fetch exams. Please refresh.', type: 'error' })
            return null
        } finally {
            setLoading(false)
        }
    }

    const fetchQuestions = async (examId) => {
        setFetchingQuestions(true)
        try {
            const token = localStorage.getItem('participantToken')
            const response = await axios.get(`${API_URL}/api/participant/questions`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { examId }
            })

            const fetchedQuestions = response.data.questions || []
            setQuestions(fetchedQuestions)
            setSelectedQuestion(fetchedQuestions.length > 0 ? fetchedQuestions[0] : null)
        } catch (error) {
            console.error('Fetch questions error:', error)
            if (error.response?.status === 401) {
                localStorage.removeItem('participantToken')
                router.push('/participant/login')
            } else {
                setNotification({ message: error.response?.data?.error || 'Failed to fetch questions', type: 'error' })
            }
        } finally {
            setFetchingQuestions(false)
            setLoading(false)
        }
    }

    const isLevelCompleted = () => {
        if (questions.length === 0) return false
        return questions.every(q => q.submissions?.some(s => s.status === 'COMPLETED'))
    }

    const handleRun = async () => {
        if (!selectedQuestion || !code) return

        setRunning(true)
        setRunResults(null)

        try {
            const token = localStorage.getItem('participantToken')
            const response = await axios.post(
                `${API_URL}/api/participant/run`,
                {
                    questionId: selectedQuestion.id,
                    language,
                    code,
                    customInput: showCustomInput ? customInput : undefined,
                    customExpectedOutput: showCustomInput ? customExpectedOutput : undefined
                },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setRunResults(response.data.results)
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to run code')
        } finally {
            setRunning(false)
        }
    }

    const handleSubmit = () => {
        if (!selectedQuestion || !code) return
        setShowConfirm(true)
    }

    const handleConfirmSubmit = async () => {
        setShowConfirm(false)
        setSubmitting(true)
        setSubmissionResult(null)

        try {
            const token = localStorage.getItem('participantToken')
            const response = await axios.post(
                `${API_URL}/api/participant/submit`,
                { questionId: selectedQuestion.id, language, code },
                { headers: { Authorization: `Bearer ${token}` } }
            )

            setSubmissionResult(response.data.submission)

            // Refresh exams to update unlocked status
            fetchExams()

            // Update local questions state with the new submission
            const newSubmission = {
                code,
                language,
                status: 'COMPLETED',
                createdAt: new Date().toISOString()
            }

            setQuestions(prev => prev.map(q => {
                if (q.id === selectedQuestion.id) {
                    return {
                        ...q,
                        submissions: [newSubmission, ...(q.submissions || [])]
                    }
                }
                return q
            }))

            // Also update selectedQuestion to reflect the new submission immediately
            setSelectedQuestion(prev => ({
                ...prev,
                submissions: [newSubmission, ...(prev.submissions || [])]
            }))

            setNotification({
                message: `Submitted! Score: ${response.data.submission.score.toFixed(1)}% (${response.data.submission.passedTests}/${response.data.submission.totalTests} tests passed)`,
                type: response.data.submission.score >= 70 ? 'success' : 'warning'
            })

            // Auto-navigate to next question after delay
            setTimeout(() => {
                const currentIndex = questions.findIndex(q => q.id === selectedQuestion.id)
                const nextQuestion = questions[currentIndex + 1]

                if (nextQuestion) {
                    // Navigate to next question
                    setSelectedQuestion(nextQuestion)
                    setSubmissionResult(null)
                } else {
                    // Last question - show completion message and logout
                    setNotification({
                        message: '🎉 Congratulations! You have completed all questions in this exam.',
                        type: 'success'
                    })
                }
            }, 1500)
        } catch (error) {
            setNotification({
                message: error.response?.data?.error || 'Failed to submit code',
                type: 'error'
            })
        } finally {
            setSubmitting(false)
        }
    }

    const handleJoinExam = async (e) => {
        e.preventDefault()
        if (!enteredCode.trim()) {
            setNotification({ message: 'Please enter an exam code', type: 'warning' })
            return
        }

        try {
            const token = localStorage.getItem('participantToken')
            const response = await axios.post(
                `${API_URL}/api/participant/join-exam`,
                { examId: selectedExamId, code: enteredCode },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            // Refresh exams and questions so joined status is reflected and questions are loaded
            await fetchExams()
            await fetchQuestions(selectedExamId)

            setIsExamJoined(true)
            setJoinedExams(prev => new Set([...prev, selectedExamId]))
            setEnteredCode('')
            setNotification({ message: `Successfully joined ${exams.find(e => e.id === selectedExamId)?.title || 'this level'}!`, type: 'success' })
        } catch (error) {
            setNotification({ message: error.response?.data?.error || 'Failed to join exam', type: 'error' })
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('participantToken')
        localStorage.removeItem('participantData')
        router.push('/')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-2xl gradient-text animate-pulse">Loading...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-4 flex flex-col">
            <div className="mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text">
                            {exams.find(e => e.id === selectedExamId)?.title || 'Level Progression'}
                        </h1>
                        <p className="text-sm text-gray-500">
                            Team: <span className="font-semibold text-gray-700">{participantData?.participantId}</span>
                        </p>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                            {exams.map((level, idx) => {
                                const isCurrent = selectedExamId === level.id;
                                const isLive = level.isLive;
                                const isCompleted = level.completed;

                                let statusLabel = '';
                                let buttonClass = 'px-3 py-1.5 rounded-md text-sm font-bold transition-all ';

                                if (isCurrent) {
                                    buttonClass += 'bg-primary-600 text-white shadow-md';
                                } else if (!level.unlocked) {
                                    buttonClass += 'bg-gray-100 text-gray-400 cursor-not-allowed';
                                } else if (isCompleted) {
                                    buttonClass += 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100';
                                    statusLabel = ' (Done)';
                                } else if (isLive) {
                                    buttonClass += 'bg-white text-primary-600 border border-primary-200 hover:bg-primary-50';
                                    statusLabel = ' (Live)';
                                } else {
                                    buttonClass += 'bg-white text-gray-600 hover:bg-gray-100';
                                }

                                return (
                                    <button
                                        key={level.id}
                                        onClick={() => level.unlocked && setSelectedExamId(level.id)}
                                        disabled={!level.unlocked}
                                        className={buttonClass}
                                        title={!level.unlocked ? 'Complete previous level to unlock' : ''}
                                    >
                                        {!level.unlocked && '🔒 '}
                                        Level {idx + 1}{statusLabel}
                                    </button>
                                );
                            })}
                        </div>

                        <div
                            className={`px-4 py-2 rounded-lg font-bold ${tabSwitchCount === 0
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                        >
                            🔄 Violations: {tabSwitchCount}/2
                        </div>

                        {timeRemaining !== null && (
                            <div className="px-4 py-2 rounded-lg font-bold bg-primary-50 text-primary-700 border border-primary-200">
                                ⏱️ {formatTime(timeRemaining)}
                            </div>
                        )}

                        <button onClick={handleLogout} className="px-4 py-2 rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white transition-colors">
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 grid lg:grid-cols-12 gap-4 overflow-hidden">
                <div className="lg:col-span-1">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-full">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Questions</h2>
                        <div className="space-y-3">
                            {fetchingQuestions ? (
                                <div className="text-center py-4 animate-pulse text-gray-400 text-xs">Loading...</div>
                            ) : questions.map((q, idx) => {
                                const isDone = q.submissions?.some(s => s.status === 'COMPLETED')
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => setSelectedQuestion(q)}
                                        className={`w-full aspect-square flex items-center justify-center rounded-xl transition-all font-bold relative ${selectedQuestion?.id === q.id
                                            ? 'bg-primary-600 text-white shadow-lg scale-105'
                                            : isDone
                                                ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100'
                                                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                                            }`}
                                    >
                                        {idx + 1}
                                        {isDone && <span className="absolute -top-1 -right-1 text-xs">✅</span>}
                                    </button>
                                )
                            })}
                        </div>

                        {isLevelCompleted() && (
                            <div className="mt-8 animate-bounce">
                                <button
                                    onClick={() => {
                                        const currentIndex = exams.findIndex(e => e.id === selectedExamId)
                                        const nextLevel = exams[currentIndex + 1]
                                        if (nextLevel?.unlocked) {
                                            setSelectedExamId(nextLevel.id)
                                        } else {
                                            fetchExams().then(() => {
                                                const updatedNext = exams[currentIndex + 1]
                                                if (updatedNext?.unlocked) setSelectedExamId(updatedNext.id)
                                                else setNotification({ message: 'Next level is still locked. Refreshing status...', type: 'warning' })
                                            })
                                        }
                                    }}
                                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-200 text-xs"
                                >
                                    Next Level →
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-11 h-full overflow-hidden">
                    {fetchingQuestions ? (
                        <div className="h-full flex items-center justify-center bg-white rounded-xl">
                            <div className="text-primary-500 animate-spin text-4xl">⌛</div>
                        </div>
                    ) : !isExamJoined ? (
                        <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center animate-scale-in">
                            <div className="max-w-md w-full">
                                <span className="text-6xl mb-6 block">🔐</span>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Join Level</h3>
                                <p className="text-gray-500 mb-8">Enter the Exam Code for <strong>{exams.find(e => e.id === selectedExamId)?.title}</strong> to access the questions.</p>

                                <form onSubmit={handleJoinExam} className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Enter Exam Code"
                                        value={enteredCode}
                                        onChange={(e) => setEnteredCode(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-center font-bold tracking-widest uppercase transition-all"
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-200"
                                    >
                                        Join Level
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : selectedQuestion ? (
                        <ResizableLayout
                            initialLeftWidth={50}
                            left={
                                <div className="h-full pr-2">
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full overflow-y-auto">
                                        <h2 className="text-2xl font-bold mb-4 text-gray-900">{selectedQuestion.title}</h2>

                                        <div className="space-y-6 text-gray-700 leading-relaxed">
                                            <div>
                                                <h3 className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-2">Problem</h3>
                                                <p className="whitespace-pre-wrap">{selectedQuestion.description}</p>
                                            </div>

                                            {selectedQuestion.inputFormat && (
                                                <div>
                                                    <h3 className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-2">Input Format</h3>
                                                    <p className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">{selectedQuestion.inputFormat}</p>
                                                </div>
                                            )}

                                            {selectedQuestion.outputFormat && (
                                                <div>
                                                    <h3 className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-2">Output Format</h3>
                                                    <p className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">{selectedQuestion.outputFormat}</p>
                                                </div>
                                            )}

                                            {selectedQuestion.constraints && (
                                                <div>
                                                    <h3 className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-2">Constraints</h3>
                                                    <p className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">{selectedQuestion.constraints}</p>
                                                </div>
                                            )}

                                            <div>
                                                <h3 className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-3">Sample Testcases</h3>
                                                <div className="space-y-4">
                                                    {selectedQuestion.testcases?.map((tc, idx) => (
                                                        <div key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-bold text-gray-500">
                                                                Sample Case {idx + 1}
                                                            </div>
                                                            <div className="p-4 grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Input</div>
                                                                    <pre className="text-sm font-mono bg-gray-50 p-2 rounded border border-gray-100 overflow-x-auto">{tc.input}</pre>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Output</div>
                                                                    <pre className="text-sm font-mono bg-gray-50 p-2 rounded border border-gray-100 overflow-x-auto">{tc.expectedOutput}</pre>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            }
                            right={
                                <div className="h-full pl-2 flex flex-col">
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden" style={{ height: (runResults || submissionResult) ? '45%' : '100%', transition: 'height 0.3s ease' }}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-gray-900">Solution</h3>
                                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                                {['Python', 'C++', 'C', 'Java'].map((lang) => (
                                                    <button
                                                        key={lang}
                                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${language === lang ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                        onClick={() => setLanguage(lang)}
                                                    >
                                                        {lang}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex-1 min-h-0 border border-gray-200 rounded-xl overflow-hidden shadow-inner">
                                            <CodeEditor language={language} value={code} onChange={setCode} />
                                        </div>

                                        <div className="mt-2 flex flex-col space-y-3">
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id="customInputToggle"
                                                    checked={showCustomInput}
                                                    onChange={(e) => setShowCustomInput(e.target.checked)}
                                                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                                                />
                                                <label htmlFor="customInputToggle" className="ml-2 text-sm font-semibold text-gray-700">
                                                    Custom Input
                                                </label>
                                            </div>

                                            {showCustomInput && (
                                                <div className="grid grid-cols-2 gap-4 animate-slide-down">
                                                    <div>
                                                        <textarea
                                                            value={customInput}
                                                            onChange={(e) => setCustomInput(e.target.value)}
                                                            placeholder="Input..."
                                                            className="w-full h-20 p-2 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <textarea
                                                            value={customExpectedOutput}
                                                            onChange={(e) => setCustomExpectedOutput(e.target.value)}
                                                            placeholder="Expected..."
                                                            className="w-full h-20 p-2 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary-500"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleRun}
                                                    disabled={running || !code || fetchingQuestions}
                                                    className="flex-1 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                                                >
                                                    {running ? '...' : '▶ Run'}
                                                </button>
                                                <button
                                                    onClick={handleSubmit}
                                                    disabled={submitting || !code || fetchingQuestions}
                                                    className="flex-[2] py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-200 flex items-center justify-center gap-2"
                                                >
                                                    {submitting ? '...' : '✓ Submit Solution'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {(runResults || submissionResult) && (
                                        <div className="bg-gray-900 rounded-xl p-6 text-white shadow-2xl animate-slide-up flex-1 overflow-y-auto mt-2">
                                            {submissionResult ? (
                                                <div className="text-center py-4">
                                                    <div className={`text-5xl font-black mb-2 ${submissionResult.score >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                        {submissionResult.score.toFixed(1)}%
                                                    </div>
                                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-6">
                                                        {submissionResult.passedTests} / {submissionResult.totalTests} Tests Passed
                                                    </p>
                                                    <div className="space-y-3">
                                                        {(submissionResult?.testcaseResults || []).length > 0 && (submissionResult?.testcaseResults || []).map((r, i) => (
                                                            <div key={i} className={`p-3 rounded-lg border text-left ${r.passed ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-[10px] font-black uppercase text-gray-400">Test {i + 1}</span>
                                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${r.passed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                                                        {r.passed ? 'PASSED' : 'FAILED'}
                                                                    </span>
                                                                </div>
                                                                <div className="space-y-2 text-xs font-mono">
                                                                    <div>
                                                                        <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Input</div>
                                                                        <pre className="bg-black/50 p-2 rounded border border-gray-800 overflow-x-auto max-h-16">{r.input || '(empty)'}</pre>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div>
                                                                            <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Expected</div>
                                                                            <pre className="bg-black/50 p-2 rounded border border-gray-800 overflow-x-auto max-h-16">{r.expectedOutput || 'N/A'}</pre>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Actual</div>
                                                                            <pre className={`bg-black/50 p-2 rounded border border-gray-800 overflow-x-auto max-h-16 ${r.passed ? 'text-green-400' : 'text-red-400'}`}>{r.actualOutput || r.error || (r.passed ? 'MATCHED' : '')}</pre>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {runResults.map((r, i) => (
                                                        <div key={i} className={`p-3 rounded-lg border ${r.passed ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-[10px] font-black uppercase text-gray-400">Test {i + 1}</span>
                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${r.passed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                                                    {r.passed ? 'PASSED' : 'FAILED'}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-2 text-xs font-mono">
                                                                <div>
                                                                    <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Input</div>
                                                                    <pre className="bg-black/50 p-2 rounded border border-gray-800 overflow-x-auto max-h-16">{r.input || '(empty)'}</pre>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div>
                                                                        <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Expected</div>
                                                                        <pre className="bg-black/50 p-2 rounded border border-gray-800 overflow-x-auto max-h-16">{r.expectedOutput || 'N/A'}</pre>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Actual</div>
                                                                        <pre className={`bg-black/50 p-2 rounded border border-gray-800 overflow-x-auto max-h-16 ${r.passed ? 'text-green-400' : 'text-red-400'}`}>{r.actualOutput || r.error || (r.passed ? 'MATCHED' : '')}</pre>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            }
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                            <span className="text-6xl mb-6">🎯</span>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Questions Available</h3>
                            <p className="text-gray-500 max-w-md">There are no questions in this level yet. Please check back later or contact the administrator.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Toast Notification */}
            {notification && (
                <Toast
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}

            {/* Confirmation Dialog */}
            {showConfirm && (
                <ConfirmDialog
                    message="Are you sure you want to submit? This will be evaluated against all testcases."
                    onConfirm={handleConfirmSubmit}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </div>
    )
}
