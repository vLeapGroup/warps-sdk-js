/**
 * Executes transform code securely in Node.js (using vm2) or browser (using Web Worker).
 */
export const runInVm = async (code: string, result: any): Promise<any> => {
  if (typeof window === 'undefined') {
    let VM: any
    try {
      // Dynamically require vm2 only when needed
      VM = require('vm2').VM
    } catch (e) {
      throw new Error(
        'The optional dependency "vm2" is not installed. To use runInVm in Node.js, please install vm2: npm install vm2 --save. This is not required for browser usage.'
      )
    }
    const vm = new VM({ timeout: 1000, sandbox: { result }, eval: false, wasm: false })

    // Handle arrow function syntax: () => { return ... }
    if (code.trim().startsWith('(') && code.includes('=>')) {
      return vm.run(`(${code})(result)`)
    }

    return null
  }
  // Handle browser environment by creating a Web Worker
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob(
        [
          `
            self.onmessage = function(e) {
              try {
                const result = e.data;
                const output = (${code})(result);
                self.postMessage({ result: output });
              } catch (error) {
                self.postMessage({ error: error.toString() });
              }
            };
          `,
        ],
        { type: 'application/javascript' }
      )
      const url = URL.createObjectURL(blob)
      const worker = new Worker(url)
      worker.onmessage = function (e) {
        if (e.data.error) {
          reject(new Error(e.data.error))
        } else {
          resolve(e.data.result)
        }
        worker.terminate()
        URL.revokeObjectURL(url)
      }
      worker.onerror = function (e) {
        reject(new Error(`Error in transform: ${e.message}`))
        worker.terminate()
        URL.revokeObjectURL(url)
      }
      worker.postMessage(result)
    } catch (err) {
      return reject(err)
    }
  })
}
