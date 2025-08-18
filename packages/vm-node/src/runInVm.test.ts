import { createNodeTransformRunner, runInVm } from './runInVm'

describe('runInVm', () => {
  it('should execute arrow function with context', async () => {
    const code = '(context) => context.value * 2'
    const context = { value: 5 }

    const result = await runInVm(code, context)
    expect(result).toBe(10)
  })

  it('should execute regular function with context', async () => {
    const code = 'function(context) { return context.value + 3 }'
    const context = { value: 7 }

    const result = await runInVm(code, context)
    expect(result).toBe(10)
  })

  it('should execute direct expression', async () => {
    const code = 'context.value * 3'
    const context = { value: 4 }

    const result = await runInVm(code, context)
    expect(result).toBe(12)
  })

  it('should handle complex context objects', async () => {
    const code = '(context) => context.user.name + " is " + context.user.age + " years old"'
    const context = { user: { name: 'John', age: 30 } }

    const result = await runInVm(code, context)
    expect(result).toBe('John is 30 years old')
  })

  it('should handle array operations', async () => {
    const code = '(context) => context.numbers.reduce((sum, num) => sum + num, 0)'
    const context = { numbers: [1, 2, 3, 4, 5] }

    const result = await runInVm(code, context)
    expect(result).toBe(15)
  })

  it('should handle conditional logic', async () => {
    const code = '(context) => context.value > 10 ? "high" : "low"'
    const context1 = { value: 15 }
    const context2 = { value: 5 }

    const result1 = await runInVm(code, context1)
    const result2 = await runInVm(code, context2)

    expect(result1).toBe('high')
    expect(result2).toBe('low')
  })

  it('should throw error for invalid code', async () => {
    const code = '(context) => invalidFunction()'
    const context = { value: 5 }

    await expect(runInVm(code, context)).rejects.toThrow()
  })

  it('should respect timeout', async () => {
    const code = 'while(true) {}' // Infinite loop
    const context = { value: 5 }

    await expect(runInVm(code, context)).rejects.toThrow()
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
    const code = '(context) => context.value * 2'
    const context = { value: 8 }

    const result = await runner.run(code, context)
    expect(result).toBe(16)
  })

  it('should handle multiple transformations', async () => {
    const runner = createNodeTransformRunner()
    const context = { value: 3 }

    const result1 = await runner.run('(context) => context.value + 1', context)
    const result2 = await runner.run('(context) => context.value * 2', context)

    expect(result1).toBe(4)
    expect(result2).toBe(6)
  })
})
