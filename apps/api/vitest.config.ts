import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './src/test/testDatabase.ts';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'prisma/**/*.test.ts'],
    globalSetup: ['./src/test/globalSetup.ts'],
    // The API tests share one database, so test files run one at a time.
    fileParallelism: false,
    testTimeout: 15_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'test-only-secret-that-is-long-enough',
      WEB_ORIGIN: 'http://localhost:5173',
    },
  },
});
