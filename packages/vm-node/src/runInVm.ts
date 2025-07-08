export const runInVm = async (code: string, result: any): Promise<any> => {
  let VM: any
  try {
    // Dynamically require vm2 only when needed
    VM = require('vm2').VM
  } catch (e) {
    throw new Error(
      'The optional dependency "vm2" is not installed. To use runInVm in Node.js, please install vm2: npm install vm2 --save.'
    )
  }
  const vm = new VM({ timeout: 2000, sandbox: { result }, eval: false, wasm: false })

  // Handle arrow function syntax: () => { return ... }
  if (code.trim().startsWith('(') && code.includes('=>')) {
    return vm.run(`(${code})(result)`)
  }

  return null
}
