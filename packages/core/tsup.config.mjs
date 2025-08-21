import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  format: ['esm'],
  outExtension: ({ format }) => ({
    js: '.mjs',
  }),
  minify: true,
  clean: true,
  external: ['crypto', 'node:crypto'],
  target: 'es2020',
})
