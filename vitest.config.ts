import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/server/tests/**/*.test.ts'],
    coverage: {
      include: ['apps/server/src/**/*.ts'],
      exclude: ['apps/server/src/cli.ts', 'apps/server/src/server.ts'],
    },
  },
});
