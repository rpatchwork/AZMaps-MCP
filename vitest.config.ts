import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      exclude: ['tests/**', 'dist/**', 'node_modules/**', '**/*.test.ts', '**/*.spec.ts'],
      include: ['src/**/*.ts'],
      lines: 80,
      functions: 90,
      branches: 75,
      statements: 80,
      thresholds: {
        lines: 80,
        functions: 90,
        branches: 75,
        statements: 80,
      },
    },
    testTimeout: 10000, // 10s for integration tests
    setupFiles: ['./tests/setup.ts'],
  },
});
