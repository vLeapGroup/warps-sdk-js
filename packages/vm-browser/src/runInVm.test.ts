import { createBrowserTransformRunner, runInVm } from './runInVm'

// Mock Web Worker for testing
const mockWorker = {
  onmessage: null as any,
  onerror: null as any,
  postMessage: jest.fn(),
  terminate: jest.fn(),
}

const mockBlob = {
  type: 'application/javascript',
}

const mockURL = {
  createObjectURL: jest.fn(() => 'mock-url'),
  revokeObjectURL: jest.fn(),
}

// Mock global objects
global.Worker = jest.fn(() => mockWorker) as any
global.Blob = jest.fn(() => mockBlob) as any
global.URL.createObjectURL = mockURL.createObjectURL
global.URL.revokeObjectURL = mockURL.revokeObjectURL

describe('runInVm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWorker.onmessage = null
    mockWorker.onerror = null
  })

  it('should execute arrow function with context', async () => {
    const code = '(context) => context.value * 2'
    const context = { value: 5 }

    const promise = runInVm(code, context)

    // Simulate worker response
    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 10 } })
    }, 0)

    const result = await promise
    expect(result).toBe(10)
  })

  it('should execute regular function with context', async () => {
    const code = 'function(context) { return context.value + 3 }'
    const context = { value: 7 }

    const promise = runInVm(code, context)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 10 } })
    }, 0)

    const result = await promise
    expect(result).toBe(10)
  })

  it('should execute direct expression', async () => {
    const code = 'return context.value * 3'
    const context = { value: 4 }

    const promise = runInVm(code, context)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 12 } })
    }, 0)

    const result = await promise
    expect(result).toBe(12)
  })

  it('should handle complex context objects', async () => {
    const code = '(context) => context.user.name + " is " + context.user.age + " years old"'
    const context = { user: { name: 'John', age: 30 } }

    const promise = runInVm(code, context)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 'John is 30 years old' } })
    }, 0)

    const result = await promise
    expect(result).toBe('John is 30 years old')
  })

  it('should handle array operations', async () => {
    const code = '(context) => context.numbers.reduce((sum, num) => sum + num, 0)'
    const context = { numbers: [1, 2, 3, 4, 5] }

    const promise = runInVm(code, context)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 15 } })
    }, 0)

    const result = await promise
    expect(result).toBe(15)
  })

  it('should handle conditional logic', async () => {
    const code = '(context) => context.value > 10 ? "high" : "low"'
    const context = { value: 15 }

    const promise = runInVm(code, context)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 'high' } })
    }, 0)

    const result = await promise
    expect(result).toBe('high')
  })

  it('should handle worker errors', async () => {
    const code = '(context) => invalidFunction()'
    const context = { value: 5 }

    const promise = runInVm(code, context)

    setTimeout(() => {
      mockWorker.onmessage({ data: { error: 'ReferenceError: invalidFunction is not defined' } })
    }, 0)

    await expect(promise).rejects.toThrow('ReferenceError: invalidFunction is not defined')
  })

  it('should handle worker onerror', async () => {
    const code = '(context) => context.value * 2'
    const context = { value: 5 }

    const promise = runInVm(code, context)

    setTimeout(() => {
      mockWorker.onerror({ message: 'Worker error' })
    }, 0)

    await expect(promise).rejects.toThrow('Error in transform: Worker error')
  })

  it('should create blob with correct content', async () => {
    const code = '(context) => context.value * 2'
    const context = { value: 5 }

    const promise = runInVm(code, context)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 10 } })
    }, 0)

    await promise

    expect(global.Blob).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('self.onmessage')]), {
      type: 'application/javascript',
    })
  })

  it('should post message with context', async () => {
    const code = '(context) => context.value * 2'
    const context = { value: 5 }

    const promise = runInVm(code, context)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 10 } })
    }, 0)

    await promise

    expect(mockWorker.postMessage).toHaveBeenCalledWith(context)
  })

  it('should clean up resources', async () => {
    const code = '(context) => context.value * 2'
    const context = { value: 5 }

    const promise = runInVm(code, context)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 10 } })
    }, 0)

    await promise

    expect(mockWorker.terminate).toHaveBeenCalled()
    expect(mockURL.revokeObjectURL).toHaveBeenCalledWith('mock-url')
  })
})

describe('createBrowserTransformRunner', () => {
  it('should create a valid TransformRunner', () => {
    const runner = createBrowserTransformRunner()

    expect(runner).toBeDefined()
    expect(typeof runner.run).toBe('function')
  })

  it('should execute transform through runner interface', async () => {
    const runner = createBrowserTransformRunner()
    const code = '(context) => context.value * 2'
    const context = { value: 8 }

    const promise = runner.run(code, context)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 16 } })
    }, 0)

    const result = await promise
    expect(result).toBe(16)
  })

  it('should handle multiple transformations', async () => {
    const runner = createBrowserTransformRunner()
    const context = { value: 3 }

    const promise = runner.run('(context) => context.value + 1', context)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 4 } })
    }, 0)

    const result = await promise
    expect(result).toBe(4)
  })
})
