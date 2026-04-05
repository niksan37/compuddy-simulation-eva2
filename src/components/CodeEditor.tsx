'use client';
import { Editor, OnMount } from '@monaco-editor/react';
import { useRef, useEffect } from 'react';
import { useIdeStore } from '@/lib/store';

interface CodeEditorProps {
    onShareText?: (text: string, fileName: string, lineInfo: string) => void;
}

export default function CodeEditor({ onShareText }: CodeEditorProps) {
    const editorRef = useRef<any>(null);
    const { activeFile, files, updateFile } = useIdeStore();

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Add "Share with Compuddy" context menu action
        editor.addAction({
            id: 'share-with-compuddy',
            label: 'Share with Compuddy',
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 1.5,
            run: (ed) => {
                const selection = ed.getSelection();
                if (selection && !selection.isEmpty()) {
                    const text = ed.getModel()?.getValueInRange(selection);
                    if (text && onShareText) {
                        const startLine = selection.startLineNumber;
                        const endLine = selection.endLineNumber;
                        const lineInfo = startLine === endLine ? `Line ${startLine}` : `Lines ${startLine}-${endLine}`;
                        onShareText(text, activeFile, lineInfo);
                    }
                }
            }
        });
    };

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            updateFile(activeFile, value);
        }
    };

    // Determine language based on file extension
    const language = activeFile.endsWith('.py') ? 'python' : 'javascript';

    return (
        <Editor
            height="100%"
            language={language}
            value={files[activeFile]}
            theme="vs-dark"
            onMount={handleEditorDidMount}
            onChange={handleEditorChange}
            options={{
                minimap: { enabled: true },
                fontSize: 14,
                fontFamily: 'Consolas, "Courier New", monospace',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                contextmenu: true,
            }}
        />
    );
}
