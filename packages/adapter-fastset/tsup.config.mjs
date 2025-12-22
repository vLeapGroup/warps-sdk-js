import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({
    js: format === 'esm' ? '.mjs' : '.js',
  }),
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  noExternal: ['@noble/hashes', '@mysten/bcs'],
  external: ['@noble/ed25519', '@noble/utils', '@noble/abstract'],
})
