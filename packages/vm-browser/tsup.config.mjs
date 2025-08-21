export default {
  entry: ['src/runInVm.ts'],
  dts: true,
  format: ['esm'],
  outExtension: ({ format }) => ({
    js: '.mjs',
  }),
  minify: true,
  clean: true,
  exclude: ['**/*.test.ts', '**/*.test.js', '**/__tests__/**', '**/test-utils/**'],
}
