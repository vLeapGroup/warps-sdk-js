export default {
  entry: ['src/runInVm.ts'],
  dts: true,
  format: ['esm'],
  outExtension: ({ format }) => ({
    js: '.mjs',
  }),
  minify: true,
  clean: true,
  skipNodeModulesBundle: true,
}
