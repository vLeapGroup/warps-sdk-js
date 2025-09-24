import { createMockConfig } from '../test-utils/mockConfig'
import { createMockWarp } from '../test-utils/sharedMocks'
import type { TransformRunner } from '../types'
import { Warp } from '../types'
import { WarpSerializer } from '../WarpSerializer'
import { evaluateResultsCommon, extractCollectResults } from './results'

const testConfig = createMockConfig()

describe('Result Helpers', () => {
  it('returns input-based result by input name (collect)', async () => {
    const warp = {
      protocol: 'test',
      name: 'test',
      title: 'test',
      description: 'test',
      actions: [
        {
          type: 'collect',
          label: 'Test Collect',
          destination: { url: 'https://api.example.com' },
          inputs: [
            { name: 'foo', type: 'string', source: 'field' },
            { name: 'bar', type: 'string', source: 'field' },
          ],
        },
      ],
      results: {
        FOO: 'input.foo',
        BAR: 'input.bar',
      },
    } as any
    const response = { data: { some: 'value' } }
    const inputs = [
      { input: warp.actions[0].inputs[0], value: 'string:abc' },
      { input: warp.actions[0].inputs[1], value: 'string:xyz' },
    ]
    const { results } = await extractCollectResults(warp, response, 1, inputs, new WarpSerializer())
    expect(results.FOO).toBe('abc')
    expect(results.BAR).toBe('xyz')
  })

  it('returns input-based result by input.as alias (collect)', async () => {
    const warp = {
      protocol: 'test',
      name: 'test',
      title: 'test',
      description: 'test',
      actions: [
        {
          type: 'collect',
          label: 'Test Collect',
          destination: { url: 'https://api.example.com' },
          inputs: [{ name: 'foo', as: 'FOO_ALIAS', type: 'string', source: 'field' }],
        },
      ],
      results: {
        FOO: 'input.FOO_ALIAS',
      },
    } as any
    const response = { data: { some: 'value' } }
    const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:aliased' }]
    const { results } = await extractCollectResults(warp, response, 1, inputs, new WarpSerializer())
    expect(results.FOO).toBe('aliased')
  })

  it('returns null for missing input (collect)', async () => {
    const warp = {
      protocol: 'test',
      name: 'test',
      title: 'test',
      description: 'test',
      actions: [
        {
          type: 'collect',
          label: 'Test Collect',
          destination: { url: 'https://api.example.com' },
          inputs: [{ name: 'foo', type: 'string', source: 'field' }],
        },
      ],
      results: {
        BAR: 'input.bar',
      },
    } as any
    const response = { data: { some: 'value' } }
    const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:abc' }]
    const { results } = await extractCollectResults(warp, response, 1, inputs, new WarpSerializer())
    expect(results.BAR).toBeNull()
  })
})

describe('extractCollectResults', () => {
  it('returns empty results when no results defined', async () => {
    const warp = {
      protocol: 'test',
      name: 'test',
      title: 'test',
      description: 'test',
      actions: [],
    } as Warp
    const response = {}

    const { values, results } = await extractCollectResults(warp, response, 1, [], new WarpSerializer())

    expect(values).toEqual({ string: [], native: [] })
    expect(results).toEqual({})
  })

  it('extracts nested values from collect response', async () => {
    const warp = {
      protocol: 'test',
      name: 'test',
      title: 'test',
      description: 'test',
      actions: [],
      results: {
        USERNAME: 'out.data.username',
        ID: 'out.data.id',
        ALL: 'out',
      },
    } as Warp

    const response = {
      data: {
        username: 'testuser',
        id: '123',
      },
    }

    const { values, results } = await extractCollectResults(warp, response, 1, [], new WarpSerializer())

    expect(results.USERNAME).toBe('testuser')
    expect(results.ID).toBe('123')
    expect(results.ALL).toEqual(response.data)
    expect(values.string).toHaveLength(3)
    expect(values.native).toHaveLength(3)
  })

  it('handles null values in response', async () => {
    const warp = {
      protocol: 'test',
      name: 'test',
      title: 'test',
      description: 'test',
      actions: [],
      results: {
        USERNAME: 'out.data.username',
        MISSING: 'out.data.missing',
      },
    } as Warp

    const response = {
      data: {
        username: null,
      },
    }

    const { values, results } = await extractCollectResults(warp, response, 1, [], new WarpSerializer())

    expect(results.USERNAME).toBeNull()
    expect(results.MISSING).toBeNull()
    expect(values.string).toHaveLength(2)
    expect(values.native).toHaveLength(2)
  })

  it('evaluates transform results in collect', async () => {
    const warp = {
      protocol: 'test',
      name: 'test',
      title: 'test',
      description: 'test',
      actions: [],
      results: {
        BASE: 'out.value',
        DOUBLED: 'transform:() => { return result.BASE * 2 }',
      },
    } as Warp

    const response = {
      value: 10,
    }

    await expect(extractCollectResults(warp, response, 1, [], new WarpSerializer())).rejects.toThrow(
      'Transform results are defined but no transform runner is configured'
    )
  })

  describe('extractCollectResults with array notation', () => {
    it('returns null for out[N] where N != current', async () => {
      const warp = {
        protocol: 'test',
        name: 'multi-action-test',
        title: 'Multi Action Test',
        description: 'Test multiple actions',
        actions: [{}, {}],
        results: {
          USERS_FROM_ACTION1: 'out[1].users',
          BALANCE_FROM_ACTION2: 'out[2].balance',
          CURRENT_ACTION_DATA: 'out',
        },
      } as any
      const response = { data: 'current-action-data' }
      const { results } = await extractCollectResults(warp, response, 1, [])
      expect(results.USERS_FROM_ACTION1).toBeNull()
      expect(results.BALANCE_FROM_ACTION2).toBeNull()
      expect(results.CURRENT_ACTION_DATA).toBe('current-action-data')
    })
  })
})

// Simple mock transformers using eval for testing
const createMockNodeTransformRunner = (): TransformRunner => ({
  run: async (code: string, context: any) => {
    const fn = eval(code)
    return typeof fn === 'function' ? fn(context) : fn
  },
})

const createMockBrowserTransformRunner = (): TransformRunner => ({
  run: async (code: string, context: any) => {
    const fn = eval(code)
    return typeof fn === 'function' ? fn(context) : fn
  },
})

describe('evaluateResultsCommon with Transform Runners', () => {
  it('should evaluate transforms with Node.js runner', async () => {
    const warp = {
      ...createMockWarp(),
      results: {
        DOUBLED: 'transform: (context) => context.value * 2',
        ADDED: 'transform: (context) => context.value + 10',
        GREETING: 'transform: (context) => `Hello ${context.user.name}`',
        STATIC: 'out.value',
      },
    }

    const baseResults = {
      STATIC: 'test-value',
      value: 5,
      user: { name: 'John' },
    }

    const nodeRunner = createMockNodeTransformRunner()
    const result = await evaluateResultsCommon(warp, baseResults, 0, [], new WarpSerializer(), nodeRunner)

    expect(result.DOUBLED).toBe(10)
    expect(result.ADDED).toBe(15)
    expect(result.GREETING).toBe('Hello John')
    expect(result.STATIC).toBe('test-value')
  })

  it('should evaluate transforms with browser runner', async () => {
    const warp = {
      ...createMockWarp(),
      results: {
        TRIPLED: 'transform: (context) => context.value * 3',
        SUBTRACTED: 'transform: (context) => context.value - 5',
        AGE_INFO: 'transform: (context) => `Age: ${context.user.age}`',
        STATIC: 'out.value',
      },
    }

    const baseResults = {
      STATIC: 'test-value',
      value: 15,
      user: { age: 30 },
    }

    const browserRunner = createMockBrowserTransformRunner()
    const result = await evaluateResultsCommon(warp, baseResults, 0, [], new WarpSerializer(), browserRunner)

    expect(result.TRIPLED).toBe(45)
    expect(result.SUBTRACTED).toBe(10)
    expect(result.AGE_INFO).toBe('Age: 30')
    expect(result.STATIC).toBe('test-value')
  })

  it('should throw when transforms present and no runner provided', async () => {
    const warp = {
      ...createMockWarp(),
      results: {
        TRANSFORMED: 'transform: (context) => context.value * 2',
        STATIC: 'out.value',
      },
    }

    const baseResults = {
      STATIC: 'test-value',
      value: 5,
    }

    await expect(evaluateResultsCommon(warp, baseResults, 0, [], null)).rejects.toThrow(
      'Transform results are defined but no transform runner is configured'
    )
  })

  it('should handle transform errors gracefully', async () => {
    const warp = {
      ...createMockWarp(),
      results: {
        ERROR_TRANSFORM: 'transform: (context) => invalidFunction()',
        STATIC: 'out.value',
      },
    }

    const baseResults = {
      STATIC: 'test-value',
      value: 5,
    }

    const errorRunner: TransformRunner = {
      run: async () => {
        throw new Error('Transform execution failed')
      },
    }

    const result = await evaluateResultsCommon(warp, baseResults, 0, [], new WarpSerializer(), errorRunner)

    expect(result.ERROR_TRANSFORM).toBeNull()
    expect(result.STATIC).toBe('test-value')
  })

  // Removed mixed transform/static extraction test as redundant

  it('should work with empty results', async () => {
    const warp = {
      ...createMockWarp(),
      results: {},
    }

    const baseResults = {}
    const nodeRunner = createMockNodeTransformRunner()

    const result = await evaluateResultsCommon(warp, baseResults, 0, [], new WarpSerializer(), nodeRunner)

    expect(result).toEqual({})
  })

  it('should work with warp without results', async () => {
    const warp = createMockWarp()
    const baseResults = { value: 5 }
    const nodeRunner = createMockNodeTransformRunner()

    const result = await evaluateResultsCommon(warp, baseResults, 0, [], new WarpSerializer(), nodeRunner)

    expect(result).toEqual({ value: 5 })
  })
})
