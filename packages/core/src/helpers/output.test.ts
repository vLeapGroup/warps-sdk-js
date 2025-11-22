import { createMockConfig } from '../test-utils/mockConfig'
import { createMockWarp } from '../test-utils/sharedMocks'
import type { TransformRunner } from '../types'
import { Warp } from '../types'
import { WarpSerializer } from '../WarpSerializer'
import { evaluateOutputCommon, extractCollectOutput } from './output'

const testConfig = createMockConfig()

describe('Output Helpers', () => {
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
      output: {
        FOO: 'in.foo',
        BAR: 'in.bar',
      },
    } as any
    const response = { data: { some: 'value' } }
    const inputs = [
      { input: warp.actions[0].inputs[0], value: 'string:abc' },
      { input: warp.actions[0].inputs[1], value: 'string:xyz' },
    ]
    const { output } = await extractCollectOutput(warp, response, 1, inputs, new WarpSerializer(), testConfig)
    expect(output.FOO).toBe('abc')
    expect(output.BAR).toBe('xyz')
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
      output: {
        FOO: 'in.FOO_ALIAS',
      },
    } as any
    const response = { data: { some: 'value' } }
    const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:aliased' }]
    const { output } = await extractCollectOutput(warp, response, 1, inputs, new WarpSerializer(), testConfig)
    expect(output.FOO).toBe('aliased')
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
      output: {
        BAR: 'in.bar',
      },
    } as any
    const response = { data: { some: 'value' } }
    const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:abc' }]
    const { output } = await extractCollectOutput(warp, response, 1, inputs, new WarpSerializer(), testConfig)
    expect(output.BAR).toBeNull()
  })
})

describe('extractCollectOutput', () => {
  it('returns empty results when no results defined', async () => {
    const warp = {
      protocol: 'test',
      name: 'test',
      title: 'test',
      description: 'test',
      actions: [],
    } as Warp
    const response = {}

    const { values, output } = await extractCollectOutput(warp, response, 1, [], new WarpSerializer(), testConfig)

    expect(values).toEqual({ string: [], native: [], mapped: {} })
    expect(output).toEqual({})
  })

  it('extracts nested values from collect response', async () => {
    const warp = {
      protocol: 'test',
      name: 'test',
      title: 'test',
      description: 'test',
      actions: [],
      output: {
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

    const { values, output } = await extractCollectOutput(warp, response, 1, [], new WarpSerializer(), testConfig)

    expect(output.USERNAME).toBe('testuser')
    expect(output.ID).toBe('123')
    expect(output.ALL).toEqual(response.data)
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
      output: {
        USERNAME: 'out.data.username',
        MISSING: 'out.data.missing',
      },
    } as Warp

    const response = {
      data: {
        username: null,
      },
    }

    const { values, output } = await extractCollectOutput(warp, response, 1, [], new WarpSerializer(), testConfig)

    expect(output.USERNAME).toBeNull()
    expect(output.MISSING).toBeNull()
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
      output: {
        BASE: 'out.value',
        DOUBLED: 'transform:() => { return result.BASE * 2 }',
      },
    } as Warp

    const response = {
      value: 10,
    }

    await expect(extractCollectOutput(warp, response, 1, [], new WarpSerializer(), testConfig)).rejects.toThrow(
      'Transform output is defined but no transform runner is configured'
    )
  })

  describe('extractCollectOutput with array notation', () => {
    it('returns null for out[N] where N != current', async () => {
      const warp = {
        protocol: 'test',
        name: 'multi-action-test',
        title: 'Multi Action Test',
        description: 'Test multiple actions',
        actions: [{}, {}],
        output: {
          USERS_FROM_ACTION1: 'out[1].users',
          BALANCE_FROM_ACTION2: 'out[2].balance',
          CURRENT_ACTION_DATA: 'out',
        },
      } as any
      const response = { data: 'current-action-data' }
      const { output } = await extractCollectOutput(warp, response, 1, [], new WarpSerializer(), testConfig)
      expect(output.USERS_FROM_ACTION1).toBeNull()
      expect(output.BALANCE_FROM_ACTION2).toBeNull()
      expect(output.CURRENT_ACTION_DATA).toBe('current-action-data')
    })
  })

  describe('extractCollectOutput mapped field', () => {
    it('maps inputs by name when no inputs provided', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [],
      } as Warp
      const response = {}

      const { values } = await extractCollectOutput(warp, response, 1, [], new WarpSerializer(), testConfig)

      expect(values.mapped).toEqual({})
    })

    it('maps inputs by name', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'collect',
            inputs: [
              { name: 'amount', type: 'string', source: 'field' },
              { name: 'recipient', type: 'address', source: 'field' },
            ],
          },
        ],
      } as any
      const response = {}
      const inputs = [
        { input: warp.actions[0].inputs[0], value: 'string:100' },
        { input: warp.actions[0].inputs[1], value: 'address:0x123' },
      ]

      const { values } = await extractCollectOutput(warp, response, 1, inputs, new WarpSerializer(), testConfig)

      expect(values.mapped).toEqual({
        amount: '100',
        recipient: '0x123',
      })
    })

    it('maps inputs by "as" alias when provided', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'collect',
            inputs: [{ name: 'amount', as: 'AMOUNT', type: 'string', source: 'field' }],
          },
        ],
      } as any
      const response = {}
      const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:500' }]

      const { values } = await extractCollectOutput(warp, response, 1, inputs, new WarpSerializer(), testConfig)

      expect(values.mapped).toEqual({
        AMOUNT: '500',
      })
    })

    it('handles nested payload structures', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'collect',
            inputs: [
              { name: 'email', type: 'string', source: 'field', position: 'payload:data.customer' },
              { name: 'name', type: 'string', source: 'field', position: 'payload:data.customer' },
            ],
          },
        ],
      } as any
      const response = {}
      const inputs = [
        { input: warp.actions[0].inputs[0], value: 'string:test@example.com' },
        { input: warp.actions[0].inputs[1], value: 'string:John Doe' },
      ]

      const { values } = await extractCollectOutput(warp, response, 1, inputs, new WarpSerializer(), testConfig)

      expect(values.mapped).toEqual({
        data: {
          customer: {
            email: 'test@example.com',
            name: 'John Doe',
          },
        },
      })
    })

    it('handles biguint type conversion', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'collect',
            inputs: [{ name: 'amount', type: 'biguint', source: 'field' }],
          },
        ],
      } as any
      const response = {}
      const inputs = [{ input: warp.actions[0].inputs[0], value: 'biguint:1000000000000000000' }]

      const { values } = await extractCollectOutput(warp, response, 1, inputs, new WarpSerializer(), testConfig)

      expect(values.mapped).toEqual({
        amount: '1000000000000000000',
      })
    })

    it('handles asset type conversion', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'collect',
            inputs: [{ name: 'token', type: 'asset', source: 'field' }],
          },
        ],
      } as any
      const response = {}
      const inputs = [{ input: warp.actions[0].inputs[0], value: 'asset:EGLD|1000000000000000000' }]

      const { values } = await extractCollectOutput(warp, response, 1, inputs, new WarpSerializer(), testConfig)

      expect(values.mapped).toEqual({
        token: {
          identifier: 'EGLD',
          amount: '1000000000000000000',
        },
      })
    })

    it('handles null input values', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'collect',
            inputs: [
              { name: 'amount', type: 'string', source: 'field' },
              { name: 'optional', type: 'string', source: 'field' },
            ],
          },
        ],
      } as any
      const response = {}
      const inputs = [
        { input: warp.actions[0].inputs[0], value: 'string:100' },
        { input: warp.actions[0].inputs[1], value: null },
      ]

      const { values } = await extractCollectOutput(warp, response, 1, inputs, new WarpSerializer(), testConfig)

      expect(values.mapped).toEqual({
        amount: '100',
        optional: null,
      })
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

describe('evaluateOutputCommon with Transform Runners', () => {
  it('should evaluate transforms with Node.js runner', async () => {
    const warp = {
      ...createMockWarp(),
      output: {
        DOUBLED: 'transform: (context) => context.value * 2',
        ADDED: 'transform: (context) => context.value + 10',
        GREETING: 'transform: (context) => `Hello ${context.user.name}`',
        STATIC: 'out.value',
      },
    }

    const baseOutput = {
      STATIC: 'test-value',
      value: 5,
      user: { name: 'John' },
    }

    const nodeRunner = createMockNodeTransformRunner()
    const config = createMockConfig({ transform: { runner: nodeRunner } })
    const result = await evaluateOutputCommon(warp, baseOutput, 0, [], new WarpSerializer(), config)

    expect(result.DOUBLED).toBe(10)
    expect(result.ADDED).toBe(15)
    expect(result.GREETING).toBe('Hello John')
    expect(result.STATIC).toBe('test-value')
  })

  it('should evaluate transforms with browser runner', async () => {
    const warp = {
      ...createMockWarp(),
      output: {
        TRIPLED: 'transform: (context) => context.value * 3',
        SUBTRACTED: 'transform: (context) => context.value - 5',
        AGE_INFO: 'transform: (context) => `Age: ${context.user.age}`',
        STATIC: 'out.value',
      },
    }

    const baseOutput = {
      STATIC: 'test-value',
      value: 15,
      user: { age: 30 },
    }

    const browserRunner = createMockBrowserTransformRunner()
    const config = createMockConfig({ transform: { runner: browserRunner } })
    const result = await evaluateOutputCommon(warp, baseOutput, 0, [], new WarpSerializer(), config)

    expect(result.TRIPLED).toBe(45)
    expect(result.SUBTRACTED).toBe(10)
    expect(result.AGE_INFO).toBe('Age: 30')
    expect(result.STATIC).toBe('test-value')
  })

  it('should throw when transforms present and no runner provided', async () => {
    const warp = {
      ...createMockWarp(),
      output: {
        TRANSFORMED: 'transform: (context) => context.value * 2',
        STATIC: 'out.value',
      },
    }

    const baseOutput = {
      STATIC: 'test-value',
      value: 5,
    }

    const config = createMockConfig()
    await expect(evaluateOutputCommon(warp, baseOutput, 0, [], new WarpSerializer(), config)).rejects.toThrow(
      'Transform output is defined but no transform runner is configured'
    )
  })

  it('should handle transform errors gracefully', async () => {
    const warp = {
      ...createMockWarp(),
      output: {
        ERROR_TRANSFORM: 'transform: (context) => invalidFunction()',
        STATIC: 'out.value',
      },
    }

    const baseOutput = {
      STATIC: 'test-value',
      value: 5,
    }

    const errorRunner: TransformRunner = {
      run: async () => {
        throw new Error('Transform execution failed')
      },
    }

    const config = createMockConfig({ transform: { runner: errorRunner } })
    const result = await evaluateOutputCommon(warp, baseOutput, 0, [], new WarpSerializer(), config)

    expect(result.ERROR_TRANSFORM).toBeNull()
    expect(result.STATIC).toBe('test-value')
  })

  // Removed mixed transform/static extraction test as redundant

  it('should work with empty results', async () => {
    const warp = {
      ...createMockWarp(),
      output: {},
    }

    const baseOutput = {}
    const nodeRunner = createMockNodeTransformRunner()
    const config = createMockConfig({ transform: { runner: nodeRunner } })

    const result = await evaluateOutputCommon(warp, baseOutput, 0, [], new WarpSerializer(), config)

    expect(result).toEqual({})
  })

  it('should work with warp without results', async () => {
    const warp = createMockWarp()
    const baseOutput = { value: 5 }
    const nodeRunner = createMockNodeTransformRunner()
    const config = createMockConfig({ transform: { runner: nodeRunner } })

    const result = await evaluateOutputCommon(warp, baseOutput, 0, [], new WarpSerializer(), config)

    expect(result).toEqual({ value: 5 })
  })
})
