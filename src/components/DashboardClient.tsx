'use client';

import React, { useState, useMemo } from 'react';

type ResultData = {
    id: number;
    prolific_id: string;
    created_at: string;
    data: Record<string, any>;
};

const flattenData = (data: Record<string, any>) => {
    const flattened: Record<string, any> = {};

    // Explicitly add completion metadata if present
    if (data.completionPath) flattened['Completion Path'] = data.completionPath;
    if (data.completionCode) flattened['Completion Code'] = data.completionCode;

    Object.keys(data).forEach(stepKey => {
        const stepData = data[stepKey];
        if (typeof stepData !== 'object' || stepData === null) return;

        if (stepKey.startsWith('survey')) {
            // Extract all survey answers directly
            Object.entries(stepData).forEach(([qKey, answer]) => {
                flattened[qKey] = answer;
            });
        } else if (stepKey.startsWith('task')) {
            // Extract chat data from Tasks
            const formattedName = stepKey.replace(/task(\d+)/i, 'Task $1');
            if ('chatInteractions' in stepData) {
                flattened[`${formattedName} Chat`] = stepData.chatInteractions;
            }
            if ('chatHistory' in stepData) {
                flattened[`${formattedName} History`] = stepData.chatHistory;
            }
        }
    });
    return flattened;
};

export default function DashboardClient({ initialResults }: { initialResults: ResultData[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDetail, setSelectedDetail] = useState<Record<string, any> | null>(null);

    // Dynamic Columns Logic
    const dynamicColumns = useMemo(() => {
        const keys = new Set<string>();
        initialResults.forEach(res => {
            if (res.data && typeof res.data === 'object') {
                const flat = flattenData(res.data);
                Object.keys(flat).forEach(key => keys.add(key));
            }
        });

        const PREDEFINED_ORDER = [
            'Completion Path',
            'Completion Code',
            'age',
            'age_text',
            'gender',
            'gender_text',
            'education',
            'education_text',
            'experience',
            'experience_text',
            'competence_ide',
            'STRESS_T0',
            'scenario_consent',
            'Task 1 Chat',
            'STRESSN_T1',
            'PANAS_T1',
            'Task 2 Chat',
            'STRESS_T2',
            'PANAS_T2',
            'digital_agent_evaluation',
            'open_feedback'
        ];

        return Array.from(keys).sort((a, b) => {
            const indexA = PREDEFINED_ORDER.indexOf(a);
            const indexB = PREDEFINED_ORDER.indexOf(b);

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return 0; // Keep original insertion order for unknown keys
        });
    }, [initialResults]);

    const filteredResults = initialResults.filter(result => {
        const searchInput = searchTerm.toLowerCase();
        if (result.prolific_id?.toLowerCase().includes(searchInput)) return true;

        // Search inside flattened data
        const flat = flattenData(result.data || {});
        return Object.values(flat).some(val =>
            String(val).toLowerCase().includes(searchInput)
        );
    });

    // CSV Export Logic
    const handleExportCSV = () => {
        if (filteredResults.length === 0) return;

        const csvKeys = new Set<string>();
        const csvResults = filteredResults.map(result => {
            const flatData = flattenData(result.data || {});
            const csvFlatData: Record<string, any> = {};

            Object.entries(flatData).forEach(([k, v]) => {
                // If it's the chat history array, stringify it and keep it in one column
                if (k.endsWith('History')) {
                    csvFlatData[k] = JSON.stringify(v);
                    csvKeys.add(k);
                }
                else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                    Object.entries(v).forEach(([subK, subV]) => {
                        const newKey = `${k}_${subK}`;
                        csvFlatData[newKey] = subV;
                        csvKeys.add(newKey);
                    });
                } else {
                    csvFlatData[k] = v;
                    csvKeys.add(k);
                }
            });
            return { date: result.created_at, pId: result.prolific_id, data: csvFlatData };
        });

        const PREDEFINED_ORDER = [
            'Completion Path',
            'Completion Code',
            'age',
            'age_text',
            'gender',
            'gender_text',
            'education',
            'education_text',
            'experience',
            'experience_text',
            'competence_ide',
            'STRESS_T0',
            'scenario_consent',
            'Task 1 Chat',
            'STRESSN_T1',
            'PANAS_T1',
            'Task 2 Chat',
            'STRESS_T2',
            'PANAS_T2',
            'digital_agent_evaluation',
            'open_feedback'
        ];

        const csvColumns = Array.from(csvKeys).sort((a, b) => {
            const getIndex = (key: string) => {
                const exactMatch = PREDEFINED_ORDER.indexOf(key);
                if (exactMatch !== -1) return exactMatch;
                const prefixMatch = PREDEFINED_ORDER.findIndex(p => key.startsWith(p + '_'));
                return prefixMatch !== -1 ? prefixMatch : -1;
            };

            const indexA = getIndex(a);
            const indexB = getIndex(b);

            if (indexA !== -1 && indexB !== -1) {
                if (indexA === indexB) {
                    return a.localeCompare(b);
                }
                return indexA - indexB;
            }
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });

        // Header Row
        const headers = ['Date', 'Prolific ID', ...csvColumns].map(header => `"${header}"`);

        // Data Rows
        const rows = csvResults.map(res => {
            const date = `"${new Date(res.date).toLocaleString().replace(/"/g, '""')}"`;
            const pId = `"${(res.pId || '').replace(/"/g, '""')}"`;

            const dynamicValues = csvColumns.map(col => {
                let val = res.data[col];
                if (typeof val === 'object' && val !== null) {
                    val = JSON.stringify(val);
                }
                const formattedVal = val !== undefined && val !== null ? String(val).replace(/"/g, '""') : '';
                return `"${formattedVal}"`;
            });

            return [date, pId, ...dynamicValues].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');

        // Trigger Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `experiment_results_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full max-w-[95%] mx-auto p-4 md:p-8 font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Experiment Dashboard</h1>
                    <div className="text-sm text-gray-500 mt-1">
                        Total Participants: <span className="font-semibold text-gray-700">{initialResults.length}</span>
                    </div>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                    Export CSV
                </button>
            </div>

            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search by Prolific ID or answers..."
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 w-[150px]">
                                    Prolific ID
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    Date
                                </th>
                                {dynamicColumns.map((col) => (
                                    <th key={col} scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                        {col}
                                    </th>
                                ))}
                                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredResults.length > 0 ? (
                                filteredResults.map((result) => {
                                    const flatData = flattenData(result.data || {});
                                    return (
                                        <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 group-hover:bg-gray-50 border-r border-gray-100">
                                                <span className="px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-blue-100 text-blue-800">
                                                    {result.prolific_id}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {new Date(result.created_at).toLocaleString()}
                                            </td>
                                            {dynamicColumns.map((col) => {
                                                const val = flatData[col];

                                                if (typeof val === 'object' && val !== null) {
                                                    return (
                                                        <td key={col} className="px-6 py-4 align-top">
                                                            <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto bg-gray-50 border border-gray-200 rounded-md p-2 w-[280px] shadow-inner text-xs">
                                                                {Object.entries(val).map(([k, v]) => (
                                                                    <div key={k} className="flex justify-between items-start gap-3 border-b border-gray-200/60 pb-1.5 last:border-0 last:pb-0">
                                                                        <span className="font-semibold text-gray-700 break-words w-[45%]">{k}</span>
                                                                        <span className="text-gray-600 w-[55%] text-right bg-white px-1.5 py-0.5 rounded border border-gray-100">{String(v)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    );
                                                }

                                                const displayVal = String(val ?? '');
                                                return (
                                                    <td key={col} className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate align-top" title={displayVal}>
                                                        {displayVal}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white z-10 group-hover:bg-gray-50 border-l border-gray-100">
                                                <button
                                                    onClick={() => setSelectedDetail(result.data)}
                                                    className="text-blue-600 hover:text-blue-900 font-semibold"
                                                >
                                                    Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={dynamicColumns.length + 3} className="px-6 py-8 text-center text-sm text-gray-500">
                                        No results found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedDetail && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-800">Raw JSON Data</h3>
                            <button
                                onClick={() => setSelectedDetail(null)}
                                className="text-gray-400 hover:text-gray-700 transition-colors p-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-gray-900">
                            <pre className="text-gray-300 font-mono text-sm whitespace-pre-wrap break-words">
                                {JSON.stringify(selectedDetail, null, 2)}
                            </pre>
                        </div>
                        <div className="px-6 py-4 flex justify-end gap-3 border-t border-gray-100 bg-gray-50/50">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(JSON.stringify(selectedDetail, null, 2));
                                }}
                                className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm shadow-sm"
                            >
                                Copy to Clipboard
                            </button>
                            <button
                                onClick={() => setSelectedDetail(null)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
