'use client';

import React, { useEffect, useState } from 'react';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/survey-core.css'

type SurveyComponentProps = {
    surveyJson: any;
    onComplete: (data: any) => void;
    savedData?: any;
};

export default function SurveyComponent({ surveyJson, onComplete, savedData }: SurveyComponentProps) {
    // Use state to avoid hydration mismatch and only instantiate Model on client
    const [surveyModel, setSurveyModel] = useState<Model | null>(null);

    useEffect(() => {
        const model = new Model(surveyJson);

        // Restore previous data if it exists (e.g. user went back or reloaded within survey)
        if (savedData) {
            model.data = savedData;
        }

        model.onComplete.add((sender) => {
            const enrichedData = { ...sender.data };

            // Enrich specific demographic fields with their display text (string value)
            sender.getAllQuestions().forEach(q => {
                if (['age', 'gender', 'education', 'experience'].includes(q.name)) {
                    enrichedData[`${q.name}_text`] = String(q.displayValue !== undefined ? q.displayValue : q.value);
                }
            });

            onComplete(enrichedData);
        });

        model.onCurrentPageChanging.add((sender, options) => {
            if (options.oldCurrentPage.name === 'Block_1_Demographics' && options.isNextPage) {
                if (sender.data.competence_ide !== undefined && sender.data.competence_ide < 3) {
                    options.allow = false;
                    sender.doComplete();
                }
            }
        });

        setSurveyModel(model);
    }, [surveyJson, onComplete, savedData]);

    if (!surveyModel) {
        return <div className="p-8 text-center text-gray-500">Loading survey...</div>;
    }

    return (
        <div className="bg-white shadow-sm rounded-xl">
            <Survey model={surveyModel} />
        </div>
    );
}
