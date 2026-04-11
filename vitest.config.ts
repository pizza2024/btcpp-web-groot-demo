import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: [
      '**/node_modules/**',
      '**/tests/**/*.spec.ts',
      '**/tests/**/*.test.ts',
    ],
  },
});
