export const runInVm = async (code: string, result: any): Promise<any> => {
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
