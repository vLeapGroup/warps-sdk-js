import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outExtension: ({ format }) => ({
    js: '.mjs',
  }),
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['@vleap/warps'],
})
