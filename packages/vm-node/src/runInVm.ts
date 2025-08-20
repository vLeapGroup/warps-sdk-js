import type { TransformRunner } from '@vleap/warps'
import { VM } from 'vm2'

export const runInVm = async (code: string, context: any): Promise<any> => {
  try {
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
  } catch (e) {
    throw new Error(
      'The optional dependency "vm2" is not installed. To use runInVm in Node.js, please install vm2: npm install vm2 --save.'
    )
  }
}

export const createNodeTransformRunner = (): TransformRunner => ({
  run: runInVm,
})

export default createNodeTransformRunner
