'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { useIdeStore } from '@/lib/store';

// Exact SVGs
const PlayIcon = () => (
    <span className="icon-play">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="white"><path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" /></svg>
    </span>
);

const StopIcon = () => (
    <span className="icon-stop">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="white"><rect x="3" y="3" width="10" height="10" rx="1" /></svg>
    </span>
);

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai' | 'error';
    error?: boolean;
}

interface CompuddySidebarProps {
    isSettingsOpen: boolean;
    onCloseSettings: () => void;
    resetTrigger?: number;
    incomingSharedText?: { text: string; fileName: string; lineInfo: string } | null;
}

export default function CompuddySidebar({
    isSettingsOpen,
    onCloseSettings,
    resetTrigger = 0,
    incomingSharedText
}: CompuddySidebarProps) {
    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(1);
    const [onboardingComplete, setOnboardingComplete] = useState(false);
    const [suggestionsEnabled, setSuggestionsEnabled] = useState(true);

    const incrementChatInteraction = useIdeStore(state => state.incrementChatInteraction);
    const resetChatInteraction = useIdeStore(state => state.resetChatInteraction);
    const addChatMessage = useIdeStore(state => state.addChatMessage);
    const clearChatMessages = useIdeStore(state => state.clearChatMessages);

    // Logic: "erst nach 3 turns anzeigen"
    // We count completed AI responses.
    const [turnCount, setTurnCount] = useState(0);

    // Session State
    const [sessionId, setSessionId] = useState('');

    // Quick Action Bubbles State
    const [activeQaBubble, setActiveQaBubble] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Initialize Session ID
    useEffect(() => {
        setSessionId(crypto.randomUUID());
    }, []);

    // Initialize Onboarding from LocalStorage
    useEffect(() => {
        const stored = localStorage.getItem('compuddy_onboarding_complete');
        if (stored === 'true') {
            setOnboardingComplete(true);
        }
    }, []);

    // Persist Onboarding State
    useEffect(() => {
        if (onboardingComplete) {
            localStorage.setItem('compuddy_onboarding_complete', 'true');
        }
    }, [onboardingComplete]);

    // Handle Reset Trigger (Close Sidebar action)
    useEffect(() => {
        if (resetTrigger > 0) {
            setMessages([]);
            setTurnCount(0);
            resetChatInteraction();
            clearChatMessages();
            setInput('');
            setIsLoading(false);
            setSessionId(crypto.randomUUID()); // New Session on reset
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        }
    }, [resetTrigger]);

    // Handle Incoming Shared Text
    useEffect(() => {
        if (incomingSharedText) {
            const { text, fileName, lineInfo } = incomingSharedText;
            const header = fileName ? `📎 ${fileName} (${lineInfo})\n` : '';
            const sharedCode = header + '```\n' + text + '\n```\n';
            setInput(sharedCode);

            // Auto-resize input
            if (inputRef.current) {
                inputRef.current.style.height = 'auto';
                setTimeout(() => {
                    if (inputRef.current) {
                        inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
                        inputRef.current.focus();
                    }
                }, 0);
            }
        }
    }, [incomingSharedText]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading, activeQaBubble]);

    const nextOnboarding = () => setOnboardingStep(prev => prev + 1);
    const prevOnboarding = () => setOnboardingStep(prev => prev - 1);
    const completeOnboarding = () => {
        setOnboardingComplete(true);
    };
    const replayOnboarding = () => {
        setOnboardingComplete(false);
        setOnboardingStep(1);
        onCloseSettings();
        // Optional: clear localStorage if replay means "reset choice"
        // localStorage.removeItem('compuddy_onboarding_complete');
    };

    const sendMessage = async (overrideText?: string) => {
        const textToSend = overrideText || input;
        if (!textToSend.trim() || isLoading) return;

        // Hide Bubbles on send
        setActiveQaBubble(null);

        // Add User Message
        const userMsg: Message = { id: Date.now().toString(), text: textToSend, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        addChatMessage(userMsg);
        setInput('');

        // Reset height
        if (inputRef.current) inputRef.current.style.height = 'auto';

        setIsLoading(true);

        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg.text, session_id: sessionId }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            // Pending AI Message
            const aiMsgId = (Date.now() + 1).toString();
            setMessages(prev => [...prev, { id: aiMsgId, text: '', sender: 'ai' }]);

            let fullAiResponse = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullAiResponse += chunk;
                setMessages(prev => prev.map(msg =>
                    msg.id === aiMsgId ? { ...msg, text: msg.text + chunk } : msg
                ));
            }

            // Save completed AI message to store
            addChatMessage({ id: aiMsgId, text: fullAiResponse, sender: 'ai' });

            // Increment Turn Count on success
            setTurnCount(prev => prev + 1);
            incrementChatInteraction();

        } catch (error: any) {
            if (error.name === 'AbortError') {
                setMessages(prev => [...prev, { id: Date.now().toString(), text: 'Request cancelled.', sender: 'error', error: true }]);
            } else {
                setMessages(prev => [...prev, { id: Date.now().toString(), text: 'Error: ' + error.message, sender: 'error', error: true }]);
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
            // Restore focus after disabled state is removed
            setTimeout(() => {
                inputRef.current?.focus();
            }, 10);
        }
    };

    const stopMessage = async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    // Toggle Bubble Click
    const toggleQaBubble = (bubbleName: string) => {
        if (activeQaBubble === bubbleName) {
            setActiveQaBubble(null);
        } else {
            setActiveQaBubble(bubbleName);
        }
    };

    const handleQuickAction = (actionText: string) => {
        setActiveQaBubble(null); // Close bubbles

        let msg = actionText;
        if (actionText === 'More like this.') msg = 'Please continue.';
        if (actionText === 'Try a different approach.') msg = 'Try a different approach, please.';
        if (actionText === 'Technical & short') msg = 'Be more factual and to the point, please.';
        if (actionText === 'Supportive & calm') msg = 'Be more supportive and respond calmly, please.';

        sendMessage(msg);
    };

    // --- RENDER ---

    // --- RENDER ---

    // Onboarding Mode
    if (!onboardingComplete) {
        return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#1e1e1e]/95 p-6 backdrop-blur-sm">
                <div className="w-full max-w-md bg-[#252526] border border-white/10 rounded-xl shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
                    {onboardingStep === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">Welcome to Compuddy 👋</h2>
                            <p className="text-sm text-gray-300">Compuddy is your digital buddy inside your IDE.</p>
                            <ul className="space-y-2 text-sm text-gray-400 pl-4 list-disc marker:text-blue-500">
                                <li>Listen when things get stressful</li>
                                <li>Understand what's going on (technical or not)</li>
                                <li>Help you move forward with clear next steps</li>
                            </ul>
                            <p className="text-sm text-gray-400">Talk to Compuddy about whatever's on your mind — a bug, a tough review, time pressure, or just a quick question.</p>
                            <p className="text-xs text-gray-500 italic mt-4">You're in control. You can stop responses anytime.</p>
                            <div className="flex justify-end pt-4">
                                <button className="bg-[#007fd4] hover:bg-[#006ab1] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors" onClick={nextOnboarding}>Next</button>
                            </div>
                        </div>
                    )}
                    {onboardingStep === 2 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">How Compuddy helps</h2>
                            <p className="text-sm text-gray-300">Compuddy follows a simple flow to stay useful and not get in your way:</p>
                            <ul className="space-y-2 text-sm text-gray-400 pl-4 list-disc marker:text-blue-500">
                                <li>Reads your message (and the recent chat context)</li>
                                <li>Figures out what you need (technical help, stress support, or both)</li>
                                <li>Suggests next steps in a compact, practical format</li>
                                <li>Adjusts if you say it's not helpful</li>
                            </ul>
                            <div className="bg-blue-500/10 border-l-2 border-blue-500 p-3 rounded-r text-sm text-gray-300">
                                <strong className="text-blue-400 block mb-1">Got a code question?</strong>
                                Select a snippet → right-click → <em className="text-gray-400">Share with Compuddy</em>.
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button className="bg-[#3a3d41] hover:bg-[#45494e] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors" onClick={prevOnboarding}>Back</button>
                                <button className="bg-[#007fd4] hover:bg-[#006ab1] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors" onClick={nextOnboarding}>Next</button>
                            </div>
                        </div>
                    )}
                    {onboardingStep === 3 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">Before you start</h2>

                            <div className="space-y-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-white mb-2">What Compuddy can't guarantee</h3>
                                    <ul className="text-sm text-gray-400 pl-4 list-disc marker:text-amber-500">
                                        <li>Compuddy can make mistakes. Always double-check critical outputs.</li>
                                        <li>It's not a full coding assistant like dedicated tools on the market.</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-white mb-2">What Compuddy is not</h3>
                                    <ul className="text-sm text-gray-400 pl-4 list-disc marker:text-red-500">
                                        <li>Not a therapist and not a replacement for professional support.</li>
                                        <li>If you feel unsafe, please contact local emergency services.</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-white mb-2">Privacy & control</h3>
                                    <ul className="text-sm text-gray-400 pl-4 list-disc marker:text-green-500">
                                        <li>Your messages are processed to generate replies.</li>
                                        <li>Chats are not stored long-term and are anonymous.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button className="bg-[#3a3d41] hover:bg-[#45494e] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors" onClick={prevOnboarding}>Back</button>
                                <button className="bg-[#007fd4] hover:bg-[#006ab1] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors" onClick={completeOnboarding}>Start</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Chat Mode
    const isEmpty = messages.length === 0;

    return (
        <div className={`flex flex-col h-full min-h-0 bg-[#1e1e1e] relative ${isEmpty ? 'justify-center' : ''}`}>

            {/* Settings Panel */}
            {isSettingsOpen && (
                <div className="absolute top-0 left-0 right-0 z-20 bg-[#252526] border-b border-white/10 p-4 shadow-lg animate-in slide-in-from-top-2">
                    <h3 className="text-sm font-semibold text-white mb-3">Settings</h3>
                    <div className="flex items-center justify-between mb-4">
                        <label htmlFor="toggle-suggestions" className="text-xs text-gray-400">Show suggestions</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                id="toggle-suggestions"
                                className="sr-only peer"
                                checked={suggestionsEnabled}
                                onChange={(e) => setSuggestionsEnabled(e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#007fd4]"></div>
                        </label>
                    </div>
                    <button
                        className="w-full bg-[#3a3d41] hover:bg-[#45494e] text-white text-xs py-2 rounded transition-colors"
                        onClick={replayOnboarding}
                    >
                        Replay Onboarding
                    </button>
                </div>
            )}

            {/* Empty State Welcome */}
            {isEmpty && !isSettingsOpen && (
                <div className="flex flex-col items-center justify-center p-8 text-center opacity-80 select-none pointer-events-none">
                    <div className="w-16 h-16 bg-[#2d2d2d] rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">👋</span>
                    </div>
                    <p className="text-gray-400 text-sm">How can I help you today?</p>
                </div>
            )}

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto min-h-0 p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent ${isEmpty ? 'hidden' : ''}`}>
                {messages.map(msg => (
                    <div
                        key={msg.id}
                        className={`flex flex-col max-w-[90%] ${msg.sender === 'user' ? 'self-end ml-auto items-end' : 'self-start items-start'}`}
                    >
                        <div
                            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender === 'user'
                                ? 'bg-[#007fd4] text-white rounded-br-sm'
                                : msg.error
                                    ? 'bg-red-900/50 border border-red-500/50 text-red-200'
                                    : 'bg-[#2d2d2d] text-gray-200 rounded-bl-sm border border-white/5'
                                }`}
                        >
                            {msg.sender === 'ai' ? (
                                <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-[#1e1e1e] prose-pre:border prose-pre:border-white/10">
                                    <ReactMarkdown
                                        components={{
                                            code: ({ node, className, children, ...props }) =>
                                                <code className="bg-white/10 rounded px-1 py-0.5 text-xs font-mono" {...props}>{children}</code>,
                                            pre: ({ node, children, ...props }) =>
                                                <pre className="p-3 rounded-lg bg-[#1e1e1e] border border-white/10 overflow-x-auto my-2" {...props}>{children}</pre>,
                                            ul: ({ node, children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
                                            ol: ({ node, children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
                                        }}
                                    >
                                        {msg.text}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-center gap-1.5 px-4 py-3 bg-[#2d2d2d] rounded-2xl rounded-bl-sm w-fit border border-white/5">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.32s]"></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.16s]"></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {suggestionsEnabled && !isLoading && turnCount > 0 && turnCount % 3 === 0 && (
                <div className="px-4 pb-2 flex gap-2 justify-center animate-in slide-in-from-bottom-2 fade-in">
                    <div className="relative group">
                        <button
                            onClick={() => toggleQaBubble('feedback')}
                            className="bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-white/10 text-xs text-gray-300 px-3 py-1.5 rounded-full shadow-sm transition-all flex items-center gap-1.5"
                        >
                            <span>✨ Feedback</span>
                        </button>

                        {activeQaBubble === 'feedback' && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-[#252526] border border-white/10 rounded-lg shadow-xl p-1 z-50 flex flex-col gap-0.5 animate-in zoom-in-95 duration-100 origin-bottom">
                                <button className="text-left text-xs text-gray-300 hover:bg-[#007fd4] hover:text-white px-2 py-1.5 rounded transition-colors" onClick={() => handleQuickAction("More like this.")}>More like this</button>
                                <button className="text-left text-xs text-gray-300 hover:bg-[#007fd4] hover:text-white px-2 py-1.5 rounded transition-colors" onClick={() => handleQuickAction("Try a different approach.")}>Try different approach</button>
                            </div>
                        )}
                    </div>

                    <div className="relative group">
                        <button
                            onClick={() => toggleQaBubble('persona')}
                            className="bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-white/10 text-xs text-gray-300 px-3 py-1.5 rounded-full shadow-sm transition-all flex items-center gap-1.5"
                        >
                            <span>🎭 Persona</span>
                        </button>

                        {activeQaBubble === 'persona' && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-[#252526] border border-white/10 rounded-lg shadow-xl p-1 z-50 flex flex-col gap-0.5 animate-in zoom-in-95 duration-100 origin-bottom">
                                <button className="text-left text-xs text-gray-300 hover:bg-[#007fd4] hover:text-white px-2 py-1.5 rounded transition-colors" onClick={() => handleQuickAction("Technical & short")}>Technical & short</button>
                                <button className="text-left text-xs text-gray-300 hover:bg-[#007fd4] hover:text-white px-2 py-1.5 rounded transition-colors" onClick={() => handleQuickAction("Supportive & calm")}>Supportive & calm</button>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* Input Area */}
            <div className={`p-4 bg-[#1e1e1e] border-t border-white/5 relative z-10 transition-all duration-300 ease-in-out ${isEmpty ? 'pb-8 pt-0 border-none' : ''}`}>
                <div className={`relative flex items-end gap-2 bg-[#2d2d2d] border border-white/10 rounded-xl p-2 focus-within:ring-1 focus-within:ring-[#007fd4] focus-within:border-[#007fd4] transition-all shadow-sm ${isEmpty ? 'shadow-lg ring-1 ring-white/5' : ''}`}>
                    <textarea
                        id="chat-input"
                        ref={inputRef}
                        placeholder={messages.length > 0 ? "Type a message..." : "What are you stuck on right now?"}
                        value={input}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        rows={1}
                        className="w-full bg-transparent text-gray-200 text-sm placeholder:text-gray-500 px-2 py-2 focus:outline-none resize-none max-h-[200px] scrollbar-thin scrollbar-thumb-gray-600"
                        style={{ minHeight: '40px' }}
                    />

                    <button
                        id="send-btn"
                        onClick={isLoading ? stopMessage : () => sendMessage()}
                        className={`mb-1 w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${isLoading
                            ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                            : input.trim()
                                ? 'bg-[#007fd4] text-white shadow-md hover:bg-[#006ab1]'
                                : 'bg-[#3d3d3d] text-gray-500 hover:bg-[#4d4d4d] cursor-default'
                            }`}
                        disabled={!input.trim() && !isLoading}
                    >
                        {isLoading ? (
                            <div className="w-2.5 h-2.5 bg-current rounded-sm" />
                        ) : (
                            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current ml-0.5">
                                <path d="M1.724 1.053a.5.5 0 0 0-.714.545l1.403 4.85a.5.5 0 0 1 .397.354l5.69 1.538-5.69 1.538a.5.5 0 0 1-.397.354l-1.403 4.85a.5.5 0 0 0 .714.545l13-6.5a.5.5 0 0 0 0-.894l-13-6.5Z" />
                            </svg>
                        )}
                    </button>
                </div>
                {isEmpty && (
                    <div className="mt-3 flex justify-center gap-4 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1">🔒 Private Session</span>
                        <span className="flex items-center gap-1">⚡ AI Powered</span>
                    </div>
                )}
            </div>
        </div>
    );
}

