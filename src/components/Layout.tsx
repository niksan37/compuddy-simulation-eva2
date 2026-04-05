'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Files, Search, GitBranch, Bug, AppWindow, Settings, User, X, Minus, MessageSquareText } from 'lucide-react';
import CodeEditor from './CodeEditor';
import CompuddySidebar from './CompuddySidebar';
import { Terminal } from './Terminal';
import { useIdeStore } from '@/lib/store';

export default function Layout({ children }: { children: React.ReactNode }) {
    const [sidebarWidth, setSidebarWidth] = useState(300);
    const [isResizing, setIsResizing] = useState(false);

    // View State: 'explorer', 'chat', or null (hidden)
    const [activeView, setActiveView] = useState<'explorer' | 'chat' | null>('explorer');

    const [showSettings, setShowSettings] = useState(false);

    const { activeFile, setActiveFile, files, isChatOpen, setChatOpen } = useIdeStore();

    // Reset Trigger (Layout -> Sidebar)
    const [resetTrigger, setResetTrigger] = useState(0);

    const sidebarRef = useRef<HTMLDivElement>(null);

    // Sync store chat state with local view state
    useEffect(() => {
        if (isChatOpen && activeView !== 'chat') {
            setActiveView('chat');
        } else if (!isChatOpen && activeView === 'chat') {
            // Only close if we are in chat mode. If user switched to explorer, don't just close it.
            // But wait, if store says closed, we should probably close or do nothing?
            // Let's assume store drives "opening" mostly. 
            // If the user manually closes chat via specific action, store is updated.
        }
    }, [isChatOpen]);

    const startResizing = (mouseDownEvent: React.MouseEvent) => {
        setIsResizing(true);
    };

    const stopResizing = () => {
        setIsResizing(false);
    };

    const resize = (mouseMoveEvent: MouseEvent) => {
        if (isResizing && sidebarRef.current) {
            const newWidth = mouseMoveEvent.clientX - sidebarRef.current.getBoundingClientRect().left;
            if (newWidth > 200 && newWidth < 1800) {
                setSidebarWidth(newWidth);
            }
        }
    };

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing]);

    const toggleView = (view: 'explorer' | 'chat') => {
        if (activeView === view) {
            setActiveView(null);
            if (view === 'chat') setChatOpen(false);
        } else {
            setActiveView(view);
            if (view === 'chat') setChatOpen(true);
        }
    };

    const minimizeSidebar = () => {
        setActiveView(null);
        if (activeView === 'chat') setChatOpen(false);
    };

    const closeSidebar = () => {
        setActiveView(null);
        if (activeView === 'chat') {
            setChatOpen(false);
            setResetTrigger(prev => prev + 1);
        }
    };

    // Handler for sharing text from Editor
    const handleShareText = (text: string, fileName: string, lineInfo: string) => {
        // This needs to pass data to CompuddySidebar.
        // Since we can't easily pass props to a hidden component if we unmount it,
        // we might need to keep it mounted or rely on store.
        // For now, let's open chat view.
        setActiveView('chat');
        setChatOpen(true);
        // setSharedTextData... (This part was using local state which is fine if Sidebar is rendered but hidden)
        // If we conditionally render sidebar content, we lose state.
        // So we should probably always render both but hide one?
        // Or just accept state reset for now (or move state to store).
        // The prompt implies "Filetree anzeigen", not complex state persistence.
        // Use the local state pass-through:
        setSharedTextData({ text, fileName, lineInfo });
    };

    // Shared Text State (Editor -> Sidebar)
    // We need to pass this to CompuddySidebar.
    const [sharedTextData, setSharedTextData] = useState<{ text: string; fileName: string; lineInfo: string } | null>(null);


    return (
        <div className={`flex flex-col h-screen w-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden ${isResizing ? 'cursor-ew-resize select-none pointer-events-auto' : ''}`}>

            <div className="flex flex-1 overflow-hidden">
                {/* Activity Bar */}
                <div className="w-[48px] bg-[#333333] flex flex-col items-center py-6 z-20 gap-4" >
                    <div
                        className={`cursor-pointer p-2 rounded-md transition-colors ${activeView === 'explorer' ? 'text-white border-l-2 border-white bg-[#3c3c3c]' : 'text-[#858585] hover:text-white'}`}
                        onClick={() => toggleView('explorer')}
                        title="Explorer"
                    >
                        <Files className="w-6 h-6" />
                    </div>


                    <Search className="w-6 h-6 text-[#858585] hover:text-white cursor-pointer opacity-50" />
                    <GitBranch className="w-6 h-6 text-[#858585] hover:text-white cursor-pointer opacity-50" />
                    <Bug className="w-6 h-6 text-[#858585] hover:text-white cursor-pointer opacity-50" />


                    <div className="relative">
                        <div
                            className={`cursor-pointer p-2 rounded-md transition-colors ${activeView === 'chat' ? 'text-white border-l-2 border-white bg-[#3c3c3c]' : 'text-[#858585] hover:text-white'}`}
                            onClick={() => toggleView('chat')}
                            title="Compuddy"
                        >
                            <MessageSquareText className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="flex-1"></div>

                    <User className="w-6 h-6 text-[#858585] hover:text-white cursor-pointer" />
                    <Settings
                        className={`w-6 h-6 cursor-pointer ${showSettings ? 'text-white' : 'text-[#858585] hover:text-white'}`}
                        onClick={() => {
                            if (activeView !== 'chat') {
                                setActiveView('chat');
                                setChatOpen(true);
                            }
                            setShowSettings(!showSettings);
                        }}
                    />
                </div>

                {/* Sidebar Container */}
                <div
                    ref={sidebarRef}
                    className={`bg-[#252526] border-r border-[#454545] flex flex-col relative shrink-0 ${activeView ? 'flex' : 'hidden'}`}
                    style={{ width: sidebarWidth }}
                >
                    {/* Header */}
                    <div className="h-[40px] px-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#bbbbbb] bg-[#252526] select-none border-b border-[#3e3e3e]">
                        <span>{activeView === 'explorer' ? 'Explorer' : 'Compuddy'}</span>
                        <div className="flex items-center gap-3">
                            {activeView === 'chat' && (
                                <Settings
                                    size={14}
                                    className="cursor-pointer hover:text-white"
                                    onClick={() => setShowSettings(!showSettings)}
                                />
                            )}
                            <div title="Minimize" onClick={minimizeSidebar} className="cursor-pointer hover:text-white">
                                <Minus size={14} />
                            </div>
                            {activeView === 'chat' && (
                                <div title="Close Session" onClick={closeSidebar} className="cursor-pointer hover:text-white">
                                    <X size={14} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Content Switcher */}
                    <div className="flex-1 overflow-hidden flex flex-col relative">
                        {activeView === 'explorer' && (
                            <div className="flex flex-col p-2 space-y-1">
                                <div className="text-[11px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider">Workspace</div>
                                {Object.keys(files).map((fileName) => (
                                    <div
                                        key={fileName}
                                        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md text-sm ${activeFile === fileName ? 'bg-[#37373d] text-white' : 'text-[#cccccc] hover:bg-[#2a2d2e]'}`}
                                        onClick={() => setActiveFile(fileName)}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${fileName.endsWith('.py') ? 'bg-yellow-400' : 'bg-blue-400'}`}></span>
                                        {fileName}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* We always keep Compuddy mounted if it was ever opened to preserve state, or just re-render? 
                            The user wants "reset" functionality so re-rendering might be acceptable or checking resetTrigger.
                            However, hiding it with CSS is safer for chat persistence during view switch.
                        */}
                        <div className={`flex-1 flex flex-col min-h-0 ${activeView === 'chat' ? 'flex' : 'hidden'}`}>
                            <CompuddySidebar
                                isSettingsOpen={showSettings}
                                onCloseSettings={() => setShowSettings(false)}
                                resetTrigger={resetTrigger}
                                incomingSharedText={sharedTextData}
                            />
                        </div>
                    </div>

                    {/* Resizer Handle */}
                    <div
                        className="absolute right-[-6px] top-0 w-[12px] h-full cursor-ew-resize hover:bg-[#007fd4]/50 z-[9999] transition-colors"
                        onMouseDown={startResizing}
                    ></div>
                </div>


                {/* Editor Area */}
                <div className="flex-1 bg-[#1e1e1e] flex flex-col min-w-0">
                    {/* Tabs / Breadcrumbs */}
                    <div className="h-[40px] bg-[#2d2d2d] flex items-center px-4 gap-4">
                        <div className="px-4 py-2 bg-[#1e1e1e] border-t-2 border-[#007acc] text-white text-sm flex items-center gap-3 shadow-md">
                            <span className="text-yellow-400">🐍</span>
                            <span>{activeFile}</span>
                            <span className="hover:bg-[#444] rounded-md p-1 cursor-pointer transition-colors">×</span>
                        </div>
                    </div>

                    {/* Editor Content */}
                    <div className="flex-1 p-0 overflow-hidden relative" id="monaco-editor-container">
                        <CodeEditor onShareText={handleShareText} />
                    </div>

                    {/* Terminal */}
                    <Terminal />
                </div>
            </div>

            {/* Status Bar */}
            <div className="h-[24px] bg-[#007acc] text-white text-[12px] flex items-center px-4 justify-between z-20">
                <div className="flex items-center gap-4">
                    <span className="font-medium cursor-pointer flex items-center gap-1.5"><GitBranch size={12} /> main</span>
                    <span className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity">0 errors, 0 warnings</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="cursor-pointer opacity-80 hover:opacity-100">Ln 137, Col 1</span>
                    <span className="cursor-pointer opacity-80 hover:opacity-100">UTF-8</span>
                    <span className="cursor-pointer opacity-80 hover:opacity-100">Python</span>
                    <span className="cursor-pointer opacity-80 hover:opacity-100">Prettier</span>
                </div>
            </div>
        </div>
    );
}
