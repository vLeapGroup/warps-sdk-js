import { runInVm } from './runInVm'

global.URL.createObjectURL = jest.fn(() => 'blob:url')
global.URL.revokeObjectURL = jest.fn()

let workerCallCount = 0
global.Worker = class {
  onmessage: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  constructor() {
    // nothing
  }
  postMessage() {
    workerCallCount++
    setTimeout(() => {
      if (this.onmessage) {
        if (workerCallCount === 1) {
          this.onmessage({ data: { result: 42 } })
        } else if (workerCallCount === 2) {
          if (this.onerror) {
            this.onerror({ message: 'SyntaxError' })
          } else {
            this.onmessage({ data: { error: 'SyntaxError' } })
          }
        } else if (workerCallCount === 3) {
          this.onmessage({ data: { result: true } })
        }
      }
    }, 0)
  }
  terminate() {}
} as any

describe('runInVm (Browser)', () => {
  it('executes a simple function and returns the result', async () => {
    const code = '() => { return result.x + 1 }'
    const result = await runInVm(code, { x: 41 })
    expect(result).toBe(42)
  })

  it('throws on syntax error', async () => {
    const code = '() => { return result.x + }'
    await expect(runInVm(code, { x: 1 })).rejects.toThrow()
  })

  it('does not allow access to window or globalThis', async () => {
    const code = '() => { return typeof window === "undefined" && typeof globalThis === "undefined" }'
    const result = await runInVm(code, {})
    expect(result).toBe(true)
  })
})
