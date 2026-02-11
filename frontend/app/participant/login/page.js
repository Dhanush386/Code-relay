'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function ParticipantLogin() {
    const router = useRouter()
    const [isRegister, setIsRegister] = useState(false)
    const [formData, setFormData] = useState({
        participantId: '',
        collegeName: ''
    })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const endpoint = isRegister ? '/api/participant/register' : '/api/participant/login'
            const submissionData = {
                participantId: formData.participantId.trim(),
                collegeName: isRegister ? formData.collegeName.trim() : undefined
            }
            const response = await axios.post(`${API_URL}${endpoint}`, submissionData)

            if (response.data.token) {
                localStorage.setItem('participantToken', response.data.token)
                localStorage.setItem('participantData', JSON.stringify(response.data.participant))
                router.push('/participant/dashboard')
            }
        } catch (error) {
            alert(error.response?.data?.error || 'Authentication failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <div className="max-w-md w-full">
                <div className="text-center mb-8 animate-fade-in">
                    <h1 className="text-4xl font-bold gradient-text mb-2">Code Relay</h1>
                    <p className="text-gray-600">
                        {isRegister ? 'Register your team' : 'Log in to your team'}
                    </p>
                </div>

                <div className="card animate-slide-up shadow-xl border-t-4 border-primary-500 bg-white p-8 rounded-xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Team Name</label>
                            <input
                                type="text"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                value={formData.participantId}
                                onChange={(e) => setFormData({ ...formData, participantId: e.target.value })}
                                placeholder="Enter your team name"
                                required
                            />
                        </div>

                        {isRegister && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-semibold mb-2 text-gray-700">College Name</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    value={formData.collegeName}
                                    onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                                    placeholder="Enter your college name"
                                    required
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-lg transition-all"
                        >
                            {loading ? 'Processing...' : (isRegister ? 'Register & Join' : 'Log In')}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsRegister(!isRegister)}
                            className="text-primary-600 hover:text-primary-700 font-semibold"
                        >
                            {isRegister ? 'Already registered? Log in' : 'New team? Register here'}
                        </button>
                    </div>
                </div>

                <div className="mt-4 text-center">
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-500 hover:text-gray-400 transition-colors text-sm"
                    >
                        ← Back to Home
                    </button>
                </div>
            </div>
        </div>
    )
}
