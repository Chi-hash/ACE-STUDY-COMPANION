import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// No need to import expect/afterEach if globals: true is set in vitest.config.js
// but we still need to hook into the lifecycle if we want automatic cleanup

// Vitest globals are available here if configured
/* global afterEach */
afterEach(() => {
    cleanup();
});
