'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Toast from '../../../components/Toast'
import ConfirmDialog from '../../../components/ConfirmDialog'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function VisitorsPage() {
    const router = useRouter()
    const [visitors, setVisitors] = useState([])
    const [loading, setLoading] = useState(true)
    const [notification, setNotification] = useState(null)
    const [confirmation, setConfirmation] = useState(null)
    const [selectedExamId, setSelectedExamId] = useState('all')
    const [exams, setExams] = useState([])

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('organizerToken')
            if (!token) {
                router.push('/organizer/login')
                return
            }
            const config = { headers: { Authorization: `Bearer ${token}` } }

            const [visitorsRes, examsRes] = await Promise.all([
                axios.get(`${API_URL}/api/organizer/visitors`, config),
                axios.get(`${API_URL}/api/organizer/exams`, config)
            ])

            setVisitors(visitorsRes.data.visitors || [])
            setExams(examsRes.data.exams || [])
            setLoading(false)
        } catch (error) {
            console.error('Fetch error:', error)
            setNotification({ message: 'Failed to fetch data', type: 'error' })
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleRemoveParticipant = (visitor) => {
        setConfirmation({
            message: `Are you sure you want to remove team "${visitor.teamName}" from "${visitor.examTitle}"? This will delete all their submissions and progress for this level. They will be able to join again as a new visitor.`,
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
                    fetchData()
                } catch (error) {
                    setNotification({ message: error.response?.data?.error || 'Removal failed', type: 'error' })
                }
            }
        })
    }

    const filteredVisitors = selectedExamId === 'all'
        ? visitors
        : visitors.filter(v => v.examId === parseInt(selectedExamId))

    // Grouping by "Pure Visitors" (0 submissions) vs "Active"
    const pureVisitors = filteredVisitors.filter(v => v.submissionsCount === 0)
    const activeParticipants = filteredVisitors.filter(v => v.submissionsCount > 0)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-2xl gradient-text animate-pulse">Loading Visitors...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-8">
            <div className="container-custom">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold gradient-text mb-2">Exam Visitors</h1>
                        <p className="text-gray-400">Track participants who have joined levels but not yet submitted</p>
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

                <div className="space-y-12">
                    {/* Visitors Table */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-yellow-500 flex items-center">
                                <span className="mr-2">👀</span> Pure Visitors (Joined, No Submissions)
                            </h2>
                            <span className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-sm font-medium border border-yellow-500/20">
                                {pureVisitors.length} Teams
                            </span>
                        </div>
                        <div className="card overflow-hidden !p-0">
                            <table className="w-full text-left">
                                <thead className="bg-gray-800/50 border-b border-border">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-sm">Team Name</th>
                                        <th className="px-6 py-4 font-bold text-sm">College</th>
                                        <th className="px-6 py-4 font-bold text-sm">Exam Level</th>
                                        <th className="px-6 py-4 font-bold text-sm">Assigned Question</th>
                                        <th className="px-6 py-4 font-bold text-sm">First Joined</th>
                                        <th className="px-6 py-4 font-bold text-sm text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {pureVisitors.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-500 italic">
                                                No pure visitors found for the selected filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        pureVisitors.map((v) => (
                                            <tr key={`${v.participantId}-${v.examId}`} className="hover:bg-gray-800/30 transition-colors">
                                                <td className="px-6 py-4 font-semibold text-white">{v.teamName}</td>
                                                <td className="px-6 py-4 text-gray-400 text-sm">{v.collegeName || 'N/A'}</td>
                                                <td className="px-6 py-4 text-gray-300 text-sm">{v.examTitle}</td>
                                                <td className="px-6 py-4 text-gray-400 text-xs italic">{v.assignedQuestionTitle}</td>
                                                <td className="px-6 py-4 text-gray-500 text-xs">
                                                    {new Date(v.joinedAt).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleRemoveParticipant(v)}
                                                        className="btn bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-red-500 !py-1 !px-3 text-xs transition-all"
                                                    >
                                                        Remove User ID
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Active Participants Table (Included for completeness and removal capability) */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-green-500 flex items-center">
                                <span className="mr-2">🚀</span> Active Participants (With Submissions)
                            </h2>
                            <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-sm font-medium border border-green-500/20">
                                {activeParticipants.length} Teams
                            </span>
                        </div>
                        <div className="card overflow-hidden !p-0">
                            <table className="w-full text-left">
                                <thead className="bg-gray-800/50 border-b border-border">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-sm">Team Name</th>
                                        <th className="px-6 py-4 font-bold text-sm">Exam Level</th>
                                        <th className="px-6 py-4 font-bold text-sm text-center">Submissions</th>
                                        <th className="px-6 py-4 font-bold text-sm text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {activeParticipants.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-500 italic">
                                                No active participants found for the selected filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        activeParticipants.map((v) => (
                                            <tr key={`${v.participantId}-${v.examId}`} className="hover:bg-gray-800/30 transition-colors">
                                                <td className="px-6 py-4 font-semibold text-white">{v.teamName}</td>
                                                <td className="px-6 py-4 text-gray-300 text-sm">{v.examTitle}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold border border-green-500/30">
                                                        {v.submissionsCount}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleRemoveParticipant(v)}
                                                        className="btn bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-red-500 !py-1 !px-3 text-xs"
                                                    >
                                                        Reset Attempt
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>

            {/* Notification */}
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
                    onConfirm={() => {
                        confirmation.onConfirm && confirmation.onConfirm()
                        setConfirmation(null)
                    }}
                    onCancel={() => setConfirmation(null)}
                />
            )}
        </div>
    )
}
