import type { TransformRunner } from '@vleap/warps'

export const runInVm = async (code: string, context: any): Promise<any> => {
  // Handle browser environment by creating a Web Worker
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob(
        [
          `
            self.onmessage = function(e) {
              try {
                const context = e.data;
                let output;

                // Handle arrow function syntax: () => { return ... }
                if (${JSON.stringify(code.trim())}.startsWith('(') && ${JSON.stringify(code)}.includes('=>')) {
                  output = (${code})(context);
                }
                // Handle regular function syntax: function() { return ... }
                else if (${JSON.stringify(code.trim())}.startsWith('function')) {
                  output = (${code})(context);
                }
                // Handle direct expression: return context.value * 2
                else {
                  output = eval(${JSON.stringify(code)});
                }

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
      worker.postMessage(context)
    } catch (err) {
      return reject(err)
    }
  })
}

export const createBrowserTransformRunner = (): TransformRunner => ({
  run: runInVm,
})

export default createBrowserTransformRunner
