'use client'

export default function Toast({ message, type = 'info', onClose }) {
    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return 'bg-green-600 border-green-500'
            case 'error':
                return 'bg-red-600 border-red-500'
            case 'warning':
                return 'bg-yellow-600 border-yellow-500'
            default:
                return 'bg-blue-600 border-blue-500'
        }
    }

    const getIcon = () => {
        switch (type) {
            case 'success':
                return '✓'
            case 'error':
                return '✕'
            case 'warning':
                return '⚠'
            default:
                return 'ℹ'
        }
    }

    return (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-slide-up">
            <div className={`${getTypeStyles()} border-2 text-white rounded-2xl shadow-2xl px-8 py-6 min-w-[400px] max-w-2xl`}>
                <div className="text-center">
                    <div className="text-4xl font-bold mb-4">
                        {getIcon()}
                    </div>
                    <div className="text-lg font-medium mb-6">
                        {message}
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-white text-gray-900 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-all shadow-md"
                    >
                        OK
                    </button>
                </div>
            </div>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 -z-10" onClick={onClose}></div>
        </div>
    )
}
