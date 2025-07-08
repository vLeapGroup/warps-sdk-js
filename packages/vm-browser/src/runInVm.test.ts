import { runInVm } from './runInVm'

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
