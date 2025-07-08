import { runInVm } from './runInVm'

describe('runInVm (Node)', () => {
  it('executes a simple function and returns the result', async () => {
    const code = '() => { return result.x + 1 }'
    const result = await runInVm(code, { x: 41 })
    expect(result).toBe(42)
  })

  it('throws on syntax error', async () => {
    const code = '() => { return result.x + }'
    await expect(runInVm(code, { x: 1 })).rejects.toThrow()
  })

  it('respects timeout', async () => {
    const code = '() => { while(true){} }'
    await expect(runInVm(code, {})).rejects.toThrow(/Script execution timed out/)
  })

  it('does not allow access to process or global', async () => {
    const code = '() => { return typeof process === "undefined" && typeof global === "undefined" }'
    const result = await runInVm(code, {})
    expect(result).toBe(true)
  })
})
