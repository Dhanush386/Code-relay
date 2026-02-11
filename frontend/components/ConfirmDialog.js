'use client'

import { useState } from 'react'

export default function ConfirmDialog({ message, onConfirm, onCancel, confirmText = 'Submit', isDangerous = false, showInput = false, inputType = 'text', inputPlaceholder = '' }) {
    const [inputValue, setInputValue] = useState('')

    const handleConfirm = () => {
        if (showInput) {
            onConfirm(inputValue)
        } else {
            onConfirm()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" onClick={onCancel}></div>

            {/* Dialog */}
            <div className={`relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-slide-up border-2 ${isDangerous ? 'border-red-500' : 'border-blue-500'}`}>
                <div className="text-center">
                    <div className="text-4xl mb-3">{isDangerous ? '⚠️' : 'ℹ️'}</div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                        {message}
                    </h3>

                    {showInput && (
                        <div className="mb-4">
                            <input
                                type={inputType}
                                placeholder={inputPlaceholder}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none"
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="flex gap-3 mt-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-all shadow-lg ${isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
