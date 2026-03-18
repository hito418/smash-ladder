import { defineConfig } from 'tsdown'

export default defineConfig({
  format: ['esm'],
  minify: true,
  treeshake: true,
  outDir: 'dist',
  clean: true,
})
