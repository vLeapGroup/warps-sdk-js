import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  format: ['cjs', 'esm'],
  minify: true,
  clean: true,
  external: [],
  target: 'es2020',
})
