import { Warp, WarpMcpAction } from '@vleap/warps'
import fetchMock from 'jest-fetch-mock'
import { z } from 'zod'
import { convertMcpToolToWarp, convertWarpToMcpCapabilities } from './warps'

const getInnerSchema = (schema: z.ZodTypeAny): z.ZodTypeAny => {
  if ((schema as any)._def?.typeName === 'ZodOptional') {
    return (schema as any)._def.innerType
  }
  return schema
}

const isZodString = (schema: z.ZodTypeAny): schema is z.ZodString => {
  const inner = getInnerSchema(schema)
  return inner instanceof z.ZodString || (inner as any)._def?.typeName === 'ZodString'
}

const isZodNumber = (schema: z.ZodTypeAny): schema is z.ZodNumber => {
  const inner = getInnerSchema(schema)
  return inner instanceof z.ZodNumber || (inner as any)._def?.typeName === 'ZodNumber'
}

const isZodBoolean = (schema: z.ZodTypeAny): schema is z.ZodBoolean => {
  const inner = getInnerSchema(schema)
  return inner instanceof z.ZodBoolean || (inner as any)._def?.typeName === 'ZodBoolean'
}

const isZodOptional = (schema: z.ZodTypeAny): boolean => {
  return (schema as any)._def?.typeName === 'ZodOptional'
}

const isZodEnum = (schema: z.ZodTypeAny): schema is z.ZodEnum<any> => {
  return (schema as any)._def?.typeName === 'ZodEnum' || schema instanceof z.ZodEnum
}

const getZodDescription = (schema: z.ZodTypeAny): string | undefined => {
  return (schema as any)._def?.description
}

describe('convertMcpToolToWarp', () => {
  const mockConfig = { env: 'mainnet' as const }
  const mockUrl = 'https://mcp.example.com'
  const mockHeaders = { Authorization: 'Bearer test-token' }

  it('converts basic MCP tool to Warp', async () => {
    const tool = {
      name: 'test_tool',
      description: 'Test tool description',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name', description: 'The name' },
        },
      },
    }

    const warp = await convertMcpToolToWarp(mockConfig, tool, mockUrl, mockHeaders)

    expect(warp.protocol).toBe('warp:3.0.0')
    expect(warp.name).toBe('test_tool')
    expect(typeof warp.title === 'object' && 'en' in warp.title ? warp.title.en : warp.title).toBe('test_tool')
    expect(
      warp.description && typeof warp.description === 'object' && 'en' in warp.description ? warp.description.en : warp.description
    ).toBe('Test tool description')
    expect(warp.actions).toHaveLength(1)
    expect(warp.actions[0].type).toBe('mcp')
    const mcpAction = warp.actions[0] as WarpMcpAction
    expect(mcpAction.destination?.url).toBe(mockUrl)
    expect(mcpAction.destination?.tool).toBe('test_tool')
    expect(mcpAction.destination?.headers).toEqual(mockHeaders)
  })

  it('converts input schema properties correctly', async () => {
    const tool = {
      name: 'test_tool',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name', description: 'The name' },
          age: { type: 'integer', title: 'Age' },
          active: { type: 'boolean' },
          price: { type: 'number' },
        },
        required: ['name', 'age'],
      },
    }

    const warp = await convertMcpToolToWarp(mockConfig, tool, mockUrl)

    expect(warp.actions[0].inputs).toHaveLength(4)

    const nameInput = warp.actions[0].inputs?.find((i) => i.name === 'name')
    expect(nameInput?.type).toBe('string')
    expect(typeof nameInput?.label === 'object' && 'en' in nameInput.label ? nameInput.label.en : nameInput?.label).toBe('Name')
    expect(
      nameInput?.description && typeof nameInput.description === 'object' && 'en' in nameInput.description
        ? nameInput.description.en
        : nameInput?.description
    ).toBe('The name')
    expect(nameInput?.position).toBe('payload:name')
    expect(nameInput?.required).toBe(true)

    const ageInput = warp.actions[0].inputs?.find((i) => i.name === 'age')
    expect(ageInput?.type).toBe('uint256')
    expect(ageInput?.required).toBe(true)

    const activeInput = warp.actions[0].inputs?.find((i) => i.name === 'active')
    expect(activeInput?.type).toBe('bool')
    expect(activeInput?.required).toBe(false)

    const priceInput = warp.actions[0].inputs?.find((i) => i.name === 'price')
    expect(priceInput?.type).toBe('uint256')
  })

  it('converts all JSON Schema types correctly', async () => {
    const tool = {
      name: 'type_test',
      inputSchema: {
        type: 'object',
        properties: {
          str: { type: 'string' },
          num: { type: 'number' },
          int: { type: 'integer' },
          bool: { type: 'boolean' },
          arr: { type: 'array' },
          obj: { type: 'object' },
          date: { type: 'string', format: 'date' },
          datetime: { type: 'string', format: 'date-time' },
        },
      },
    }

    const warp = await convertMcpToolToWarp(mockConfig, tool, mockUrl)
    const inputs = warp.actions[0].inputs || []

    expect(inputs.find((i) => i.name === 'str')?.type).toBe('string')
    expect(inputs.find((i) => i.name === 'num')?.type).toBe('uint256')
    expect(inputs.find((i) => i.name === 'int')?.type).toBe('uint256')
    expect(inputs.find((i) => i.name === 'bool')?.type).toBe('bool')
    expect(inputs.find((i) => i.name === 'arr')?.type).toBe('string')
    expect(inputs.find((i) => i.name === 'obj')?.type).toBe('string')
    expect(inputs.find((i) => i.name === 'date')?.type).toBe('string')
    expect(inputs.find((i) => i.name === 'datetime')?.type).toBe('string')
  })

  it('handles default values', async () => {
    const tool = {
      name: 'test_tool',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', default: 'default-name' },
          count: { type: 'integer', default: 10 },
          active: { type: 'boolean', default: true },
        },
      },
    }

    const warp = await convertMcpToolToWarp(mockConfig, tool, mockUrl)
    const inputs = warp.actions[0].inputs || []

    expect(inputs.find((i) => i.name === 'name')?.default).toBe('default-name')
    expect(inputs.find((i) => i.name === 'count')?.default).toBe(10)
    expect(inputs.find((i) => i.name === 'active')?.default).toBe(true)
  })

  it('handles tool without inputSchema', async () => {
    const tool = {
      name: 'no_inputs_tool',
      description: 'Tool with no inputs',
    }

    const warp = await convertMcpToolToWarp(mockConfig, tool, mockUrl)

    expect(warp.actions[0].inputs).toEqual([])
  })

  it('handles tool with empty inputSchema', async () => {
    const tool = {
      name: 'empty_inputs_tool',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    }

    const warp = await convertMcpToolToWarp(mockConfig, tool, mockUrl)

    expect(warp.actions[0].inputs).toEqual([])
  })

  it('converts output schema to warp output', async () => {
    const tool = {
      name: 'output_test',
      outputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The ID' },
          name: { type: 'string', description: 'The name' },
          count: { type: 'number', description: 'The count' },
        },
        required: ['id', 'name'],
      },
    }

    const warp = await convertMcpToolToWarp(mockConfig, tool, mockUrl)

    expect(warp.output).toBeDefined()
    expect(warp.output?.id).toBe('out.id')
    expect(warp.output?.name).toBe('out.name')
    expect(warp.output?.count).toBe('out.count')
  })

  it('handles tool without outputSchema', async () => {
    const tool = {
      name: 'no_output_tool',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
    }

    const warp = await convertMcpToolToWarp(mockConfig, tool, mockUrl)

    expect(warp.output).toBeUndefined()
  })

  it('handles tool with empty outputSchema', async () => {
    const tool = {
      name: 'empty_output_tool',
      outputSchema: {
        type: 'object',
        properties: {},
      },
    }

    const warp = await convertMcpToolToWarp(mockConfig, tool, mockUrl)

    expect(warp.output).toBeUndefined()
  })

  it('handles tool without description', async () => {
    const tool = {
      name: 'no_description_tool',
    }

    const warp = await convertMcpToolToWarp(mockConfig, tool, mockUrl)

    expect(warp.description).toBeNull()
    expect(warp.actions[0].description).toBeNull()
  })

  it('uses key as label when title is not provided', async () => {
    const tool = {
      name: 'test_tool',
      inputSchema: {
        type: 'object',
        properties: {
          fieldWithoutTitle: { type: 'string' },
        },
      },
    }

    const warp = await convertMcpToolToWarp(mockConfig, tool, mockUrl)
    const input = warp.actions[0].inputs?.find((i) => i.name === 'fieldWithoutTitle')

    expect(input?.label).toEqual({ en: 'fieldWithoutTitle' })
  })

  it('handles input without description', async () => {
    const tool = {
      name: 'test_tool',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
        },
      },
    }

    const warp = await convertMcpToolToWarp(mockConfig, tool, mockUrl)
    const input = warp.actions[0].inputs?.find((i) => i.name === 'name')

    expect(input?.description).toBeNull()
  })

  it('handles tool without headers', async () => {
    const tool = {
      name: 'test_tool',
    }

    const warp = await convertMcpToolToWarp(mockConfig, tool, mockUrl)

    const mcpAction = warp.actions[0] as WarpMcpAction
    expect(mcpAction.destination?.headers).toBeUndefined()
  })
})

describe('convertWarpToMcpCapabilities', () => {
  const mockUrl = 'https://mcp.example.com'
  const mockHeaders = { Authorization: 'Bearer test-token' }

  it('converts basic Warp with MCP action to MCP tool', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_tool',
      title: { en: 'Test Tool' },
      description: { en: 'Test tool description' },
      actions: [
        {
          type: 'mcp',
          label: { en: 'test_tool' },
          description: { en: 'Test tool description' },
          destination: {
            url: mockUrl,
            tool: 'test_tool',
            headers: mockHeaders,
          },
          inputs: [
            {
              name: 'name',
              label: { en: 'Name' },
              description: { en: 'The name' },
              type: 'string',
              position: 'payload:name',
              source: 'field',
              required: true,
            },
          ],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools).toHaveLength(1)
    expect(result.tools[0].name).toBe('test_tool')
    expect(result.tools[0].description).toBe('Test tool description')
    expect(result.tools[0].inputSchema).toBeDefined()
    expect(result.tools[0].inputSchema).toHaveProperty('name')
    const nameSchema = result.tools[0].inputSchema.name as z.ZodTypeAny
    expect(isZodString(nameSchema)).toBe(true)
    const description = getZodDescription(nameSchema)
    if (description) {
      expect(description).toContain('The name')
    }
    expect(isZodOptional(nameSchema)).toBe(false)
  })

  it('converts Warp with multiple input types correctly', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'type_test',
      title: { en: 'Type Test' },
      description: null,
      actions: [
        {
          type: 'mcp',
          label: { en: 'type_test' },
          destination: {
            url: mockUrl,
            tool: 'type_test',
          },
          inputs: [
            {
              name: 'str',
              type: 'string',
              position: 'payload:str',
              source: 'field',
            },
            {
              name: 'num',
              type: 'uint256',
              position: 'payload:num',
              source: 'field',
              required: true,
            },
            {
              name: 'bool',
              type: 'bool',
              position: 'payload:bool',
              source: 'field',
            },
          ],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].inputSchema).toBeDefined()
    expect(result.tools[0].inputSchema).toHaveProperty('str')
    expect(result.tools[0].inputSchema).toHaveProperty('num')
    expect(result.tools[0].inputSchema).toHaveProperty('bool')
    expect(result.tools[0].inputSchema.str).toBeInstanceOf(z.ZodType)
    expect(result.tools[0].inputSchema.num).toBeInstanceOf(z.ZodType)
    expect(result.tools[0].inputSchema.bool).toBeInstanceOf(z.ZodType)
    const numSchema = result.tools[0].inputSchema.num as z.ZodTypeAny
    expect(isZodOptional(numSchema)).toBe(false)
  })

  it('converts Warp with output schema correctly', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'output_test',
      title: { en: 'Output Test' },
      description: null,
      actions: [
        {
          type: 'mcp',
          label: { en: 'output_test' },
          destination: {
            url: mockUrl,
            tool: 'output_test',
          },
          inputs: [],
        },
      ],
      output: {
        id: 'out.id',
        name: 'out.name',
        count: 'out.count',
      },
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].name).toBe('output_test')
    expect(result.tools[0].inputSchema).toBeUndefined()
  })

  it('handles Warp without inputs', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'no_inputs_tool',
      title: { en: 'No Inputs Tool' },
      description: { en: 'Tool with no inputs' },
      actions: [
        {
          type: 'mcp',
          label: { en: 'no_inputs_tool' },
          destination: {
            url: mockUrl,
            tool: 'no_inputs_tool',
          },
          inputs: [],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].inputSchema).toBeUndefined()
  })

  it('handles Warp without output', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'no_output_tool',
      title: { en: 'No Output Tool' },
      description: null,
      actions: [
        {
          type: 'mcp',
          label: { en: 'no_output_tool' },
          destination: {
            url: mockUrl,
            tool: 'no_output_tool',
          },
          inputs: [
            {
              name: 'name',
              type: 'string',
              position: 'payload:name',
              source: 'field',
            },
          ],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].outputSchema).toBeUndefined()
  })

  it('handles default values in inputs', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'default_test',
      title: { en: 'Default Test' },
      description: null,
      actions: [
        {
          type: 'mcp',
          label: { en: 'default_test' },
          destination: {
            url: mockUrl,
            tool: 'default_test',
          },
          inputs: [
            {
              name: 'name',
              type: 'string',
              position: 'payload:name',
              source: 'field',
              default: 'default-name',
            },
            {
              name: 'count',
              type: 'uint256',
              position: 'payload:count',
              source: 'field',
              default: 10,
            },
            {
              name: 'active',
              type: 'bool',
              position: 'payload:active',
              source: 'field',
              default: true,
            },
          ],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].inputSchema).toBeDefined()
    expect(result.tools[0].inputSchema).toHaveProperty('name')
    expect(result.tools[0].inputSchema).toHaveProperty('count')
    expect(result.tools[0].inputSchema).toHaveProperty('active')
  })

  it('handles Warp without description', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'no_description_tool',
      title: { en: 'No Description Tool' },
      description: null,
      actions: [
        {
          type: 'mcp',
          label: { en: 'no_description_tool' },
          destination: {
            url: mockUrl,
            tool: 'no_description_tool',
          },
          inputs: [],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].description).toBeUndefined()
  })

  it('uses action description when warp description is missing', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'action_description_tool',
      title: { en: 'Action Description Tool' },
      description: null,
      actions: [
        {
          type: 'mcp',
          label: { en: 'action_description_tool' },
          description: { en: 'Action description' },
          destination: {
            url: mockUrl,
            tool: 'action_description_tool',
          },
          inputs: [],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].description).toBe('Action description')
  })

  it('handles Warp without headers', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'no_headers_tool',
      title: { en: 'No Headers Tool' },
      description: null,
      actions: [
        {
          type: 'mcp',
          label: { en: 'no_headers_tool' },
          destination: {
            url: mockUrl,
            tool: 'no_headers_tool',
          },
          inputs: [],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)
  })

  it('filters out inputs that are not payload inputs', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'filter_test',
      title: { en: 'Filter Test' },
      description: null,
      actions: [
        {
          type: 'mcp',
          label: { en: 'filter_test' },
          destination: {
            url: mockUrl,
            tool: 'filter_test',
          },
          inputs: [
            {
              name: 'payload_input',
              type: 'string',
              position: 'payload:payload_input',
              source: 'field',
            },
            {
              name: 'non_payload_input',
              type: 'string',
              position: 'arg:1',
              source: 'field',
            },
          ],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].inputSchema).toBeDefined()
    expect(result.tools[0].inputSchema).toHaveProperty('payload_input')
    expect(result.tools[0].inputSchema).toHaveProperty('non_payload_input')
  })

  it('returns empty arrays when Warp has no actions', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'no_actions',
      title: { en: 'No Actions' },
      description: null,
      actions: [],
    }

    const result = await convertWarpToMcpCapabilities(warp)
    expect(result.tools).toEqual([])
  })

  it('skips MCP action when it has no destination', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'no_destination',
      title: { en: 'No Destination' },
      description: null,
      actions: [
        {
          type: 'mcp',
          label: { en: 'no_destination' },
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)
    expect(result.tools).toEqual([])
  })

  it('converts all Warp input types to JSON Schema types', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'all_types_test',
      title: { en: 'All Types Test' },
      description: null,
      actions: [
        {
          type: 'mcp',
          label: { en: 'all_types_test' },
          destination: {
            url: mockUrl,
            tool: 'all_types_test',
          },
          inputs: [
            {
              name: 'str',
              type: 'string',
              position: 'payload:str',
              source: 'field',
            },
            {
              name: 'bool',
              type: 'bool',
              position: 'payload:bool',
              source: 'field',
            },
            {
              name: 'uint8',
              type: 'uint8',
              position: 'payload:uint8',
              source: 'field',
            },
            {
              name: 'uint256',
              type: 'uint256',
              position: 'payload:uint256',
              source: 'field',
            },
            {
              name: 'biguint',
              type: 'biguint',
              position: 'payload:biguint',
              source: 'field',
            },
          ],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].inputSchema).toBeDefined()
    expect(result.tools[0].inputSchema.str).toBeInstanceOf(z.ZodType)
    expect(result.tools[0].inputSchema.bool).toBeInstanceOf(z.ZodType)
    expect(result.tools[0].inputSchema.uint8).toBeInstanceOf(z.ZodType)
    expect(result.tools[0].inputSchema.uint256).toBeInstanceOf(z.ZodType)
    expect(result.tools[0].inputSchema.biguint).toBeInstanceOf(z.ZodType)
  })

  it('converts transfer action to tool', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'transfer_test',
      title: { en: 'Transfer Test' },
      description: { en: 'Transfer action' },
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
          inputs: [
            {
              name: 'amount',
              type: 'uint256',
              position: 'value',
              source: 'field',
            },
          ],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(1)
    expect(result.tools[0].name).toBe('transfer_test')
    expect(result.tools[0].description).toBe('Transfer action')
  })

  it('converts contract action to tool', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'contract_test',
      title: { en: 'Contract Test' },
      description: null,
      actions: [
        {
          type: 'contract',
          label: { en: 'Contract' },
          address: 'erd1contract',
          func: 'transfer',
          gasLimit: 100000,
          inputs: [
            {
              name: 'to',
              type: 'address',
              position: 'arg:1',
              source: 'field',
            },
          ],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(1)
    expect(result.tools[0].name).toBe('contract_test')
  })

  it('converts query action to tool', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'query_test',
      title: { en: 'Query Test' },
      description: { en: 'Query action' },
      actions: [
        {
          type: 'query',
          label: { en: 'Query' },
          address: 'erd1query',
          func: 'getBalance',
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(1)
    expect(result.tools[0].name).toBe('query_test')
    expect(result.tools[0].description).toBe('Query action')
  })

  it('converts collect action with POST to tool', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'collect_post_test',
      title: { en: 'Collect POST Test' },
      description: null,
      actions: [
        {
          type: 'collect',
          label: { en: 'Collect POST' },
          destination: {
            url: 'https://api.example.com/collect',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          },
          inputs: [
            {
              name: 'data',
              type: 'string',
              position: 'payload:data',
              source: 'field',
            },
          ],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(1)
    expect(result.tools[0].name).toBe('collect_post_test')
  })

  it('converts collect action with PUT to tool', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'collect_put_test',
      title: { en: 'Collect PUT Test' },
      description: null,
      actions: [
        {
          type: 'collect',
          label: { en: 'Collect PUT' },
          destination: {
            url: 'https://api.example.com/update',
            method: 'PUT',
          },
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(1)
  })

  it('converts collect action with DELETE to tool', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'collect_delete_test',
      title: { en: 'Collect DELETE Test' },
      description: null,
      actions: [
        {
          type: 'collect',
          label: { en: 'Collect DELETE' },
          destination: {
            url: 'https://api.example.com/delete',
            method: 'DELETE',
          },
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(1)
  })

  it('converts collect action with GET to tool', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'collect_get_test',
      title: { en: 'Collect GET Test' },
      description: { en: 'Collect GET action' },
      actions: [
        {
          type: 'collect',
          label: { en: 'Collect GET' },
          destination: {
            url: 'https://api.example.com/data',
            method: 'GET',
            headers: { Accept: 'application/json' },
          },
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(1)
    expect(result.tools[0].name).toBe('collect_get_test')
    expect(result.tools[0].description).toBe('Collect GET action')
  })

  it('converts collect action without method to tool', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'collect_no_method_test',
      title: { en: 'Collect No Method Test' },
      description: null,
      actions: [
        {
          type: 'collect',
          label: { en: 'Collect No Method' },
          destination: {
            url: 'https://api.example.com/data',
          },
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(1)
    expect(result.tools[0].name).toBe('collect_no_method_test')
  })

  it('converts collect action with string destination to tool', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'collect_string_test',
      title: { en: 'Collect String Test' },
      description: null,
      actions: [
        {
          type: 'collect',
          label: { en: 'Collect String' },
          destination: 'https://api.example.com/data',
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(1)
    expect(result.tools[0].name).toBe('collect_string_test')
  })

  it('handles multiple actions of different types', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'multiple_actions_test',
      title: { en: 'Multiple Actions Test' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
        {
          type: 'query',
          label: { en: 'Query' },
          address: 'erd1query',
        },
        {
          type: 'collect',
          label: { en: 'Collect POST' },
          destination: {
            url: 'https://api.example.com/collect',
            method: 'POST',
          },
        },
        {
          type: 'collect',
          label: { en: 'Collect GET' },
          destination: {
            url: 'https://api.example.com/data',
            method: 'GET',
          },
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(1)
    expect(result.tools[0].name).toBe('multiple_actions_test')
  })

  it('sanitizes tool names with spaces and colons', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'MultiversX Staking: Delegate',
      title: { en: 'MultiversX Staking: Delegate' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Delegate' },
          address: 'erd1test',
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].name).toBe('delegate')
    expect(result.tools[0].name).toMatch(/^[A-Za-z0-9_.-]+$/)
  })

  it('sanitizes tool names with invalid characters for query actions', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'Query: Get Balance (Test)',
      title: { en: 'Query: Get Balance (Test)' },
      description: null,
      actions: [
        {
          type: 'query',
          label: { en: 'Get Balance' },
          address: 'erd1query',
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].name).toBe('get_balance_test')
    expect(result.tools[0].name).toMatch(/^[A-Za-z0-9_.-]+$/)
  })

  it('sanitizes MCP tool names with special characters', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'Test Tool',
      title: { en: 'Test Tool' },
      description: null,
      actions: [
        {
          type: 'mcp',
          label: { en: 'Test Tool' },
          destination: {
            url: 'https://mcp.example.com',
            tool: 'test-tool:with:colons',
          },
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].name).toBe('with_colons')
    expect(result.tools[0].name).toMatch(/^[A-Za-z0-9_.-]+$/)
  })

  it('handles names with multiple consecutive invalid characters', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'Tool   With   Spaces',
      title: { en: 'Tool   With   Spaces' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].name).toBe('tool_with_spaces')
    expect(result.tools[0].name).not.toContain('__')
  })

  it('maps min and max constraints to JSON Schema', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'constraints_test',
      title: { en: 'Constraints Test' },
      description: null,
      actions: [
        {
          type: 'mcp',
          label: { en: 'Constraints Test' },
          destination: {
            url: mockUrl,
            tool: 'constraints_test',
          },
          inputs: [
            {
              name: 'amount',
              type: 'uint256',
              position: 'payload:amount',
              source: 'field',
              min: 1,
              max: 1000,
            },
          ],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].inputSchema).toBeDefined()
    expect(result.tools[0].inputSchema.amount).toBeInstanceOf(z.ZodType)
  })

  it('maps pattern and patternDescription to JSON Schema', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'pattern_test',
      title: { en: 'Pattern Test' },
      description: null,
      actions: [
        {
          type: 'mcp',
          label: { en: 'Pattern Test' },
          destination: {
            url: mockUrl,
            tool: 'pattern_test',
          },
          inputs: [
            {
              name: 'email',
              type: 'string',
              position: 'payload:email',
              source: 'field',
              pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
              patternDescription: { en: 'Must be a valid email address' },
            },
          ],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].inputSchema).toBeDefined()
    expect(result.tools[0].inputSchema.email).toBeInstanceOf(z.ZodType)
    const emailSchema = result.tools[0].inputSchema.email as z.ZodTypeAny
    const description = getZodDescription(emailSchema)
    if (description) {
      expect(description).toContain('Must be a valid email address')
    }
  })

  it('maps options to enum in JSON Schema', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'options_test',
      title: { en: 'Options Test' },
      description: null,
      actions: [
        {
          type: 'mcp',
          label: { en: 'Options Test' },
          destination: {
            url: mockUrl,
            tool: 'options_test',
          },
          inputs: [
            {
              name: 'status',
              type: 'string',
              position: 'payload:status',
              source: 'field',
              options: ['active', 'inactive', 'pending'],
            },
          ],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].inputSchema).toBeDefined()
    expect(result.tools[0].inputSchema.status).toBeInstanceOf(z.ZodType)
  })

  it('maps options object to enum with keys', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'options_object_test',
      title: { en: 'Options Object Test' },
      description: null,
      actions: [
        {
          type: 'mcp',
          label: { en: 'Options Object Test' },
          destination: {
            url: mockUrl,
            tool: 'options_object_test',
          },
          inputs: [
            {
              name: 'choice',
              type: 'string',
              position: 'payload:choice',
              source: 'field',
              options: {
                option1: { en: 'Option 1' },
                option2: { en: 'Option 2' },
              },
            },
          ],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].inputSchema).toBeDefined()
    expect(result.tools[0].inputSchema.choice).toBeInstanceOf(z.ZodType)
  })

  it('maps all input properties together', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'full_mapping_test',
      title: { en: 'Full Mapping Test' },
      description: null,
      actions: [
        {
          type: 'mcp',
          label: { en: 'Full Mapping Test' },
          destination: {
            url: mockUrl,
            tool: 'full_mapping_test',
          },
          inputs: [
            {
              name: 'full_input',
              type: 'uint256',
              position: 'payload:full_input',
              source: 'field',
              label: { en: 'Full Input Label' },
              description: { en: 'Full input description' },
              patternDescription: { en: 'Pattern description' },
              required: true,
              default: 10,
              min: 1,
              max: 100,
              pattern: '^\\d+$',
              options: ['1', '10', '100'],
            },
          ],
        },
      ],
    }

    const result = await convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].inputSchema).toBeDefined()
    expect(result.tools[0].inputSchema.full_input).toBeInstanceOf(z.ZodType)
    const fullInputSchema = result.tools[0].inputSchema.full_input as z.ZodTypeAny
    const description = getZodDescription(fullInputSchema)
    if (description) {
      expect(description).toContain('Full input description')
      expect(description).toContain('Pattern description')
    }
    expect(isZodOptional(fullInputSchema)).toBe(false)
  })

  describe('ui functionality', () => {
    beforeEach(() => {
      fetchMock.resetMocks()
    })

    it('creates app resource with string URL', async () => {
      const warp: Warp = {
        protocol: 'warp:3.0.0',
        name: 'app_test',
        title: { en: 'App Test' },
        description: { en: 'Test app' },
        actions: [
          {
            type: 'transfer',
            label: { en: 'Transfer' },
            address: 'erd1test',
          },
        ],
        ui: 'https://example.com/app.html',
      }

      const mockHtml = '<html><head></head><body>Test App</body></html>'
      fetchMock.mockResponseOnce(mockHtml)

      const result = await convertWarpToMcpCapabilities(warp)

      expect(result.tools).toHaveLength(1)
      expect(result.resources).toBeDefined()
      expect(result.resources).toHaveLength(1)
      expect(result.resources![0].name).toBe('ui://widget/app_test')
      expect(result.resources![0].uri).toBe('ui://widget/app_test')
      expect(result.resources![0].mimeType).toBe('text/html+skybridge')
      const dataScript = `<script type="application/json" id="warp-app-data">${JSON.stringify({
        warp: { name: 'app_test', title: 'App Test', description: 'Test app' },
      })}</script>`
      expect(result.resources![0].content).toBe(`${dataScript}\nTest App`)
    })

    it('inlines CSS resources', async () => {
      const warp: Warp = {
        protocol: 'warp:3.0.0',
        name: 'css_test',
        title: { en: 'CSS Test' },
        description: null,
        actions: [
          {
            type: 'transfer',
            label: { en: 'Transfer' },
            address: 'erd1test',
          },
        ],
        ui: 'https://example.com/app.html',
      }

      const mockHtml = '<html><head><link rel="stylesheet" href="styles.css"></head><body></body></html>'
      const mockCss = 'body { color: red; }'

      fetchMock.mockResponseOnce(mockHtml).mockResponseOnce(mockCss)

      const result = await convertWarpToMcpCapabilities(warp)

      expect(result.resources).toBeDefined()
      expect(result.resources).toHaveLength(1)
      const dataScript = `<script type="application/json" id="warp-app-data">${JSON.stringify({
        warp: { name: 'css_test', title: 'CSS Test' },
      })}</script>`
      expect(result.resources![0].content).toBe(`${dataScript}\n<style>body { color: red; }</style>`)
    })

    it('inlines JavaScript resources', async () => {
      const warp: Warp = {
        protocol: 'warp:3.0.0',
        name: 'js_test',
        title: { en: 'JS Test' },
        description: null,
        actions: [
          {
            type: 'transfer',
            label: { en: 'Transfer' },
            address: 'erd1test',
          },
        ],
        ui: 'https://example.com/app.html',
      }

      const mockHtml = '<html><head></head><body><script src="app.js"></script></body></html>'
      const mockJs = "console.log('test');"

      fetchMock.mockResponseOnce(mockHtml).mockResponseOnce(mockJs)

      const result = await convertWarpToMcpCapabilities(warp)

      expect(result.resources).toBeDefined()
      expect(result.resources).toHaveLength(1)
      const dataScript = `<script type="application/json" id="warp-app-data">${JSON.stringify({
        warp: { name: 'js_test', title: 'JS Test' },
      })}</script>`
      expect(result.resources![0].content).toBe(`${dataScript}\n<script>console.log('test');</script>`)
    })

    it('handles relative URLs in resources', async () => {
      const warp: Warp = {
        protocol: 'warp:3.0.0',
        name: 'relative_url_test',
        title: { en: 'Relative URL Test' },
        description: null,
        actions: [
          {
            type: 'transfer',
            label: { en: 'Transfer' },
            address: 'erd1test',
          },
        ],
        ui: 'https://example.com/path/app.html',
      }

      const mockHtml = '<html><head><link rel="stylesheet" href="../styles.css"></head><body></body></html>'
      const mockCss = 'body { margin: 0; }'

      fetchMock.mockResponseOnce(mockHtml).mockResponseOnce(mockCss)

      const result = await convertWarpToMcpCapabilities(warp)

      expect(fetchMock).toHaveBeenCalledWith('https://example.com/styles.css')
      expect(result.resources).toBeDefined()
      expect(result.resources).toHaveLength(1)
      const dataScript = `<script type="application/json" id="warp-app-data">${JSON.stringify({
        warp: { name: 'relative_url_test', title: 'Relative URL Test' },
      })}</script>`
      expect(result.resources![0].content).toBe(`${dataScript}\n<style>body { margin: 0; }</style>`)
    })

    it('handles failed resource downloads gracefully', async () => {
      const warp: Warp = {
        protocol: 'warp:3.0.0',
        name: 'failed_resource_test',
        title: { en: 'Failed Resource Test' },
        description: null,
        actions: [
          {
            type: 'transfer',
            label: { en: 'Transfer' },
            address: 'erd1test',
          },
        ],
        ui: 'https://example.com/app.html',
      }

      const mockHtml = '<html><head><link rel="stylesheet" href="missing.css"></head><body></body></html>'

      fetchMock.mockResponseOnce(mockHtml).mockResponseOnce('', { status: 404 })

      const result = await convertWarpToMcpCapabilities(warp)

      expect(result.resources).toBeDefined()
      expect(result.resources).toHaveLength(1)
      const dataScript = `<script type="application/json" id="warp-app-data">${JSON.stringify({
        warp: { name: 'failed_resource_test', title: 'Failed Resource Test' },
      })}</script>`
      expect(result.resources?.[0].content?.trim()).toBe(dataScript)
    })

    it('skips app when set to table', async () => {
      const warp: Warp = {
        protocol: 'warp:3.0.0',
        name: 'table_test',
        title: { en: 'Table Test' },
        description: null,
        actions: [
          {
            type: 'transfer',
            label: { en: 'Transfer' },
            address: 'erd1test',
          },
        ],
        ui: 'table',
      }

      const result = await convertWarpToMcpCapabilities(warp)

      expect(result.tools).toHaveLength(1)
      expect(result.resources).toBeUndefined()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('handles app download failure gracefully', async () => {
      const warp: Warp = {
        protocol: 'warp:3.0.0',
        name: 'download_fail_test',
        title: { en: 'Download Fail Test' },
        description: null,
        actions: [
          {
            type: 'transfer',
            label: { en: 'Transfer' },
            address: 'erd1test',
          },
        ],
        ui: 'https://example.com/missing.html',
      }

      fetchMock.mockResponseOnce('', { status: 404 })

      const result = await convertWarpToMcpCapabilities(warp)

      expect(result.tools).toHaveLength(1)
      expect(result.resources).toBeUndefined()
    })

    it('injects warp metadata into app', async () => {
      const warp: Warp = {
        protocol: 'warp:3.0.0',
        name: 'metadata_test',
        title: { en: 'Metadata Test' },
        description: { en: 'Test description' },
        actions: [
          {
            type: 'transfer',
            label: { en: 'Transfer' },
            address: 'erd1test',
          },
        ],
        ui: 'https://example.com/app.html',
      }

      const mockHtml = '<html><head></head><body>Test</body></html>'
      fetchMock.mockResponseOnce(mockHtml)

      const result = await convertWarpToMcpCapabilities(warp)

      const dataScript = `<script type="application/json" id="warp-app-data">${JSON.stringify({
        warp: { name: 'metadata_test', title: 'Metadata Test', description: 'Test description' },
      })}</script>`
      expect(result.resources?.[0].content).toBe(`${dataScript}\nTest`)
    })

    it('handles multiple CSS and JS resources in parallel', async () => {
      const warp: Warp = {
        protocol: 'warp:3.0.0',
        name: 'multiple_resources_test',
        title: { en: 'Multiple Resources Test' },
        description: null,
        actions: [
          {
            type: 'transfer',
            label: { en: 'Transfer' },
            address: 'erd1test',
          },
        ],
        ui: 'https://example.com/app.html',
      }

      const mockHtml =
        '<html><head><link rel="stylesheet" href="style1.css"><link rel="stylesheet" href="style2.css"></head><body><script src="app1.js"></script><script src="app2.js"></script></body></html>'

      fetchMock
        .mockResponseOnce(mockHtml)
        .mockResponseOnce('body { color: red; }')
        .mockResponseOnce('body { margin: 0; }')
        .mockResponseOnce("console.log('app1');")
        .mockResponseOnce("console.log('app2');")

      const result = await convertWarpToMcpCapabilities(warp)

      expect(result.resources).toBeDefined()
      expect(result.resources).toHaveLength(1)
      const dataScript = `<script type="application/json" id="warp-app-data">${JSON.stringify({
        warp: { name: 'multiple_resources_test', title: 'Multiple Resources Test' },
      })}</script>`
      const expectedContent = `${dataScript}\n<style>body { color: red; }</style><style>body { margin: 0; }</style><script>console.log('app1');</script><script>console.log('app2');</script>`
      expect(result.resources![0].content).toBe(expectedContent)
    })
  })
})
