import { useState, useEffect, useRef } from 'react'

export default function ResizableLayout({ left, right, initialLeftWidth = 33 }) {
    const [leftWidth, setLeftWidth] = useState(initialLeftWidth)
    const [isResizing, setIsResizing] = useState(false)
    const containerRef = useRef(null)

    const startResizing = (e) => {
        e.preventDefault()
        setIsResizing(true)
    }

    const stopResizing = () => {
        setIsResizing(false)
    }

    const resize = (e) => {
        if (isResizing && containerRef.current) {
            const containerWidth = containerRef.current.getBoundingClientRect().width
            // Calculate new width relative to container
            // We use e.clientX which is viewport based, so we need container's left offset
            const containerLeft = containerRef.current.getBoundingClientRect().left
            const newLeftWidth = ((e.clientX - containerLeft) / containerWidth) * 100

            // Limit the width between 20% and 80%
            if (newLeftWidth >= 20 && newLeftWidth <= 80) {
                setLeftWidth(newLeftWidth)
            }
        }
    }

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize)
            window.addEventListener('mouseup', stopResizing)
        } else {
            window.removeEventListener('mousemove', resize)
            window.removeEventListener('mouseup', stopResizing)
        }

        return () => {
            window.removeEventListener('mousemove', resize)
            window.removeEventListener('mouseup', stopResizing)
        }
    }, [isResizing])

    return (
        <div
            ref={containerRef}
            className="flex-1 flex h-full select-none"
            style={{ minHeight: 0 }}
        >
            {/* Left Panel */}
            <div style={{ width: `${leftWidth}%` }} className="h-full overflow-y-auto pr-2">
                {left}
            </div>

            {/* Resizer Handle */}
            <div
                className="w-4 flex flex-col justify-center items-center cursor-col-resize hover:bg-primary-500/20 active:bg-primary-500/40 transition-colors group"
                onMouseDown={startResizing}
            >
                {/* Visual indicator for the handle */}
                <div className="w-1 h-8 bg-gray-300 rounded group-hover:bg-primary-500 transition-colors"></div>
            </div>

            {/* Right Panel */}
            <div style={{ width: `${100 - leftWidth}%` }} className="h-full overflow-y-auto pl-2">
                {right}
            </div>
        </div>
    )
}
