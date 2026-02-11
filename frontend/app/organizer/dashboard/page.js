'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Toast from '../../../components/Toast'
import ConfirmDialog from '../../../components/ConfirmDialog'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function OrganizerDashboard() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('questions')
    const [questions, setQuestions] = useState([])
    const [exams, setExams] = useState([])
    const [submissions, setSubmissions] = useState([])
    const [selectedQuestion, setSelectedQuestion] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showCreateQuestion, setShowCreateQuestion] = useState(false)
    const [notification, setNotification] = useState(null)
    const [confirmation, setConfirmation] = useState(null)

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('organizerToken')
            const config = { headers: { Authorization: `Bearer ${token}` } }

            const [questionsRes, examsRes, submissionsRes] = await Promise.all([
                axios.get(`${API_URL}/api/organizer/questions`, config),
                axios.get(`${API_URL}/api/organizer/exams`, config),
                axios.get(`${API_URL}/api/organizer/submissions`, config)
            ])

            setQuestions(questionsRes.data.questions || [])
            setExams(examsRes.data.exams || [])
            setSubmissions(submissionsRes.data.submissions || [])
            setLoading(false)
        } catch (error) {
            console.error('Fetch error:', error)
            if (error.response?.status === 401) {
                localStorage.removeItem('organizerToken')
                router.push('/organizer/login')
            }
        }
    }

    useEffect(() => {
        const token = localStorage.getItem('organizerToken')
        if (!token) {
            router.push('/organizer/login')
            return
        }
        fetchData()
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('organizerToken')
        localStorage.removeItem('organizerData')
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
        <div className="min-h-screen p-8">
            {/* Header */}
            <div className="container-custom mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold gradient-text mb-2">Organizer Dashboard</h1>
                        <p className="text-gray-400">Manage exams, questions, and submissions</p>
                    </div>
                    <button onClick={handleLogout} className="btn btn-secondary">
                        Logout
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="container-custom mb-8">
                <div className="flex space-x-4 border-b border-border">
                    {['questions', 'exams', 'submissions', 'leaderboard', 'visitors'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 font-medium transition-all ${activeTab === tab
                                ? 'text-primary-500 border-b-2 border-primary-500'
                                : 'text-gray-400 hover:text-gray-300'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="container-custom">
                {activeTab === 'questions' && (
                    <QuestionsTab
                        questions={questions}
                        exams={exams}
                        onRefresh={fetchData}
                        selectedQuestion={selectedQuestion}
                        setSelectedQuestion={setSelectedQuestion}
                        setNotification={setNotification}
                        setConfirmation={setConfirmation}
                    />
                )}
                {activeTab === 'exams' && (
                    <ExamsTab
                        exams={exams}
                        onRefresh={fetchData}
                        setNotification={setNotification}
                        setConfirmation={setConfirmation}
                    />
                )}
                {activeTab === 'submissions' && (
                    <SubmissionsTab
                        submissions={submissions}
                        setNotification={setNotification}
                        setConfirmation={setConfirmation}
                    />
                )}
                {activeTab === 'leaderboard' && (
                    <LeaderboardTab
                        exams={exams}
                        setNotification={setNotification}
                    />
                )}
                {activeTab === 'visitors' && (
                    <VisitorsTab
                        exams={exams}
                        setNotification={setNotification}
                        setConfirmation={setConfirmation}
                    />
                )}
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
            {confirmation && (
                <ConfirmDialog
                    message={confirmation.message}
                    confirmText={confirmation.confirmText}
                    isDangerous={confirmation.isDangerous}
                    showInput={confirmation.showInput}
                    inputType={confirmation.inputType}
                    inputPlaceholder={confirmation.inputPlaceholder}
                    onConfirm={(val) => {
                        confirmation.onConfirm && confirmation.onConfirm(val)
                        setConfirmation(null)
                    }}
                    onCancel={() => setConfirmation(null)}
                />
            )}
        </div>
    )
}

function QuestionsTab({ questions, exams, onRefresh, selectedQuestion, setSelectedQuestion, setNotification, setConfirmation }) {
    const router = useRouter()
    const [showCreate, setShowCreate] = useState(false)
    const [showTestcases, setShowTestcases] = useState(false)
    const [editQuestion, setEditQuestion] = useState(null)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        inputFormat: '',
        outputFormat: '',
        constraints: '',
        maxMarks: 100,
        allowedLanguages: 'C,C++,Python,Java',
        examId: '',
        solution: '',
        solutionLanguage: 'Python'
    })
    const [starterCodes, setStarterCodes] = useState({
        C: '',
        'C++': '',
        Python: '',
        Java: ''
    })
    const [solutionCodes, setSolutionCodes] = useState({
        C: '',
        'C++': '',
        Python: '',
        Java: ''
    })
    const [testcase, setTestcase] = useState({
        input: '',
        expectedOutput: '',
        visibility: 'VISIBLE'
    })
    const [editTestcaseId, setEditTestcaseId] = useState(null)
    const [solutionResults, setSolutionResults] = useState(null)
    const [runningSolution, setRunningSolution] = useState(false)

    useEffect(() => {
        if (selectedQuestion) {
            const sc = { C: '', 'C++': '', Python: '', Java: '' }
            selectedQuestion.starterCodes?.forEach(code => {
                sc[code.language] = code.code
            })
            setStarterCodes(sc)

            const slc = { C: '', 'C++': '', Python: '', Java: '' }
            selectedQuestion.solutionCodes?.forEach(code => {
                slc[code.language] = code.code
            })
            setSolutionCodes(slc)
        }
    }, [selectedQuestion])

    const handleCreateQuestion = async (e) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem('organizerToken')
            // Convert examId to integer or null
            const questionData = {
                ...formData,
                examId: formData.examId ? parseInt(formData.examId) : null
            }
            const response = await axios.post(
                `${API_URL}/api/organizer/questions`,
                questionData,
                { headers: { Authorization: `Bearer ${token}` } }
            )

            setNotification({ message: 'Question created successfully!', type: 'success' })
            setShowCreate(false)
            setSelectedQuestion(null)
            setFormData({
                title: '',
                description: '',
                inputFormat: '',
                outputFormat: '',
                constraints: '',
                maxMarks: 100,
                allowedLanguages: 'C,C++,Python,Java',
                examId: '',
                solution: '',
                solutionLanguage: 'Python'
            })
            onRefresh()
        } catch (error) {
            setNotification({ message: error.response?.data?.error || 'Failed to create question', type: 'error' })
        }
    }

    const handleUpdateQuestion = async (e) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem('organizerToken')
            const examIdValue = formData.examId === '' ? null : parseInt(formData.examId)

            await axios.put(
                `${API_URL}/api/organizer/questions/${editQuestion.id}`,
                { ...formData, examId: examIdValue },
                { headers: { Authorization: `Bearer ${token}` } }
            )

            setNotification({ message: 'Question updated successfully!', type: 'success' })
            setEditQuestion(null)
            setShowCreate(false)
            setFormData({
                title: '',
                description: '',
                inputFormat: '',
                outputFormat: '',
                constraints: '',
                timeLimit: 5,
                memoryLimit: 256,
                maxMarks: 100,
                allowedLanguages: 'C,C++,Python',
                examId: '',
                solution: '',
                solutionLanguage: 'Python'
            })
            onRefresh()
        } catch (error) {
            setNotification({ message: error.response?.data?.error || 'Failed to update question', type: 'error' })
        }
    }

    const handleAddStarterCode = async (language) => {
        if (!selectedQuestion) return

        try {
            const token = localStorage.getItem('organizerToken')
            await axios.post(
                `${API_URL}/api/organizer/questions/${selectedQuestion.id}/starter-code`,
                { language, code: starterCodes[language] },
                { headers: { Authorization: `Bearer ${token}` } }
            )

            setNotification({ message: `${language} starter code saved!`, type: 'success' })
            onRefresh()
        } catch (error) {
            setNotification({ message: error.response?.data?.error || 'Failed to save starter code', type: 'error' })
        }
    }

    const handleAddSolutionCode = async (language) => {
        if (!selectedQuestion) return

        try {
            const token = localStorage.getItem('organizerToken')
            await axios.post(
                `${API_URL}/api/organizer/questions/${selectedQuestion.id}/solution-code`,
                { language, code: solutionCodes[language] },
                { headers: { Authorization: `Bearer ${token}` } }
            )

            setNotification({ message: `${language} solution code saved!`, type: 'success' })
            onRefresh()
        } catch (error) {
            setNotification({ message: error.response?.data?.error || 'Failed to save solution code', type: 'error' })
        }
    }

    const handleAddTestcase = async (e) => {
        e.preventDefault()
        if (!selectedQuestion) return

        try {
            const token = localStorage.getItem('organizerToken')

            if (editTestcaseId) {
                // Update existing testcase
                await axios.put(
                    `${API_URL}/api/organizer/testcases/${editTestcaseId}`,
                    testcase,
                    { headers: { Authorization: `Bearer ${token}` } }
                )
                setNotification({ message: 'Testcase updated successfully!', type: 'success' })
                setEditTestcaseId(null)
            } else {
                // Add new testcase
                await axios.post(
                    `${API_URL}/api/organizer/questions/${selectedQuestion.id}/testcases`,
                    testcase,
                    { headers: { Authorization: `Bearer ${token}` } }
                )
                setNotification({ message: 'Testcase added successfully!', type: 'success' })
            }

            setTestcase({ input: '', expectedOutput: '', visibility: 'VISIBLE' })
            onRefresh()
        } catch (error) {
            if (error.response?.status === 401) {
                setNotification({ message: 'Session expired. Please login again.', type: 'error' })
                setTimeout(() => {
                    localStorage.removeItem('organizerToken')
                    router.push('/organizer/login')
                }, 2000)
            } else {
                setNotification({ message: error.response?.data?.error || 'Failed to save testcase', type: 'error' })
            }
        }
    }

    const handleRunSolution = async (questionId) => {
        setRunningSolution(true)
        setSolutionResults(null)

        try {
            const token = localStorage.getItem('organizerToken')
            const response = await axios.post(
                `${API_URL}/api/organizer/run-solution/${questionId}`,
                {
                    solution: formData.solution,
                    solutionLanguage: formData.solutionLanguage
                },
                { headers: { Authorization: `Bearer ${token}` } }
            )

            setSolutionResults(response.data.results)
        } catch (error) {
            setNotification({ message: error.response?.data?.error || 'Failed to run solution', type: 'error' })
        } finally {
            setRunningSolution(false)
        }
    }

    const handleDeleteQuestion = async (questionId) => {
        setConfirmation({
            message: 'Are you sure you want to delete this question? This will also delete all starter codes, testcases, and submissions associated with it.',
            confirmText: 'Delete Question',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem('organizerToken')
                    await axios.delete(
                        `${API_URL}/api/organizer/questions/${questionId}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    )

                    setNotification({ message: 'Question deleted successfully!', type: 'success' })
                    setSelectedQuestion(null)
                    onRefresh()
                } catch (error) {
                    setNotification({ message: error.response?.data?.error || 'Failed to delete question', type: 'error' })
                }
            }
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Questions</h2>
                <button onClick={() => {
                    if (!showCreate && !editQuestion) {
                        setFormData({
                            title: '',
                            description: '',
                            inputFormat: '',
                            outputFormat: '',
                            constraints: '',
                            maxMarks: 100,
                            allowedLanguages: 'C,C++,Python,Java',
                            examId: '',
                            solution: '',
                            solutionLanguage: 'Python'
                        })
                        setSelectedQuestion(null)
                    }
                    setShowCreate(!showCreate)
                }} className="btn btn-primary">
                    {showCreate ? 'Cancel' : '+ Create Question'}
                </button>
            </div>

            {(showCreate || editQuestion) && (
                <div className="card animate-slide-up">
                    <h3 className="text-xl font-bold mb-4">{editQuestion ? 'Edit Question' : 'Create New Question'}</h3>
                    <form onSubmit={editQuestion ? handleUpdateQuestion : handleCreateQuestion} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Title</label>
                                <input
                                    type="text"
                                    required
                                    className="input"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Exam (Optional)</label>
                                <select
                                    className="input"
                                    value={formData.examId}
                                    onChange={(e) => setFormData({ ...formData, examId: e.target.value })}
                                >
                                    <option value="">No Exam</option>
                                    {exams.map((exam) => (
                                        <option key={exam.id} value={exam.id}>{exam.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <textarea
                                required
                                rows={4}
                                className="textarea"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Input Format</label>
                                <textarea
                                    className="textarea"
                                    rows={2}
                                    value={formData.inputFormat}
                                    onChange={(e) => setFormData({ ...formData, inputFormat: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Output Format</label>
                                <textarea
                                    className="textarea"
                                    rows={2}
                                    value={formData.outputFormat}
                                    onChange={(e) => setFormData({ ...formData, outputFormat: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Constraints</label>
                            <textarea
                                className="textarea"
                                rows={2}
                                value={formData.constraints}
                                onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium">Solution (Optional - Organizer Only)</label>
                                <div className="space-x-1">
                                    {['Python', 'C++', 'C', 'Java'].map((lang) => (
                                        <button
                                            key={lang}
                                            type="button"
                                            className={`text-xs px-2 py-1 rounded ${formData.solutionLanguage === lang
                                                ? 'bg-primary-500 text-white'
                                                : 'bg-card hover:bg-card-hover'
                                                }`}
                                            onClick={() => setFormData({ ...formData, solutionLanguage: lang })}
                                        >
                                            {lang}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <textarea
                                className="textarea font-mono text-sm"
                                rows={8}
                                value={formData.solution}
                                onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                                placeholder="Enter reference solution code..."
                            />
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-gray-400">
                                    ℹ️ This solution is only visible to organizers, never shown to participants.
                                </p>
                                {editQuestion ? (
                                    formData.solution ? (
                                        <button
                                            type="button"
                                            onClick={() => handleRunSolution(editQuestion.id)}
                                            disabled={runningSolution}
                                            className="btn bg-purple-600 hover:bg-purple-700 text-white text-sm"
                                        >
                                            {runningSolution ? 'Running...' : `▶ Test Solution`}
                                        </button>
                                    ) : null
                                ) : (
                                    formData.solution && (
                                        <p className="text-xs text-yellow-400">
                                            💡 Save the question first, then edit it to test the solution
                                        </p>
                                    )
                                )}
                            </div>

                            {/* Solution Test Results */}
                            {solutionResults && (
                                <div className="mt-4 space-y-3 border-t border-border pt-4">
                                    <h5 className="font-semibold text-sm">Test Results</h5>
                                    <div className="max-h-96 overflow-y-auto space-y-2">
                                        {solutionResults.map((result, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-3 rounded-lg border text-sm ${result.passed
                                                    ? 'bg-green-500/10 border-green-500/30'
                                                    : 'bg-red-500/10 border-red-500/30'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-medium text-xs">
                                                        Test {idx + 1}
                                                    </span>
                                                    <span
                                                        className={`text-xs ${result.passed
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                            }`}
                                                    >
                                                        {result.passed ? '✓ PASSED' : '✕ FAILED'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                    <div>
                                                        <div className="text-gray-400 mb-1">Input</div>
                                                        <pre className="bg-background p-1.5 rounded text-xs overflow-x-auto">{result.input || '(empty)'}</pre>
                                                    </div>
                                                    <div>
                                                        <div className="text-gray-400 mb-1">Expected</div>
                                                        <pre className="bg-background p-1.5 rounded text-xs overflow-x-auto">
                                                            {result.expectedOutput}
                                                        </pre>
                                                    </div>
                                                    <div>
                                                        <div className="text-gray-400 mb-1">Actual</div>
                                                        <pre
                                                            className={`bg-background p-1.5 rounded text-xs overflow-x-auto ${result.passed ? '' : 'text-red-400'
                                                                }`}
                                                        >
                                                            {result.actualOutput || result.error}
                                                        </pre>
                                                    </div>
                                                </div>

                                                <div className="text-xs text-gray-400 mt-1">
                                                    ⏱️ {result.executionTime}ms
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Time Limit (seconds)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    className="input"
                                    value={formData.timeLimit || 5}
                                    onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Memory Limit (MB)</label>
                                <input
                                    type="number"
                                    min="32"
                                    max="2048"
                                    className="input"
                                    value={formData.memoryLimit || 256}
                                    onChange={(e) => setFormData({ ...formData, memoryLimit: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Maximum Marks</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="1000"
                                    className="input"
                                    value={formData.maxMarks}
                                    onChange={(e) => setFormData({ ...formData, maxMarks: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button type="submit" className="btn btn-primary flex-1">
                                {editQuestion ? 'Update Question' : 'Create Question'}
                            </button>
                            {editQuestion && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditQuestion(null)
                                        setFormData({
                                            title: '',
                                            description: '',
                                            inputFormat: '',
                                            outputFormat: '',
                                            constraints: '',
                                            timeLimit: 5,
                                            memoryLimit: 256,
                                            maxMarks: 100,
                                            allowedLanguages: 'C,C++,Python',
                                            examId: '',
                                            solution: '',
                                            solutionLanguage: 'Python'
                                        })
                                    }}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* Questions List */}
            <div className="grid gap-4">
                {questions.map((q) => (
                    <div key={q.id} className="card">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold">{q.title}</h3>
                                <div className="text-gray-400 text-sm space-y-1">
                                    <p>Max Marks: {q.maxMarks || 100}</p>
                                    <p>Time Limit: {q.timeLimit || 5}s</p>
                                    <p>Memory Limit: {q.memoryLimit || 256}MB</p>
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setSelectedQuestion(selectedQuestion?.id === q.id ? null : q)}
                                    className="btn btn-secondary"
                                >
                                    {selectedQuestion?.id === q.id ? 'Collapse' : 'Manage'}
                                </button>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => {
                                            setEditQuestion(q)
                                            setFormData({
                                                title: q.title,
                                                description: q.description || '',
                                                inputFormat: q.inputFormat || '',
                                                outputFormat: q.outputFormat || '',
                                                constraints: q.constraints || '',
                                                timeLimit: q.timeLimit || 5,
                                                memoryLimit: q.memoryLimit || 256,
                                                maxMarks: q.maxMarks || 100,
                                                allowedLanguages: q.allowedLanguages,
                                                examId: q.examId ? q.examId.toString() : '',
                                                solution: q.solution || '',
                                                solutionLanguage: q.solutionLanguage || 'Python'
                                            })
                                            setShowCreate(false)
                                            setSelectedQuestion(null)
                                        }}
                                        className="btn bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteQuestion(q.id)}
                                        className="btn btn-danger"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>

                        {selectedQuestion?.id === q.id && (
                            <div className="space-y-6 mt-6 border-t border-border pt-6">
                                {/* Starter Codes */}
                                <div>
                                    <h4 className="font-bold mb-4">Starter Codes</h4>
                                    <div className="space-y-4">
                                        {['C', 'C++', 'Python', 'Java'].map((lang) => (
                                            <div key={lang}>
                                                <label className="block text-sm font-medium mb-2">{lang}</label>
                                                <textarea
                                                    className="textarea font-mono text-sm"
                                                    rows={6}
                                                    value={q.starterCodes?.find(sc => sc.language === lang)?.code || starterCodes[lang]}
                                                    onChange={(e) => setStarterCodes({ ...starterCodes, [lang]: e.target.value })}
                                                    placeholder={`Enter ${lang} starter code...`}
                                                />
                                                <button
                                                    onClick={() => handleAddStarterCode(lang)}
                                                    className="btn btn-primary mt-2"
                                                >
                                                    Save {lang} Starter
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Solution Codes */}
                                <div>
                                    <h4 className="font-bold mb-4">Solution Codes</h4>
                                    <div className="space-y-4">
                                        {['C', 'C++', 'Python', 'Java'].map((lang) => (
                                            <div key={lang}>
                                                <label className="block text-sm font-medium mb-2">{lang}</label>
                                                <textarea
                                                    className="textarea font-mono text-sm border-purple-500/30 focus:border-purple-500"
                                                    rows={6}
                                                    value={q.solutionCodes?.find(sc => sc.language === lang)?.code || solutionCodes[lang]}
                                                    onChange={(e) => setSolutionCodes({ ...solutionCodes, [lang]: e.target.value })}
                                                    placeholder={`Enter ${lang} solution code...`}
                                                />
                                                <button
                                                    onClick={() => handleAddSolutionCode(lang)}
                                                    className="btn bg-purple-600 hover:bg-purple-700 text-white mt-2"
                                                >
                                                    Save {lang} Solution
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Testcases */}
                                <div>
                                    <h4 className="font-bold mb-4">Testcases</h4>

                                    {/* Existing testcases */}
                                    {q.testcases && q.testcases.length > 0 && (
                                        <div className="space-y-2 mb-4">
                                            {q.testcases.map((tc, idx) => (
                                                <div key={tc.id} className="p-4 bg-card border border-border rounded-lg">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-medium">Testcase {idx + 1}</span>
                                                        <div className="flex items-center space-x-2">
                                                            <span className={`px-2 py-1 rounded text-xs ${tc.visibility === 'VISIBLE' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                                {tc.visibility}
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    setEditTestcaseId(tc.id)
                                                                    setTestcase({
                                                                        input: tc.input,
                                                                        expectedOutput: tc.expectedOutput,
                                                                        visibility: tc.visibility
                                                                    })
                                                                }}
                                                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setConfirmation({
                                                                        message: 'Delete this testcase?',
                                                                        confirmText: 'Delete',
                                                                        isDangerous: true,
                                                                        onConfirm: async () => {
                                                                            try {
                                                                                const token = localStorage.getItem('organizerToken')
                                                                                await axios.delete(
                                                                                    `${API_URL}/api/organizer/testcases/${tc.id}`,
                                                                                    { headers: { Authorization: `Bearer ${token}` } }
                                                                                )
                                                                                setNotification({ message: 'Testcase deleted!', type: 'success' })
                                                                                onRefresh()
                                                                            } catch (error) {
                                                                                setNotification({ message: 'Failed to delete testcase', type: 'error' })
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                                className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-gray-400 mt-2">
                                                        Input: {tc.input.substring(0, 50)}{tc.input.length > 50 ? '...' : ''}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add/Edit testcase */}
                                    <form onSubmit={handleAddTestcase} className="space-y-4">
                                        <h5 className="font-bold text-sm">
                                            {editTestcaseId ? 'Edit Testcase' : 'Add New Testcase'}
                                        </h5>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Input</label>
                                            <textarea
                                                required
                                                className="textarea font-mono text-sm"
                                                rows={3}
                                                value={testcase.input}
                                                onChange={(e) => setTestcase({ ...testcase, input: e.target.value })}
                                                placeholder="Enter input..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Expected Output</label>
                                            <textarea
                                                required
                                                className="textarea font-mono text-sm"
                                                rows={3}
                                                value={testcase.expectedOutput}
                                                onChange={(e) => setTestcase({ ...testcase, expectedOutput: e.target.value })}
                                                placeholder="Enter expected output..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Visibility</label>
                                            <select
                                                className="input"
                                                value={testcase.visibility}
                                                onChange={(e) => setTestcase({ ...testcase, visibility: e.target.value })}
                                            >
                                                <option value="VISIBLE">VISIBLE (shown to participants)</option>
                                                <option value="HIDDEN">HIDDEN (only for evaluation)</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="submit" className="btn btn-success flex-1">
                                                {editTestcaseId ? 'Update Testcase' : 'Add Testcase'}
                                            </button>
                                            {editTestcaseId && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditTestcaseId(null)
                                                        setTestcase({ input: '', expectedOutput: '', visibility: 'VISIBLE' })
                                                    }}
                                                    className="btn btn-secondary"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>

                                {/* Solution Display (View Only) */}
                                {q.solution && (
                                    <div>
                                        <h4 className="font-bold mb-3 text-sm">Reference Solution ({q.solutionLanguage || 'Python'})</h4>
                                        <pre className="bg-card border border-border rounded-lg p-4 overflow-x-auto">
                                            <code className="text-sm font-mono">{q.solution}</code>
                                        </pre>
                                        <p className="text-xs text-gray-400 mt-2">
                                            💡 To test this solution, click "Edit" above and use the "▶ Test Solution" button in the form.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

function ExamsTab({ exams, onRefresh, setNotification, setConfirmation }) {
    const [showCreate, setShowCreate] = useState(false)
    const [formData, setFormData] = useState({
        code: '',
        title: '',
        description: '',
        startTime: '',
        endTime: ''
    })
    const [editExam, setEditExam] = useState(null)

    const toLocalISO = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const pad = (n) => n < 10 ? '0' + n : n;
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const toUTC = (localStr) => {
        if (!localStr) return null;
        try {
            const [datePart, timePart] = localStr.split('T');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hour, minute] = timePart.split(':').map(Number);
            const d = new Date(year, month - 1, day, hour, minute);
            return isNaN(d.getTime()) ? null : d.toISOString();
        } catch (e) {
            return null;
        }
    };

    const handleCreateExam = async (e) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem('organizerToken')
            const submissionData = {
                ...formData,
                startTime: toUTC(formData.startTime),
                endTime: toUTC(formData.endTime)
            };
            await axios.post(
                `${API_URL}/api/organizer/exams`,
                submissionData,
                { headers: { Authorization: `Bearer ${token}` } }
            )

            setNotification({ message: 'Exam created successfully!', type: 'success' })
            setShowCreate(false)
            setFormData({ code: '', title: '', description: '', startTime: '', endTime: '' })
            onRefresh()
        } catch (error) {
            setNotification({ message: error.response?.data?.error || 'Failed to create exam', type: 'error' })
        }
    }

    const handleUpdateExam = async (e) => {
        e.preventDefault()

        try {
            const token = localStorage.getItem('organizerToken')
            const submissionData = {
                ...formData,
                startTime: toUTC(formData.startTime),
                endTime: toUTC(formData.endTime)
            };
            await axios.put(
                `${API_URL}/api/organizer/exams/${editExam.id}`,
                submissionData,
                { headers: { Authorization: `Bearer ${token}` } }
            )

            setNotification({ message: 'Exam updated successfully!', type: 'success' })
            setEditExam(null)
            setFormData({ code: '', title: '', description: '', startTime: '', endTime: '' })
            onRefresh()
        } catch (error) {
            setNotification({ message: error.response?.data?.error || 'Failed to update exam', type: 'error' })
        }
    }

    const handleDeleteExam = async (examId) => {
        setConfirmation({
            message: 'Are you sure you want to delete this exam? This will also delete all participants and their submissions for this exam.',
            confirmText: 'Delete Exam',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem('organizerToken')
                    await axios.delete(
                        `${API_URL}/api/organizer/exams/${examId}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    )

                    setNotification({ message: 'Exam deleted successfully!', type: 'success' })
                    onRefresh()
                } catch (error) {
                    setNotification({ message: error.response?.data?.error || 'Failed to delete exam', type: 'error' })
                }
            }
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Exams</h2>
                <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary">
                    {showCreate ? 'Cancel' : '+ Create Exam'}
                </button>
            </div>

            {(showCreate || editExam) && (
                <div className="card animate-slide-up">
                    <h3 className="text-xl font-bold mb-4">{editExam ? 'Edit Exam' : 'Create New Exam'}</h3>
                    <form onSubmit={editExam ? handleUpdateExam : handleCreateExam} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Exam Code</label>
                            <input
                                type="text"
                                required
                                className="input"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="EXAM001"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Title</label>
                            <input
                                type="text"
                                required
                                className="input"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Data Structures Exam"
                            />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Start Time (Optional)</label>
                                <input
                                    type="datetime-local"
                                    className="input"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                />
                                {formData.startTime && (
                                    <p className="text-xs text-primary-400 mt-1">
                                        Preview: {(() => {
                                            const d = new Date(formData.startTime);
                                            return isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
                                        })()}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">End Time (Optional)</label>
                                <input
                                    type="datetime-local"
                                    className="input"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                />
                                {formData.endTime && (
                                    <p className="text-xs text-primary-400 mt-1">
                                        Preview: {(() => {
                                            const d = new Date(formData.endTime);
                                            return isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
                                        })()}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                            <textarea
                                className="textarea"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-4">
                            <button type="submit" className="btn btn-primary flex-1">
                                {editExam ? 'Update Exam' : 'Create Exam'}
                            </button>
                            {editExam && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditExam(null)
                                        setFormData({ code: '', title: '', description: '', startTime: '', endTime: '' })
                                    }}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            <div className="grid gap-4">
                {exams.map((exam) => {
                    // Calculate exam status
                    const now = new Date()
                    let startTime = null;
                    try {
                        if (exam.startTime) {
                            const d = new Date(exam.startTime);
                            if (!isNaN(d.getTime())) startTime = d;
                        }
                    } catch (e) { }

                    let endTime = null;
                    try {
                        if (exam.endTime) {
                            const d = new Date(exam.endTime);
                            if (!isNaN(d.getTime())) endTime = d;
                        }
                    } catch (e) { }

                    let status = 'No Time Limit'
                    let statusColor = 'bg-gray-500/20 text-gray-400'

                    const nowTime = now.getTime();
                    const startTimestamp = startTime ? startTime.getTime() : null;
                    const endTimestamp = endTime ? endTime.getTime() : null;

                    if (startTimestamp && endTimestamp) {
                        if (nowTime < startTimestamp) {
                            status = 'Upcoming'
                            statusColor = 'bg-blue-500/20 text-blue-400'
                        } else if (nowTime >= startTimestamp && nowTime <= endTimestamp) {
                            status = 'Live'
                            statusColor = 'bg-green-500/20 text-green-400'
                        } else {
                            status = 'Ended'
                            statusColor = 'bg-red-500/20 text-red-400'
                        }
                    } else {
                        if (startTimestamp && nowTime < startTimestamp) {
                            status = 'Upcoming'
                            statusColor = 'bg-blue-500/20 text-blue-400'
                        } else if (endTimestamp && nowTime > endTimestamp) {
                            status = 'Ended'
                            statusColor = 'bg-red-500/20 text-red-400'
                        } else if (startTimestamp || endTimestamp) {
                            status = 'Live'
                            statusColor = 'bg-green-500/20 text-green-400'
                        }
                    }

                    return (
                        <div key={exam.id} className="card">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center space-x-3 mb-2">
                                        <h3 className="text-xl font-bold">{exam.title}</h3>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
                                            {status}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 mt-1">{exam.description}</p>
                                    {(startTime || endTime) && (
                                        <div className="text-sm text-gray-400 mt-2">
                                            {startTime && <div>📅 Starts: {startTime.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>}
                                            {endTime && <div>⏰ Ends: {endTime.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>}
                                        </div>
                                    )}
                                    <div className="flex items-center space-x-4 mt-3">
                                        <span className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full text-sm font-medium">
                                            Code: {exam.code}
                                        </span>
                                        <span className="text-sm text-gray-400">
                                            {exam.participants?.length || 0} Participants
                                        </span>
                                        <span className="text-sm text-green-400 font-medium">
                                            {exam.completedCount || 0} Completed
                                        </span>
                                        <span className="text-sm text-gray-400">
                                            {exam.questions?.length || 0} Questions
                                        </span>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => {
                                            setEditExam(exam)
                                            setFormData({
                                                code: exam.code,
                                                title: exam.title,
                                                description: exam.description || '',
                                                startTime: toLocalISO(exam.startTime),
                                                endTime: toLocalISO(exam.endTime)
                                            })
                                            setShowCreate(false)
                                        }}
                                        className="btn bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteExam(exam.id)}
                                        className="btn btn-danger"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function SubmissionsTab({ submissions, setNotification, setConfirmation }) {
    const [deleting, setDeleting] = useState(null)

    // Group submissions by participant and exam
    const grouped = submissions.reduce((acc, sub) => {
        const examId = sub.question?.examId
        const examTitle = sub.question?.exam?.title || 'Unknown Exam'
        const key = `${sub.participant?.id}-${examId}`
        if (!acc[key]) {
            acc[key] = {
                participantId: sub.participant?.id,
                teamName: sub.participant?.participantId,
                collegeName: sub.participant?.collegeName,
                examId: examId,
                examTitle: examTitle,
                submissions: []
            }
        }
        acc[key].submissions.push(sub)
        return acc
    }, {})

    const participantGroups = Object.values(grouped)

    const handleDeleteSubmissions = async (participantId, examId, teamName, examTitle) => {
        setConfirmation({
            message: `Enter your organizer password to delete all submissions for Team "${teamName}" in "${examTitle}".`,
            confirmText: 'Delete Submissions',
            isDangerous: true,
            showInput: true,
            inputType: 'password',
            inputPlaceholder: 'Organizer password',
            onConfirm: async (password) => {
                setDeleting(`${participantId}-${examId}`)

                try {
                    const token = localStorage.getItem('organizerToken')
                    await axios.delete(
                        `${API_URL}/api/organizer/submissions/${participantId}/${examId}`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                            data: { password }
                        }
                    )

                    setNotification({ message: 'Submissions deleted successfully! Participant can now retake the exam.', type: 'success' })
                    // Small delay to allow user to see success before refresh
                    setTimeout(() => window.location.reload(), 1500)
                } catch (error) {
                    console.error('Delete error:', error)
                    setNotification({ message: error.response?.data?.error || 'Failed to delete submissions', type: 'error' })
                    setDeleting(null)
                }
            }
        })
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Submissions</h2>

            {participantGroups.length === 0 ? (
                <div className="card text-center text-gray-400 py-8">
                    No submissions yet
                </div>
            ) : (
                <div className="grid gap-6">
                    {participantGroups.map((group) => {
                        const key = `${group.participantId}-${group.examId}`
                        const totalMarksEarned = group.submissions.reduce((sum, sub) => sum + sub.score, 0)
                        const totalMarksPossible = group.submissions.reduce((sum, sub) => sum + (sub.question?.maxMarks || 100), 0)
                        const percentageScore = (totalMarksEarned / totalMarksPossible) * 100
                        const totalTests = group.submissions.reduce((sum, sub) => sum + sub.passedTests, 0)
                        const maxTests = group.submissions.reduce((sum, sub) => sum + sub.totalTests, 0)

                        return (
                            <div key={key} className="card">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4 pb-4 border-b border-border">
                                    <div>
                                        <h3 className="text-xl font-bold">{group.teamName}</h3>
                                        <p className="text-sm text-gray-400">College: {group.collegeName || 'N/A'}</p>
                                        <p className="text-sm text-gray-400">Exam: {group.examTitle}</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            {group.submissions.length} submission{group.submissions.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-3xl font-bold mb-1 ${percentageScore >= 70 ? 'text-green-400' :
                                            percentageScore >= 40 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                            {totalMarksEarned.toFixed(1)} / {totalMarksPossible}
                                        </div>
                                        <div className="text-sm text-gray-400 mb-3">
                                            {totalTests}/{maxTests} tests ({percentageScore.toFixed(0)}%)
                                        </div>
                                        <button
                                            onClick={() => handleDeleteSubmissions(
                                                group.participantId,
                                                group.examId,
                                                group.teamName,
                                                group.examTitle
                                            )}
                                            disabled={deleting === key}
                                            className="btn bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1"
                                        >
                                            {deleting === key ? 'Deleting...' : '🗑️ Delete All'}
                                        </button>
                                    </div>
                                </div>

                                {/* Individual Submissions */}
                                <div className="space-y-3">
                                    {group.submissions.map((sub) => (
                                        <div key={sub.id} className="bg-card border border-border rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-sm">{sub.question?.title}</h4>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-lg font-bold ${(sub.score / (sub.question?.maxMarks || 100) * 100) >= 70 ? 'text-green-400' :
                                                        (sub.score / (sub.question?.maxMarks || 100) * 100) >= 40 ? 'text-yellow-400' : 'text-red-400'
                                                        }`}>
                                                        {sub.score.toFixed(1)} / {sub.question?.maxMarks || 100}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {sub.passedTests}/{sub.totalTests} tests ({((sub.passedTests / sub.totalTests) * 100).toFixed(0)}%)
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-gray-400">
                                                <span className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded">
                                                    {sub.language}
                                                </span>
                                                <span>
                                                    {sub.executionTime ? `${sub.executionTime.toFixed(2)}ms` : 'N/A'}
                                                </span>
                                                <span>
                                                    {(() => {
                                                        const d = new Date(sub.createdAt);
                                                        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function LeaderboardTab({ exams, setNotification }) {
    const [selectedExamId, setSelectedExamId] = useState('')
    const [leaderboard, setLeaderboard] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedParticipant, setSelectedParticipant] = useState(null)
    const [participantSubmissions, setParticipantSubmissions] = useState([])
    const [loadingSubmissions, setLoadingSubmissions] = useState(false)

    useEffect(() => {
        if (selectedExamId) {
            fetchLeaderboard()
        } else {
            setLeaderboard([])
        }
    }, [selectedExamId])

    const fetchLeaderboard = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('organizerToken')
            const response = await axios.get(
                `${API_URL}/api/organizer/leaderboard/${selectedExamId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setLeaderboard(response.data.leaderboard)
        } catch (error) {
            setNotification({ message: 'Failed to fetch leaderboard', type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    const handleViewParticipant = async (participant) => {
        setSelectedParticipant(participant)
        setLoadingSubmissions(true)
        try {
            const token = localStorage.getItem('organizerToken')
            // Using existing submissions endpoint but filtering locally for simpler UI
            const response = await axios.get(`${API_URL}/api/organizer/submissions`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            const filtered = response.data.submissions.filter(s =>
                s.participantId === participant.id &&
                s.question?.examId === parseInt(selectedExamId)
            )
            setParticipantSubmissions(filtered)
        } catch (error) {
            setNotification({ message: 'Failed to fetch participant submissions', type: 'error' })
        } finally {
            setLoadingSubmissions(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Exam Leaderboard</h2>
                <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium">Select Exam:</label>
                    <select
                        className="input min-w-[200px]"
                        value={selectedExamId}
                        onChange={(e) => setSelectedExamId(e.target.value)}
                    >
                        <option value="">-- Select Exam --</option>
                        {exams.map((exam) => (
                            <option key={exam.id} value={exam.id}>{exam.title}</option>
                        ))}
                    </select>
                    <button
                        onClick={fetchLeaderboard}
                        disabled={!selectedExamId || loading}
                        className="btn btn-secondary"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {selectedExamId ? (
                loading ? (
                    <div className="p-12 text-center text-gray-400">Loading rankings...</div>
                ) : leaderboard.length > 0 ? (
                    <div className="card overflow-hidden !p-0">
                        <table className="w-full text-left">
                            <thead className="bg-background/50 border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-sm">Rank</th>
                                    <th className="px-6 py-4 font-bold text-sm">Team Name</th>
                                    <th className="px-6 py-4 font-bold text-sm">College</th>
                                    <th className="px-6 py-4 font-bold text-sm text-center">Score</th>
                                    <th className="px-6 py-4 font-bold text-sm text-center">Tests</th>
                                    <th className="px-6 py-4 font-bold text-sm text-center">Subs</th>
                                    <th className="px-6 py-4 font-bold text-sm">Last Active</th>
                                    <th className="px-6 py-4 font-bold text-sm text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {leaderboard.map((entry, idx) => (
                                    <tr key={entry.id} className="hover:bg-card-hover transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                {idx === 0 && <span className="text-yellow-400 mr-2 text-xl">🥇</span>}
                                                {idx === 1 && <span className="text-gray-300 mr-2 text-xl">🥈</span>}
                                                {idx === 2 && <span className="text-orange-400 mr-2 text-xl">🥉</span>}
                                                <span className={`font-bold ${idx < 3 ? 'text-lg' : 'text-gray-400'}`}>#{idx + 1}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-bold">{entry.participantId}</div>
                                                <div className="text-xs text-gray-400">{entry.collegeName || 'N/A'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-primary-400 font-bold">{entry.totalScore}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs text-gray-400">
                                                {entry.totalPassedTests} / {entry.totalTests}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs bg-card px-2 py-1 rounded-full border border-border">
                                                {entry.submissionCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-400">
                                            {(() => {
                                                if (!entry.lastSubmissionTime) return 'N/A';
                                                const d = new Date(entry.lastSubmissionTime);
                                                return isNaN(d.getTime()) ? 'N/A' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleViewParticipant(entry)}
                                                className="btn btn-secondary !py-1 !px-3 text-xs"
                                            >
                                                View Code
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="card p-12 text-center text-gray-400">
                        No participants or submissions found for this exam.
                    </div>
                )
            ) : (
                <div className="card p-12 text-center text-gray-400">
                    <p className="text-lg mb-2">Please select an exam to view the leaderboard</p>
                    <p className="text-sm">Rankings are calculated based on total score and submission time.</p>
                </div>
            )}

            {/* Participant Detail Modal */}
            {selectedParticipant && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-card-hover">
                            <div>
                                <h3 className="text-xl font-bold">Team "{selectedParticipant.participantId}" Submissions</h3>
                                <p className="text-sm text-gray-400">College: {selectedParticipant.collegeName || 'N/A'} • Total Score: {selectedParticipant.totalScore}</p>
                            </div>
                            <button
                                onClick={() => setSelectedParticipant(null)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {loadingSubmissions ? (
                                <div className="text-center py-12 text-gray-400">Loading code...</div>
                            ) : participantSubmissions.length > 0 ? (
                                participantSubmissions.map((sub, idx) => (
                                    <div key={sub.id} className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-bold text-primary-400">
                                                {sub.question.title}
                                            </h4>
                                            <div className="flex items-center space-x-3 text-xs">
                                                <span className="bg-background px-2 py-1 rounded text-gray-400">
                                                    {sub.language}
                                                </span>
                                                <span className={`${sub.status === 'COMPLETED' ? 'text-green-400' : 'text-yellow-400'}`}>
                                                    Score: {sub.score} / {sub.question.maxMarks}
                                                </span>
                                                <span className="text-gray-500">
                                                    {(() => {
                                                        const d = new Date(sub.createdAt);
                                                        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="relative group">
                                            <pre className="bg-background/50 border border-border rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-[300px]">
                                                <code>{sub.code}</code>
                                            </pre>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(sub.code)
                                                    setNotification({ message: 'Code copied to clipboard!', type: 'success' })
                                                }}
                                                className="absolute top-2 right-2 p-2 bg-card border border-border rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-gray-400">No submissions found.</div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border bg-background/50 flex justify-end">
                            <button
                                onClick={() => setSelectedParticipant(null)}
                                className="btn btn-secondary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function VisitorsTab({ exams, setNotification, setConfirmation }) {
    const [visitors, setVisitors] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedExamId, setSelectedExamId] = useState('all')

    const fetchVisitors = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('organizerToken')
            const response = await axios.get(`${API_URL}/api/organizer/visitors`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setVisitors(response.data.visitors || [])
        } catch (error) {
            const errorMsg = error.response?.data?.details || error.response?.data?.error || error.message
            setNotification({ message: `Failed to fetch visitors: ${errorMsg}`, type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchVisitors()
    }, [])

    const handleRemoveParticipant = (visitor) => {
        setConfirmation({
            message: `Are you sure you want to remove team "${visitor.teamName}" from "${visitor.examTitle}"? This will delete all their code and progress for this level.`,
            confirmText: 'Remove Participant',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem('organizerToken')
                    await axios.delete(
                        `${API_URL}/api/organizer/exams/${visitor.examId}/participants/${visitor.participantId}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    )
                    setNotification({ message: 'Participant removed successfully', type: 'success' })
                    fetchVisitors()
                } catch (error) {
                    setNotification({ message: error.response?.data?.error || 'Removal failed', type: 'error' })
                }
            }
        })
    }

    const filteredVisitors = selectedExamId === 'all'
        ? visitors
        : visitors.filter(v => v.examId === parseInt(selectedExamId))

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Exam Visitors & Reset</h2>
                <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-400">Filter Exam:</label>
                    <select
                        className="input min-w-[200px]"
                        value={selectedExamId}
                        onChange={(e) => setSelectedExamId(e.target.value)}
                    >
                        <option value="all">All Exams</option>
                        {exams.map(exam => (
                            <option key={exam.id} value={exam.id}>{exam.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center text-gray-400">Loading visitors...</div>
            ) : filteredVisitors.length > 0 ? (
                <div className="card overflow-hidden !p-0">
                    <table className="w-full text-left">
                        <thead className="bg-background/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-bold text-sm">Team Name</th>
                                <th className="px-6 py-4 font-bold text-sm">Exam Level</th>
                                <th className="px-6 py-4 font-bold text-sm text-center">Status</th>
                                <th className="px-6 py-4 font-bold text-sm text-center">Subs</th>
                                <th className="px-6 py-4 font-bold text-sm text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredVisitors.map((v) => (
                                <tr key={`${v.participantId}-${v.examId}`} className="hover:bg-card-hover transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold">{v.teamName}</div>
                                        <div className="text-xs text-gray-500">{v.collegeName || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-300">{v.examTitle}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${v.submissionsCount > 0
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                            }`}>
                                            {v.submissionsCount > 0 ? 'Active' : 'Visitor'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm font-mono text-gray-400">
                                        {v.submissionsCount}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleRemoveParticipant(v)}
                                            className="px-3 py-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded text-xs transition-all"
                                        >
                                            {v.submissionsCount > 0 ? 'Reset Attempt' : 'Remove Visitor'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card p-12 text-center text-gray-400 italic">
                    No visitors found.
                </div>
            )}
        </div>
    )
}
