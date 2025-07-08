import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  format: ['cjs', 'esm'],
  minify: true,
  clean: true,
  external: ['@vleap/warps-core', '@multiversx/sdk-core'],
})
