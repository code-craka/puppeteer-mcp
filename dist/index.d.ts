#!/usr/bin/env node
declare global {
    interface Window {
        mcpHelper: {
            logs: string[];
            originalConsole: Partial<typeof console>;
        };
    }
}
export {};
