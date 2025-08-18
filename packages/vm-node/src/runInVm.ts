import type { TransformRunner } from '@vleap/warps'

export const runInVm = async (code: string, context: any): Promise<any> => {
  let VM: any
  try {
    // Dynamically require vm2 only when needed
    VM = require('vm2').VM
  } catch (e) {
    throw new Error(
      'The optional dependency "vm2" is not installed. To use runInVm in Node.js, please install vm2: npm install vm2 --save.'
    )
  }
  const vm = new VM({ timeout: 2000, sandbox: { context }, eval: false, wasm: false })

  // Handle arrow function syntax: () => { return ... }
  if (code.trim().startsWith('(') && code.includes('=>')) {
    return vm.run(`(${code})(context)`)
  }

  // Handle regular function syntax: function() { return ... }
  if (code.trim().startsWith('function')) {
    return vm.run(`(${code})(context)`)
  }

  // Handle direct expression: context.value * 2
  return vm.run(`(${code})`)
}

export const createNodeTransformRunner = (): TransformRunner => ({
  run: runInVm,
})

export default createNodeTransformRunner
