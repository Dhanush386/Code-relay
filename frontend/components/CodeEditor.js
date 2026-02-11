'use client'

import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(
    () => import('@monaco-editor/react').then((mod) => mod.default),
    { ssr: false }
)

export default function CodeEditor({ language, value, onChange }) {
    const getEditorLanguage = (lang) => {
        switch (lang) {
            case 'C':
            case 'C++':
                return 'cpp'
            case 'Python':
                return 'python'
            default:
                return 'python'
        }
    }

    return (
        <div className="border border-border rounded-lg overflow-hidden h-full">
            <MonacoEditor
                height="100%"
                language={getEditorLanguage(language)}
                value={value}
                onChange={onChange}
                theme="vs-dark"
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    wordWrap: 'on'
                }}
                onMount={(editor) => {
                    const domNode = editor.getContainerDomNode();

                    // Block Paste Event
                    domNode.addEventListener('paste', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }, true);

                    // Block Ctrl+V / Cmd+V Keyboard Shortcuts
                    editor.onKeyDown((e) => {
                        const { keyCode, ctrlKey, metaKey } = e;
                        if ((ctrlKey || metaKey) && keyCode === 52) { // 52 is KeyV
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    });
                }}
            />
        </div>
    )
}
