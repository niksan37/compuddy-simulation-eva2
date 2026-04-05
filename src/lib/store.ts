import { create } from 'zustand';

interface IdeState {
    activeFile: string;
    files: Record<string, string>;
    terminalOutput: string[];
    isChatOpen: boolean;
    isTestRunning: boolean;
    setActiveFile: (file: string) => void;
    updateFile: (file: string, content: string) => void;
    addTerminalLine: (line: string) => void;
    clearTerminal: () => void;
    toggleChat: () => void;
    setChatOpen: (isOpen: boolean) => void;
    setTestRunning: (isRunning: boolean) => void;
    chatInteractionCount: number;
    incrementChatInteraction: () => void;
    resetChatInteraction: () => void;
    chatMessages: Record<string, any>[];
    addChatMessage: (msg: Record<string, any>) => void;
    clearChatMessages: () => void;
}

export const useIdeStore = create<IdeState>((set) => ({
    activeFile: 'discount_service.py',
    files: {
        'discount_service.py': `import time
import math

class OrderItem:
    def __init__(self, name, price, is_available=True):
        self.name = name
        self.price = price
        self.is_available = is_available

class DiscountService:
    def calculate_final_price(self, items, voucher_code):
        total = 0.0
        
        # Filter available items
        x = [i for i in items if i.is_available]
        
        self._check_db_connection()

        if voucher_code == "BLACKFRIDAY":
            for y in x:
                if y.price > 100:
                    total += (y.price * 0.8)
                elif y.price < 100:
                    total += y.price
                else:
                    # Connection check failed during processing
                    raise RuntimeError("Connection to Pricing-Service timeout. Please retry.")
        else:
            total = sum(i.price for i in x)

        # Finalize transaction
        time.sleep(0.8)

        return round(total, 2)

    def _check_db_connection(self):
        # Simulating handshake
        time.sleep(2)
`,
        'test_discount_service.py': `import unittest
from discount_service import DiscountService, OrderItem

class TestDiscountService(unittest.TestCase):

    def test_black_friday_voucher_should_apply_discount(self):
        # Arrange
        service = DiscountService()
        items = [
            OrderItem("Laptop", 1200.00), 
            OrderItem("Mouse", 50.00),    
            OrderItem("Headset", 100.00)  
        ]

        # Act
        result = service.calculate_final_price(items, "BLACKFRIDAY")

        # Assert
        # Expected: 960 (1200*0.8) + 50 + 100 = 1110
        self.assertEqual(1110.00, result)

if __name__ == '__main__':
    unittest.main()
`
    },
    terminalOutput: ['> Ready.'],
    isChatOpen: false,
    isTestRunning: false,
    setActiveFile: (file) => set({ activeFile: file }),
    updateFile: (file, content) => set((state) => ({
        files: { ...state.files, [file]: content }
    })),
    addTerminalLine: (line) =>
        set((state) => ({ terminalOutput: [...state.terminalOutput, line] })),
    clearTerminal: () => set({ terminalOutput: [] }),
    toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
    setChatOpen: (isOpen) => set({ isChatOpen: isOpen }),
    setTestRunning: (isRunning) => set({ isTestRunning: isRunning }),
    chatInteractionCount: 0,
    incrementChatInteraction: () => set((state) => ({ chatInteractionCount: state.chatInteractionCount + 1 })),
    resetChatInteraction: () => set({ chatInteractionCount: 0 }),
    chatMessages: [],
    addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
    clearChatMessages: () => set({ chatMessages: [] })
}));
