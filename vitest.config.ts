import { fileURLToPath } from 'node:url';
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      pool: 'threads', // Switch to 'threads' or 'vmThreads'
      environment: 'jsdom',
      globals: true,
      exclude: [...configDefaults.exclude, 'e2e/**', 'src/components/__tests__/HelloWorld.spec.ts'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
);
