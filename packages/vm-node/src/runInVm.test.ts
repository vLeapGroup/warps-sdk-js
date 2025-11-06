import { createNodeTransformRunner, runInVm } from './runInVm'

describe('runInVm', () => {
  it('should execute arrow function with results', async () => {
    const code = '(results) => results.value * 2'
    const results = { value: 5 }

    const result = await runInVm(code, results)
    expect(result).toBe(10)
  })

  it('should execute regular function with results', async () => {
    const code = 'function(results) { return results.value + 3 }'
    const results = { value: 7 }

    const result = await runInVm(code, results)
    expect(result).toBe(10)
  })

  it('should execute direct expression', async () => {
    const code = 'results.value * 3'
    const results = { value: 4 }

    const result = await runInVm(code, results)
    expect(result).toBe(12)
  })

  it('should handle complex results objects', async () => {
    const code = '(results) => results.user.name + " is " + results.user.age + " years old"'
    const results = { user: { name: 'John', age: 30 } }

    const result = await runInVm(code, results)
    expect(result).toBe('John is 30 years old')
  })

  it('should handle array operations', async () => {
    const code = '(results) => results.numbers.reduce((sum, num) => sum + num, 0)'
    const results = { numbers: [1, 2, 3, 4, 5] }

    const result = await runInVm(code, results)
    expect(result).toBe(15)
  })

  it('should handle conditional logic', async () => {
    const code = '(results) => results.value > 10 ? "high" : "low"'
    const results1 = { value: 15 }
    const results2 = { value: 5 }

    const result1 = await runInVm(code, results1)
    const result2 = await runInVm(code, results2)

    expect(result1).toBe('high')
    expect(result2).toBe('low')
  })

  it('should throw error for invalid code', async () => {
    const code = '(results) => invalidFunction()'
    const results = { value: 5 }

    await expect(runInVm(code, results)).rejects.toThrow()
  })

  it('should respect timeout', async () => {
    const code = 'while(true) {}' // Infinite loop
    const results = { value: 5 }

    await expect(runInVm(code, results)).rejects.toThrow()
  })
})

describe('createNodeTransformRunner', () => {
  it('should create a valid TransformRunner', () => {
    const runner = createNodeTransformRunner()

    expect(runner).toBeDefined()
    expect(typeof runner.run).toBe('function')
  })

  it('should execute transform through runner interface', async () => {
    const runner = createNodeTransformRunner()
    const code = '(results) => results.value * 2'
    const results = { value: 8 }

    const result = await runner.run(code, results)
    expect(result).toBe(16)
  })

  it('should handle multiple transformations', async () => {
    const runner = createNodeTransformRunner()
    const results = { value: 3 }

    const result1 = await runner.run('(results) => results.value + 1', results)
    const result2 = await runner.run('(results) => results.value * 2', results)

    expect(result1).toBe(4)
    expect(result2).toBe(6)
  })
})
