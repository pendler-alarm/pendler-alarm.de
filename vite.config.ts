import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
// import vueDevTools from 'vite-plugin-vue-devtools';

// const isWallaby = process.env.WALLABY === 'true';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx()/*, vueDevTools()*/],
  test: {
    // pool: isWallaby ? 'threads' : 'forks',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    }
  }
});
