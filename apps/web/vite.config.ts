import tanstackRouter from '@tanstack/router-plugin/vite'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), tanstackRouter({ target: 'solid' }), solid()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: {
      port: 9432,
    },
  },
})
