export const surveyAJson = {
    title: 'Survey A - Pre-Task (Demographics & Baseline)',
    showProgressBar: 'top',
    widthMode: 'responsive',
    pages: [
        {
            name: 'Block_1_Demographics',
            elements: [
                {
                    type: 'text',
                    name: 'age',
                    title: 'What is your age?',
                    inputType: 'number',
                    isRequired: true,
                    min: 18,
                    max: 99
                },
                {
                    type: 'radiogroup',
                    name: 'gender',
                    title: 'What is your gender?',
                    isRequired: true,
                    choices: [
                        { value: 1, text: 'Male' },
                        { value: 2, text: 'Female' },
                        { value: 3, text: 'Non-binary' },
                        { value: 4, text: 'Prefer not to say' }
                    ]
                },
                {
                    type: 'radiogroup',
                    name: 'education',
                    title: 'What is your highest level of education?',
                    isRequired: true,
                    choices: [
                        { value: 1, text: 'High School / GED' },
                        { value: 2, text: "Bachelor's Degree" },
                        { value: 3, text: "Master's Degree" },
                        { value: 4, text: 'PhD or higher' },
                        { value: 5, text: 'Other' }
                    ]
                },
                {
                    type: 'radiogroup',
                    name: 'experience',
                    title: 'How many years of professional experience do you have in software development?',
                    isRequired: true,
                    choices: [
                        { value: 1, text: '0–2 years (Junior)' },
                        { value: 2, text: '3–5 years (Intermediate)' },
                        { value: 3, text: '5–10 years (Senior)' },
                        { value: 4, text: 'More than 10 years' }
                    ]
                },
                {
                    type: 'rating',
                    name: 'competence_ide',
                    title: 'How would you rate your competence in the programming language Python?',
                    isRequired: true,
                    rateMin: 1,
                    rateMax: 7,
                    minRateDescription: 'Novice',
                    maxRateDescription: 'Expert'
                },
                {
                    type: 'rating',
                    name: 'STRESS_T0',
                    title: 'Stress means a situation in which a person feels tense, restless, nervous or anxious. : “How stressed do you feel right now?”',
                    isRequired: true,
                    rateMin: 1,
                    rateMax: 5,
                    minRateDescription: 'Not at all',
                    maxRateDescription: 'Very much'
                }
            ]
        },
        {
            name: 'Block_2_Scenario',
            elements: [
                {
                    type: 'html',
                    name: 'scenario_description',
                    html: "<h3>Scenario: Critical Hotfix</h3><p>You are a Senior Backend Developer. It is 'Black Friday' and traffic in the shop is extremely high. Support reports that orders with voucher codes are failing. We are losing approx. €10,000 in revenue per minute.</p><p>Your Team Lead writes: <i>'We have a critical bug in the DiscountCalculator. Customers cannot check out! Fix this IMMEDIATELY. The release window closes in exactly 5 minutes.'</i></p><p><b>Your Task:</b><br>1. Find the error in the method.<br>2. Fix the bug so that the Unit Test passes.<br>3. You have a maximum of 10 minutes.<br><b>Important: You are NOT allowed to use any external tools or aids (e.g. Google, StackOverflow, ChatGPT).</b></p>"
                },
                {
                    type: 'boolean',
                    name: 'scenario_consent',
                    title: 'I have read the scenario and I know what to do.',
                    isRequired: true,
                    labelTrue: 'Yes',
                    labelFalse: 'No',
                    valueTrue: 1,
                    valueFalse: 0
                }
            ]
        }
    ]
};

export const surveyBJson = {
    title: 'Survey B - Mid-Experiment (Post-Task Task Evaluation)',
    showProgressBar: 'top',
    widthMode: 'responsive',
    pages: [
        {
            name: 'Block_3_PANAS_T1',
            elements: [
                {
                    type: 'rating',
                    name: 'STRESSN_T1',
                    title: 'Stress means a situation in which a person feels tense, restless, nervous or anxious: “How stressed do you feel right now?”',
                    isRequired: true,
                    rateMin: 1,
                    rateMax: 5,
                    minRateDescription: 'Not at all',
                    maxRateDescription: 'Very much'
                },
                {
                    type: 'matrix',
                    name: 'PANAS_T1',
                    title: 'Indicate to what extent you feel this way right now (at this moment).',
                    isRequired: true,
                    isAllRowRequired: true,
                    columns: [
                        { value: 1, text: 'Very slightly or not at all' },
                        { value: 2, text: 'A little' },
                        { value: 3, text: 'Moderately' },
                        { value: 4, text: 'Quite a bit' },
                        { value: 5, text: 'Extremely' }
                    ],
                    rows: [
                        { value: 'active', text: 'active' },
                        { value: 'upset', text: 'upset' },
                        { value: 'hostile', text: 'hostile' },
                        { value: 'inspired', text: 'inspired' },
                        { value: 'ashamed', text: 'ashamed' },
                        { value: 'alert', text: 'alert' },
                        { value: 'nervous', text: 'nervous' },
                        { value: 'determined', text: 'determined' },
                        { value: 'attentive', text: 'attentive' },
                        { value: 'afraid', text: 'afraid' },
                        { value: 'attention_check', text: 'This is an attention check. Please select "Moderately".' }
                    ]
                }
            ]
        },
        {
            name: 'Block_4_Chatbot_Intro',
            elements: [
                {
                    type: 'html',
                    name: 'chatbot_instructions',
                    html: "<h3>Task 2: Chatbot Interaction</h3><p><b>Please use the Chatbot now.</b></p><p>Open the chat window in the IDE. Briefly write to the chatbot about how you are feeling regarding the task or that you are stuck (e.g., <i>\"I am frustrated because I can't find the bug\"</i>).</p><br><p style=\"color: #cc0000;\"><b>⚠️ Warning:</b> Your chat data will be evaluated completely anonymously. However, if no reasonable or meaningful conversation is conducted with the chatbot, your submission will be rejected.</p><br><p><b>Your Task:</b><br>1. <b>FOCUS ENTIRELY ON THE CHATBOT INTERACTION.</b><br>2. <b>Your focus is NO LONGER on solving the problem in the code!</b><br>3. Follow the dialog for approx. 3-5 minutes.</p>"
                }
            ]
        }
    ]
};

export const surveyCJson = {
    title: 'Survey C - Final Questionnaire (Post-Chatbot)',
    showProgressBar: 'top',
    widthMode: 'responsive',
    pages: [
        {
            name: 'Block_5_PANAS_T2',
            elements: [
                {
                    type: 'rating',
                    name: 'STRESS_T2',
                    title: 'Stress means a situation in which a person feels tense, restless, nervous or anxious: “How stressed do you feel right now?”',
                    isRequired: true,
                    rateMin: 1,
                    rateMax: 5,
                    minRateDescription: 'Not at all',
                    maxRateDescription: 'Very much'
                },
                {
                    type: 'matrix',
                    name: 'PANAS_T2',
                    title: 'Indicate to what extent you feel this way right now (at this moment).',
                    isRequired: true,
                    isAllRowRequired: true,
                    columns: [
                        { value: 1, text: 'Very slightly or not at all' },
                        { value: 2, text: 'A little' },
                        { value: 3, text: 'Moderately' },
                        { value: 4, text: 'Quite a bit' },
                        { value: 5, text: 'Extremely' }
                    ],
                    rows: [
                        'active', 'upset', 'hostile', 'inspired', 'ashamed', 'alert', 'nervous', 'determined', 'attentive', 'afraid'
                    ]
                }
            ]
        },
        {
            name: 'Block_6_System_Evaluation',
            elements: [
                {
                    type: 'matrix',
                    name: 'digital_agent_evaluation',
                    title: 'Please indicate how much you agree with the following statements about the digital agent and system:',
                    isRequired: true,
                    isAllRowRequired: true,
                    columns: [
                        { value: 1, text: '1 - Strongly disagree' },
                        { value: 2, text: '2' },
                        { value: 3, text: '3' },
                        { value: 4, text: '4 - Neutral' },
                        { value: 5, text: '5' },
                        { value: 6, text: '6' },
                        { value: 7, text: '7 - Strongly agree' }
                    ],
                    rows: [
                        { value: 'COMP1', text: 'The digital agent noticed that I was struggling.' },
                        { value: 'COMP2', text: 'The digital agent understood/acknowledged how I felt.' },
                        { value: 'COMP3', text: 'The digital agent tried to make sense of my situation.' },
                        { value: 'COMP4', text: 'The digital agent took steps that reduced my burden.' },
                        { value: 'TRUST1', text: 'I am confident in the AI assistant.' },
                        { value: 'TRUST2', text: 'The AI assistant is reliable.' },
                        { value: 'TRUST3', text: 'I can trust the AI assistant.' },
                        { value: 'TRANS1', text: 'How easy was it to understand why the system gave this answer/recommendation?' },
                        { value: 'TRANS2', text: 'How well did you understand how the system arrived at its answers/recommendations?' },
                        { value: 'TRANS3', text: 'The system generated its answers/recommendations in a clear manner.' },
                        { value: 'EFFECTIVE1', text: 'Using the agent improved my effectiveness in dealing with the situation.' },
                        { value: 'EFFECTIVE2', text: 'Using the agent increased my productivity while dealing with the situation.' },
                        { value: 'EFFECTIVE3', text: 'Using the agent helped me accomplish what I needed to do in this situation.' },
                        { value: 'TTF1', text: 'The System is appropriate for the tasks I perform.' },
                        { value: 'TTF2', text: 'The functions of the System are sufficient for my work.' },
                        { value: 'TTF3', text: 'The System is compatible with the way I normally do my tasks.' },
                        { value: 'TTF4', text: 'The System is a very helpful tool for me to perform my tasks.' }
                    ]
                },
                {
                    type: 'radiogroup',
                    name: 'chatbot_topic',
                    title: 'Which topic best describes what you mainly talked about during your interaction with the chatbot?',
                    isRequired: true,
                    choices: [
                        { value: 1, text: 'Debugging or fixing the bug' },
                        { value: 2, text: 'Coping with stress, emotions, or your personal experience during the task' },
                        { value: 3, text: 'Both technical issues and personal/stress-related aspects' },
                        { value: 4, text: 'Something else (please specify)' }
                    ]
                },
                {
                    type: 'text',
                    name: 'chatbot_topic_other',
                    title: 'Something else (please specify):',
                    visibleIf: '{chatbot_topic} = 4',
                    isRequired: true
                },
                {
                    type: 'comment',
                    name: 'open_feedback',
                    title: 'Open Feedback (Optional): What helped you the most about the chatbot – or what was missing?'
                }
            ]
        }
    ]
};
