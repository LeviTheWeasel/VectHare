import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Test file patterns
        include: ['tests/**/*.test.js'],

        // Environment
        environment: 'node',

        // Globals (describe, it, expect available without import)
        globals: true,

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['core/**/*.js', 'utils/**/*.js'],
            exclude: ['**/node_modules/**', 'tests/**']
        },

        // Reporter
        reporters: ['verbose'],

        // Timeouts
        testTimeout: 10000,
        hookTimeout: 10000
    }
});
