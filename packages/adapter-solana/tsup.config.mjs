import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({
    js: format === 'esm' ? '.mjs' : '.js',
  }),
  dts: {
    compilerOptions: {
      skipLibCheck: true,
      moduleResolution: 'bundler',
    },
  },
  tsconfig: './tsconfig.json',
  splitting: false,
  sourcemap: true,
  clean: true,
  skipNodeModulesBundle: true,
  external: ['@scure/bip39'],
})
