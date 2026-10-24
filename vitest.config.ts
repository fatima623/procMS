import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/domain/**', 'src/application/**'],
      // The domain is pure; we expect high coverage there.
      thresholds: { lines: 85, functions: 85, branches: 80, statements: 85 },
    },
  },
  resolve: {
    alias: {
      '@/domain': path.resolve(__dirname, 'src/domain'),
      '@/application': path.resolve(__dirname, 'src/application'),
      '@/infrastructure': path.resolve(__dirname, 'src/infrastructure'),
      '@/interfaces': path.resolve(__dirname, 'src/interfaces'),
      '@/config': path.resolve(__dirname, 'src/config'),
      '@/app': path.resolve(__dirname, 'src/app'),
    },
  },
});
