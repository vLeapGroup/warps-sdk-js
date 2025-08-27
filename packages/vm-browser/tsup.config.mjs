export default {
  entry: ['src/runInVm.ts'],
  dts: true,
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({
    js: format === 'esm' ? '.mjs' : '.js',
  }),
  minify: true,
  clean: true,
  skipNodeModulesBundle: true,
}
