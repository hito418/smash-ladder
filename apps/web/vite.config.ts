import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tsconfigPaths from 'vite-tsconfig-paths'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [tsconfigPaths(), TanStackRouterVite({ target: 'solid' }), solid()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: {
      port: 9432,
    },
  },
})
