"use client";

import { useIdeStore } from "@/lib/store";
import { ScrollArea } from "@/components/scroll-area";

export function Terminal() {
    const { terminalOutput, files, addTerminalLine, clearTerminal, isTestRunning, setTestRunning } = useIdeStore();

    const handleRunTests = async () => {
        if (isTestRunning) return;
        setTestRunning(true);
        clearTerminal();
        addTerminalLine("> python3 -m unittest test_discount_service.py");
        addTerminalLine("Running tests...");

        // Simulate latency (Wait-Time-Stress)
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const code = files["discount_service.py"] || "";
        // Check if the specific buggy line is still present AND the fix hasn't been applied
        // The user might fix it by changing < 100 to <= 100, or adding a == 100 case.
        const hasFix = code.includes("<= 100") || code.includes("== 100");
        const hasErrorString = code.includes('raise RuntimeError("Connection to Pricing-Service timeout. Please retry.")');

        // If the error string is gone, OR the fix is present, then we consider it fixed.
        // But strictly, if they just removed the raise line without fixing logic, the calculation would be wrong (total not added).
        // For this simulation, let's assume if they added the fix, it works.
        const hasBug = hasErrorString && !hasFix;

        if (hasBug) {
            addTerminalLine("E");
            addTerminalLine("======================================================================");
            addTerminalLine("ERROR: test_black_friday_voucher_should_apply_discount (test_discount_service.TestDiscountService)");
            addTerminalLine("----------------------------------------------------------------------");
            addTerminalLine("Traceback (most recent call last):");
            addTerminalLine('  File "test_discount_service.py", line 16, in test_black_friday_voucher_should_apply_discount');
            addTerminalLine('    result = service.calculate_final_price(items, "BLACKFRIDAY")');
            addTerminalLine('  File "discount_service.py", line 27, in calculate_final_price');
            addTerminalLine('    raise RuntimeError("Connection to Pricing-Service timeout. Please retry.")');
            addTerminalLine("RuntimeError: Connection to Pricing-Service timeout. Please retry.");
            addTerminalLine("");
            addTerminalLine("----------------------------------------------------------------------");
            addTerminalLine("Ran 1 test in 2.801s");
            addTerminalLine("");
            addTerminalLine("FAILED (errors=1)");
        } else {
            addTerminalLine(".");
            addTerminalLine("----------------------------------------------------------------------");
            addTerminalLine("Ran 1 test in 2.801s");
            addTerminalLine("");
            addTerminalLine("OK");
        }

        setTestRunning(false);
    };

    return (
        <div className="h-[25vh] min-h-[200px] bg-[#1e1e1e] border-t border-[#3e3e3e] flex flex-col text-white font-mono text-xs">
            <div className="flex items-center justify-between px-4 py-1.5 bg-[#1e1e1e] border-b border-[#2d2d2d]">
                <div className="flex items-center gap-4 uppercase tracking-wider text-[10px] font-semibold text-gray-400">
                    <span className="border-b border-white text-white pb-0.5 cursor-pointer">Terminal</span>
                    <span className="cursor-pointer hover:text-gray-300">Output</span>
                    <span className="cursor-pointer hover:text-gray-300">Debug Console</span>
                    <span className="cursor-pointer hover:text-gray-300">Problems</span>
                </div>
                <div className="flex items-center">
                    <button
                        onClick={handleRunTests}
                        disabled={isTestRunning}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${isTestRunning
                            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                            : "bg-green-700 hover:bg-green-600 text-white"
                            }`}
                        title="Run Tests"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={isTestRunning ? "animate-spin" : ""}
                        >
                            {isTestRunning ? (
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            ) : (
                                <polygon points="5 3 19 12 5 21 5 3" />
                            )}
                        </svg>
                        {isTestRunning ? "Running..." : "Run Tests"}
                    </button>
                </div>
            </div>
            <ScrollArea className="flex-1 p-2">
                {terminalOutput.map((line, i) => (
                    <div key={i} className="mb-1 leading-tight font-mono text-gray-300 whitespace-pre-wrap">
                        {line}
                    </div>
                ))}
            </ScrollArea>
        </div>
    );
}
