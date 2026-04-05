'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SurveyComponent from './SurveyComponent';
import CustomTask from './CustomTask';
import { surveyAJson, surveyBJson, surveyCJson } from '@/lib/surveys';

// The steps defined for the experiment in order
export const EXPERIMENT_STEPS = [
    'init',     // Step 0: Extract URL params and start
    'surveyA',  // Step 1: Survey A
    'task1',    // Step 2: Custom Task 1
    'surveyB',  // Step 3: Survey B
    'task2',    // Step 4: Custom Task 2
    'surveyC',  // Step 5: Survey C
    'finish'    // Step 6: Submit & redirect
] as const;

export type Step = typeof EXPERIMENT_STEPS[number];

type SessionData = {
    prolificId: string | null;
    studyId: string | null;
    sessionId: string | null;
    surveyA: any;
    task1: any;
    surveyB: any;
    task2: any;
    surveyC: any;
    completionCode?: string;
    completionPath?: string;
};

const INITIAL_SESSION_DATA: SessionData = {
    prolificId: null,
    studyId: null,
    sessionId: null,
    surveyA: null,
    task1: null,
    surveyB: null,
    task2: null,
    surveyC: null,
};

const STORAGE_KEY = 'experiment_session';

export default function ExperimentManager() {
    const searchParams = useSearchParams();
    const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
    const [sessionData, setSessionData] = useState<SessionData>(INITIAL_SESSION_DATA);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize from LocalStorage and URL on first load
    useEffect(() => {
        const prolificIdFromUrl = searchParams.get('PROLIFIC_PID');
        const studyIdFromUrl = searchParams.get('STUDY_ID');
        const sessionIdFromUrl = searchParams.get('SESSION_ID');
        // TEMPORARILY DISABLED LOCALSTORAGE: const storedDataRaw = localStorage.getItem(STORAGE_KEY);
        const storedDataRaw = null;

        let loadedData: SessionData = { ...INITIAL_SESSION_DATA };
        let loadedStepIndex = 0;

        if (storedDataRaw) {
            try {
                const parsed = JSON.parse(storedDataRaw);
                if (parsed.data) loadedData = parsed.data;
                if (parsed.stepIndex !== undefined) loadedStepIndex = parsed.stepIndex;
            } catch (e) {
                console.error('Failed to parse localStorage session data', e);
            }
        }

        // URL parameter overrides stored prolificId if present
        if (prolificIdFromUrl) {
            loadedData.prolificId = prolificIdFromUrl;
        }
        if (studyIdFromUrl) {
            loadedData.studyId = studyIdFromUrl;
        }
        if (sessionIdFromUrl) {
            loadedData.sessionId = sessionIdFromUrl;
        }

        setSessionData(loadedData);

        // Auto advance from init to the first real step
        if (loadedStepIndex === 0) {
            setCurrentStepIndex(1); // 'surveyA'
        } else {
            setCurrentStepIndex(loadedStepIndex);
        }

        setIsInitialized(true);
    }, [searchParams]);

    // Sync state changes to localStorage
    useEffect(() => {
        if (isInitialized) {
            // TEMPORARILY DISABLED:
            // localStorage.setItem(STORAGE_KEY, JSON.stringify({
            //     stepIndex: currentStepIndex,
            //     data: sessionData
            // }));
        }
    }, [currentStepIndex, sessionData, isInitialized]);

    // Handle progression logic
    useEffect(() => {
        if (isInitialized && EXPERIMENT_STEPS[currentStepIndex] === 'finish') {
            finalizeExperiment();
        }
    }, [currentStepIndex, isInitialized]);

    const handleNextStep = (stepKey: keyof SessionData, stepData: any) => {
        // Update data for the completed step
        setSessionData(prev => ({
            ...prev,
            [stepKey]: stepData
        }));

        // Early screen-out: if participant lacks required competence, skip the rest of the experiment
        if (stepKey === 'surveyA' && stepData?.competence_ide !== undefined && stepData.competence_ide < 4) {
            setCurrentStepIndex(EXPERIMENT_STEPS.indexOf('finish'));
            return;
        }

        // Move to next step
        if (currentStepIndex < EXPERIMENT_STEPS.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        }
    };

    const finalizeExperiment = async () => {
        setIsSubmitting(true);
        console.log('Submitting data to API...');

        // Determine Prolific Completion Code
        // Default: Success
        let completionCode = 'CQZU86VR';
        let completionPath = 'Success';

        // 1. Not qualified: competence_ide below 4
        if (sessionData.surveyA?.competence_ide !== undefined && sessionData.surveyA.competence_ide < 4) {
            completionCode = 'COTY5171';
            completionPath = 'Screened Out: Low Competence';
        }
        // 2. Not enough interaction with the chatbot (below 3)
        else if (sessionData.task2?.chatInteractions !== undefined && sessionData.task2.chatInteractions < 3) {
            completionCode = 'C1JXW044';
            completionPath = 'Screened Out: Low Interaction';
        }
        // 3. Failed attention check
        // The attention check is in surveyB, PANAS_T1, row 'attention_check', expected answer 3 ("Moderately")
        else if (sessionData.surveyB?.PANAS_T1?.attention_check && sessionData.surveyB.PANAS_T1.attention_check !== 3) {
            completionCode = 'C3044XVU';
            completionPath = 'Screened Out: Attention Check Failed';
        }

        const payload = {
            ...sessionData,
            completionCode,
            completionPath
        };

        try {
            const response = await fetch('/api/save-results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error('Failed to save results', await response.text());
                // Fallback: Still redirect or handle error visibly if needed
            } else {
                console.log('Results saved successfully!');
                // Clear localStorage cleanly after successful submission
                // localStorage.removeItem(STORAGE_KEY);
            }
        } catch (err) {
            console.error('Network error during submission', err);
        } finally {
            // Redirect to Prolific regardless to ensure participant is paid or properly screened out
            window.location.href = `https://app.prolific.com/submissions/complete?cc=${completionCode}`;
        }
    };

    if (!isInitialized) {
        return <div className="flex h-screen items-center justify-center p-8">Loading session...</div>;
    }

    const currentStep = EXPERIMENT_STEPS[currentStepIndex];
    const isTaskStep = currentStep === 'task1' || currentStep === 'task2';

    if (isTaskStep) {
        return (
            <div className="w-full h-screen">
                {currentStep === 'task1' && (
                    <CustomTask
                        stepName="Task 1"
                        initialChatOpen={false}
                        requireSuccess={true}
                        autoAdvanceOnSuccess={true}
                        requiredChatInteractions={0}
                        timeLimitSeconds={300}
                        onComplete={(data) => handleNextStep('task1', data)}
                    />
                )}
                {currentStep === 'task2' && (
                    <CustomTask
                        stepName="Task 2"
                        initialChatOpen={true}
                        requireSuccess={false}
                        autoAdvanceOnSuccess={false}
                        requiredChatInteractions={3}
                        timeLimitSeconds={300}
                        onComplete={(data) => handleNextStep('task2', data)}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="w-full max-w-[95%] mx-auto py-12 px-4 sm:px-6 lg:px-8">
            {/* Optional: Show progress bar or debug info */}
            <div className="mb-8 flex flex-col gap-1 items-start justify-between text-sm text-gray-500 sm:flex-row sm:items-center">
                <div className="flex flex-col">
                    <span>Prolific ID: {sessionData.prolificId || 'Not provided'}</span>
                    <span>Study ID: {sessionData.studyId || 'Not provided'}</span>
                    <span>Session ID: {sessionData.sessionId || 'Not provided'}</span>
                </div>
                <span>Step {currentStepIndex} of {EXPERIMENT_STEPS.length - 2}</span>
            </div>

            <div className="relative">
                {currentStep === 'surveyA' && (
                    <SurveyComponent
                        surveyJson={surveyAJson}
                        savedData={sessionData.surveyA}
                        onComplete={(data) => handleNextStep('surveyA', data)}
                    />
                )}

                {currentStep === 'surveyB' && (
                    <SurveyComponent
                        surveyJson={surveyBJson}
                        savedData={sessionData.surveyB}
                        onComplete={(data) => handleNextStep('surveyB', data)}
                    />
                )}

                {currentStep === 'surveyC' && (
                    <SurveyComponent
                        surveyJson={surveyCJson}
                        savedData={sessionData.surveyC}
                        onComplete={(data) => handleNextStep('surveyC', data)}
                    />
                )}

                {currentStep === 'finish' && (
                    <div className="text-center p-12 bg-white rounded-xl shadow-sm">
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">
                            {isSubmitting ? 'Saving Results...' : 'Redirecting...'}
                        </h2>
                        <p className="text-gray-600">Please wait while we securely save your data and redirect you back to Prolific.</p>

                        {isSubmitting && (
                            <div className="mt-6 flex justify-center">
                                <div className="w-8 h-8 border-4 border-[#007fd4] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
