import { defineConfig } from 'vitest/config'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
  ],
  test: {
    coverage: {
      provider: 'v8',
      include: ['app/**/*.{ts,tsx}', 'convex/**/*.ts'],
      exclude: [
        'app/routeTree.gen.ts',
        'convex/_generated/**',
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: [
            'app/**/*.test.ts',
            'convex/__tests__/**/*.test.ts',
          ],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          include: ['app/**/*.test.tsx'],
          environment: 'happy-dom',
        },
      },
    ],
  },
})
