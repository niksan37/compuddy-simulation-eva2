'use client';

import React, { useEffect, useState } from 'react';
import Layout from './Layout';
import { useIdeStore } from '@/lib/store';

type CustomTaskProps = {
    onComplete: (data: any) => void;
    stepName: string;
    initialChatOpen?: boolean;
    timeLimitSeconds?: number;
    requireSuccess?: boolean;
    autoAdvanceOnSuccess?: boolean;
    requiredChatInteractions?: number;
};

export default function CustomTask({
    onComplete,
    stepName,
    initialChatOpen = false,
    timeLimitSeconds = 300, // Default 5 minutes
    requireSuccess = true,
    autoAdvanceOnSuccess = true,
    requiredChatInteractions = 0
}: CustomTaskProps) {

    const setChatOpen = useIdeStore(state => state.setChatOpen);
    const terminalOutput = useIdeStore(state => state.terminalOutput);
    const chatInteractionCount = useIdeStore(state => state.chatInteractionCount);
    const resetChatInteraction = useIdeStore(state => state.resetChatInteraction);

    const [startedAt] = useState(() => Date.now());
    const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
    const [isSuccess, setIsSuccess] = useState(!requireSuccess);

    useEffect(() => {
        // When the task mounts, configure the initial chat state
        setChatOpen(initialChatOpen);
        // Reset the counter so we count interactions per-task accurately
        resetChatInteraction();
    }, [initialChatOpen, setChatOpen, resetChatInteraction]);

    // Monitor Terminal for success if required
    useEffect(() => {
        if (requireSuccess && !isSuccess) {
            if (terminalOutput.length > 0) {
                // Find if any of the recent lines indicates success (e.g. "OK" from unittests)
                const hasPassed = terminalOutput.some(line => line.trim() === "OK");
                if (hasPassed) {
                    setIsSuccess(true);

                    if (autoAdvanceOnSuccess) {
                        // Auto-advance after a small delay so the user sees the OK message
                        setTimeout(() => {
                            handleFinish("auto_success");
                        }, 1000);
                    }
                }
            }
        }
    }, [terminalOutput, requireSuccess, isSuccess, autoAdvanceOnSuccess]);

    // Timer logic
    useEffect(() => {
        // If time hits 0, auto-complete
        if (timeLeft <= 0) {
            handleFinish("timeout");
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timerId);
    }, [timeLeft]);

    const chatMessages = useIdeStore(state => state.chatMessages);

    const handleFinish = (reason: string = "manual_success") => {
        const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
        const taskData = {
            startedAt: new Date(startedAt).toISOString(),
            completedAt: new Date().toISOString(),
            durationSeconds,
            notes: `Data from ${stepName}`,
            success: isSuccess || reason === 'timeout',
            reason: reason,
            timeLeftOnCompletion: timeLeft,
            chatInteractions: chatInteractionCount,
            chatHistory: chatMessages // Store the exact chat history
        };
        onComplete(taskData);
    };

    const formatTime = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    // Determine button state and text
    const isButtonDisabled = (requireSuccess && !isSuccess) || (chatInteractionCount < requiredChatInteractions);

    let buttonTitle = "Complete Task";
    let buttonText = `Done (${stepName})`;

    if (requireSuccess && !isSuccess) {
        buttonTitle = "Tests must be completed successfully";
        buttonText = "Tests not passed";
    } else if (chatInteractionCount < requiredChatInteractions) {
        buttonTitle = "Please continue interacting with the chatbot";
        buttonText = `Done (${stepName})`;
    }

    return (
        <div className="w-full h-screen relative overflow-hidden">
            {/* Run the full IDE layou */}
            <Layout>
                <></>
            </Layout>

            {/* Floating Header Control */}
            <div className="absolute top-3 right-4 z-[9999] flex items-center gap-4 bg-[#252526] p-2 rounded shadow-xl border border-[#454545]">
                <div className={`text-sm font-mono font-bold ${timeLeft < 60 ? 'text-red-400' : 'text-[#cccccc]'}`}>
                    Time: {formatTime(timeLeft)}
                </div>

                {(!isSuccess || !autoAdvanceOnSuccess) && (
                    <button
                        onClick={() => handleFinish("manual_success")}
                        disabled={isButtonDisabled}
                        className={`px-4 py-1.5 text-sm font-semibold rounded shadow-lg transition-colors border ${isButtonDisabled
                            ? 'bg-[#333333] cursor-not-allowed border-[#454545] text-[#858585]'
                            : 'bg-green-600 hover:bg-green-700 text-white border-green-700'
                            }`}
                        title={buttonTitle}
                    >
                        {buttonText}
                    </button>
                )}

                {(isSuccess && autoAdvanceOnSuccess) && (
                    <span className="px-4 py-1.5 text-sm font-semibold text-green-400">Success! Loading next step...</span>
                )}
            </div>
        </div>
    );
}
