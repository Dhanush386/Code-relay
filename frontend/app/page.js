'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Home() {
    const router = useRouter()

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: 'url(/25336.jpg)' }}
                ></div>
                {/* Dark overlay for better text readability */}
                <div className="absolute inset-0 bg-black/60"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-4xl w-full animate-fade-in">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-6xl font-bold mb-4">
                        <span className="gradient-text">CodeExam</span>
                    </h1>
                    <p className="text-xl text-white font-semibold">
                        Secure Online Coding Examination Platform
                    </p>
                </div>

                {/* Feature Cards */}
                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    {/* Organizer Card */}
                    <div className="card group hover:scale-105 cursor-pointer" onClick={() => router.push('/organizer/login')}>
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-primary-500/20 rounded-full flex items-center justify-center group-hover:bg-primary-500/30 transition-all">
                                <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Organizer</h2>
                            <p className="text-gray-400 mb-6">
                                Create and manage coding questions, testcases, and evaluate submissions
                            </p>
                            <div className="btn btn-primary w-full">
                                Login as Organizer
                            </div>
                        </div>
                    </div>

                    {/* Participant Card */}
                    <div className="card group hover:scale-105 cursor-pointer" onClick={() => router.push('/participant/login')}>
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center group-hover:bg-green-500/30 transition-all">
                                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Participant</h2>
                            <p className="text-gray-400 mb-6">
                                Write, test, and submit code solutions for examination questions
                            </p>
                            <div className="btn bg-green-600 hover:bg-green-700 text-white w-full">
                                Login as Participant
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
