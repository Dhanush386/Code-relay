'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function OrganizerSubmissions() {
    const router = useRouter()
    const [submissions, setSubmissions] = useState([])
    const [exams, setExams] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedExamId, setSelectedExamId] = useState('all')

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('organizerToken')
                if (!token) {
                    router.push('/organizer/login')
                    return
                }

                const config = { headers: { Authorization: `Bearer ${token}` } }

                const [submissionsRes, examsRes] = await Promise.all([
                    axios.get(`${API_URL}/api/organizer/submissions`, config),
                    axios.get(`${API_URL}/api/organizer/exams`, config)
                ])

                setSubmissions(submissionsRes.data.submissions || [])
                setExams(examsRes.data.exams || [])
                setLoading(false)
            } catch (error) {
                console.error('Fetch error:', error)
                setLoading(false)
            }
        }

        fetchData()
    }, [router])

    // Process data for leaderboard
    const getLeaderboardData = () => {
        // Filter submissions by exam if selected
        const filteredSubmissions = selectedExamId === 'all'
            ? submissions
            : submissions.filter(s => s.participant?.examId === parseInt(selectedExamId))

        // Group by participant
        const participantScores = {}

        filteredSubmissions.forEach(sub => {
            // Uniquely identify participant by ID (and exam for safety, though participant ID should be unique)
            const participantKey = sub.participantId

            if (!participantScores[participantKey]) {
                participantScores[participantKey] = {
                    id: sub.participantId,
                    teamName: sub.participant?.participantId || 'Unknown',
                    collegeName: sub.participant?.collegeName || 'N/A',
                    examTitle: sub.participant?.exam?.title,
                    totalScore: 0,
                    maxScore: 0,
                    problemsSolved: 0,
                    lastSubmissionTime: new Date(0), // For tie-breaking
                    submissions: []
                }
            }

            // Add score
            participantScores[participantKey].totalScore += sub.score
            participantScores[participantKey].maxScore += (sub.question?.maxMarks || 100)
            if (sub.passedTests === sub.totalTests && sub.totalTests > 0) {
                participantScores[participantKey].problemsSolved += 1
            }

            // Track latest submission time
            const subTime = new Date(sub.createdAt)
            if (subTime > participantScores[participantKey].lastSubmissionTime) {
                participantScores[participantKey].lastSubmissionTime = subTime
            }

            participantScores[participantKey].submissions.push(sub)
        })

        // Convert to array and sort
        return Object.values(participantScores).sort((a, b) => {
            // Primary sort: Total Score (Descending)
            if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
            // Secondary sort: Submission Time (Ascending) - earlier is better
            return a.lastSubmissionTime - b.lastSubmissionTime
        })
    }

    const leaderboard = getLeaderboardData()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-2xl gradient-text animate-pulse">Loading Leaderboard...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-8">
            <div className="container-custom">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold gradient-text mb-2">Leaderboard</h1>
                        <p className="text-gray-400">Real-time rankings and submission stats</p>
                    </div>
                    <button
                        onClick={() => router.push('/organizer/dashboard')}
                        className="btn btn-secondary"
                    >
                        Back to Dashboard
                    </button>
                </div>

                {/* Filter */}
                <div className="card mb-8">
                    <div className="flex items-center space-x-4">
                        <label className="font-medium text-gray-300">Filter by Exam:</label>
                        <select
                            className="input max-w-xs"
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

                {/* Leaderboard Table */}
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-gray-800/50">
                                    <th className="p-4 font-semibold text-gray-300">Rank</th>
                                    <th className="p-4 font-semibold text-gray-300">Team Name</th>
                                    <th className="p-4 font-semibold text-gray-300">College</th>
                                    <th className="p-4 font-semibold text-gray-300">Exam</th>
                                    <th className="p-4 font-semibold text-gray-300 text-center">Solved</th>
                                    <th className="p-4 font-semibold text-gray-300 text-right">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-gray-400">
                                            No submissions found.
                                        </td>
                                    </tr>
                                ) : (
                                    leaderboard.map((entry, index) => (
                                        <tr
                                            key={entry.id}
                                            className={`border-b border-border hover:bg-gray-800/30 transition-colors ${index === 0 ? 'bg-yellow-500/10' :
                                                index === 1 ? 'bg-gray-400/10' :
                                                    index === 2 ? 'bg-orange-600/10' : ''
                                                }`}
                                        >
                                            <td className="p-4">
                                                <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${index === 0 ? 'bg-yellow-500 text-black' :
                                                    index === 1 ? 'bg-gray-400 text-black' :
                                                        index === 2 ? 'bg-orange-600 text-white' :
                                                            'bg-gray-700 text-gray-300'
                                                    }`}>
                                                    {index + 1}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-semibold text-white">{entry.teamName}</div>
                                            </td>
                                            <td className="p-4 text-gray-300">{entry.collegeName}</td>
                                            <td className="p-4 text-gray-300">{entry.examTitle}</td>
                                            <td className="p-4 text-center">
                                                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                                                    {entry.problemsSolved}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="font-bold text-lg gradient-text">
                                                    {entry.totalScore.toFixed(0)}
                                                    <span className="text-xs text-gray-500 font-normal ml-1">/ {entry.maxScore}</span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {(entry.totalScore / entry.maxScore * 100).toFixed(1)}%
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
