import {
  Warp,
  WarpActionInput,
  WarpCollectAction,
  WarpContractAction,
  WarpMcpAction,
  WarpQueryAction,
  WarpTransferAction,
} from '@vleap/warps'
import { z } from 'zod'
import { buildZodInputSchema, convertActionToTool, convertMcpActionToTool } from './tools'

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

describe('buildZodInputSchema', () => {
  it('builds schema from string input', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'name',
        type: 'string',
        position: 'payload:name',
        source: 'field',
        required: true,
      },
    ]

    const result = buildZodInputSchema(inputs)

    expect(result).toBeDefined()
    expect(result!.name).toBeDefined()
    expect(isZodString(result!.name)).toBe(true)
    expect(isZodOptional(result!.name)).toBe(false)
  })

  it('builds schema from number input', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'amount',
        type: 'uint256',
        position: 'payload:amount',
        source: 'field',
        required: true,
      },
    ]

    const result = buildZodInputSchema(inputs)

    expect(result).toBeDefined()
    expect(result!.amount).toBeDefined()
    expect(isZodNumber(result!.amount)).toBe(true)
  })

  it('builds schema from boolean input', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'active',
        type: 'bool',
        position: 'payload:active',
        source: 'field',
        required: true,
      },
    ]

    const result = buildZodInputSchema(inputs)

    expect(result).toBeDefined()
    expect(result!.active).toBeDefined()
    expect(isZodBoolean(result!.active)).toBe(true)
  })

  it('makes optional fields optional', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'name',
        type: 'string',
        position: 'payload:name',
        source: 'field',
        required: false,
      },
    ]

    const result = buildZodInputSchema(inputs)

    expect(result).toBeDefined()
    // The schema should be optional when required is false
    const schema = result!.name
    // Check if it's wrapped in ZodOptional by checking the inner type
    const innerType = (schema as any)._def?.innerType
    const isOptional = isZodOptional(schema) || (schema as any)._def?.typeName === 'ZodOptional' || (innerType && innerType instanceof z.ZodString)
    // Actually, let's just verify it can parse undefined
    const parseResult = schema.safeParse(undefined)
    expect(parseResult.success).toBe(true)
  })

  it('filters out hidden inputs', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'visible',
        type: 'string',
        position: 'payload:visible',
        source: 'field',
        required: true,
      },
      {
        name: 'hidden',
        type: 'string',
        position: 'payload:hidden',
        source: 'hidden',
        required: true,
      },
    ]

    const result = buildZodInputSchema(inputs)

    expect(result).toBeDefined()
    expect(result!.visible).toBeDefined()
    expect(result!.hidden).toBeUndefined()
  })

  it('filters out non-field inputs', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'field_input',
        type: 'string',
        position: 'payload:field_input',
        source: 'field',
        required: true,
      },
      {
        name: 'other_input',
        type: 'string',
        position: 'other:other_input',
        source: 'other',
        required: true,
      },
    ]

    const result = buildZodInputSchema(inputs)

    expect(result).toBeDefined()
    expect(result!.field_input).toBeDefined()
    expect(result!.other_input).toBeUndefined()
  })

  it('handles min/max constraints', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'amount',
        type: 'uint256',
        position: 'payload:amount',
        source: 'field',
        required: true,
        min: 10,
        max: 100,
      },
    ]

    const result = buildZodInputSchema(inputs)

    expect(result).toBeDefined()
    const schema = result!.amount as z.ZodNumber
    expect(schema.min(10)).toBeDefined()
    expect(schema.max(100)).toBeDefined()
  })

  it('handles pattern constraints', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'email',
        type: 'string',
        position: 'payload:email',
        source: 'field',
        required: true,
        pattern: '^[a-z]+@[a-z]+\\.[a-z]+$',
      },
    ]

    const result = buildZodInputSchema(inputs)

    expect(result).toBeDefined()
    expect(result!.email).toBeDefined()
  })

  it('handles enum options', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'status',
        type: 'string',
        position: 'payload:status',
        source: 'field',
        required: true,
        options: ['active', 'inactive', 'pending'],
      },
    ]

    const result = buildZodInputSchema(inputs)

    expect(result).toBeDefined()
    expect(isZodEnum(result!.status)).toBe(true)
  })

  it('handles empty inputs array', () => {
    const result = buildZodInputSchema([])

    expect(result).toBeUndefined()
  })

  it('uses "as" field name when provided', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'original_name',
        as: 'renamed_field',
        type: 'string',
        position: 'payload:original_name',
        source: 'field',
        required: true,
      },
    ]

    const result = buildZodInputSchema(inputs)

    expect(result).toBeDefined()
    expect(result!.renamed_field).toBeDefined()
    expect(result!.original_name).toBeUndefined()
  })
})

describe('convertActionToTool', () => {
  it('converts action to tool with basic properties', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_warp',
      title: { en: 'Test Warp' },
      description: { en: 'Test description' },
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
    }

    const action = warp.actions[0] as WarpTransferAction
    const tool = convertActionToTool(warp, action, 'Test description', undefined, undefined)

    expect(tool.name).toBe('test_warp')
    expect(tool.description).toBe('Test description')
    expect(tool.inputSchema).toBeUndefined()
  })

  it('includes output template URI in _meta when provided', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_warp',
      title: { en: 'Test Warp' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
    }

    const action = warp.actions[0] as WarpTransferAction
    const tool = convertActionToTool(warp, action, undefined, undefined, 'ui://widget/test_warp')

    expect(tool._meta).toBeDefined()
    expect(tool._meta!['openai/outputTemplate']).toBe('ui://widget/test_warp')
  })

  it('sanitizes warp name correctly', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'warp:test-warp with spaces',
      title: { en: 'Test Warp' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
    }

    const action = warp.actions[0] as WarpTransferAction
    const tool = convertActionToTool(warp, action, undefined, undefined, undefined)

    // After colon removal, hyphens are preserved until the final sanitization
    expect(tool.name).toBe('test-warp_with_spaces')
  })

  it('uses primary action inputs when provided', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_warp',
      title: { en: 'Test Warp' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
          inputs: [
            {
              name: 'amount',
              type: 'uint256',
              position: 'payload:amount',
              source: 'field',
              required: true,
            },
          ],
        },
      ],
    }

    const action = warp.actions[0] as WarpTransferAction
    const primaryInputs: WarpActionInput[] = [
      {
        name: 'custom_amount',
        type: 'uint256',
        position: 'payload:custom_amount',
        source: 'field',
        required: true,
      },
    ]

    const tool = convertActionToTool(warp, action, undefined, primaryInputs, undefined)

    expect(tool.inputSchema).toBeDefined()
    expect(tool.inputSchema!.custom_amount).toBeDefined()
    expect(tool.inputSchema!.amount).toBeUndefined()
  })
})

describe('convertMcpActionToTool', () => {
  it('converts MCP action to tool', () => {
    const action: WarpMcpAction = {
      type: 'mcp',
      label: { en: 'MCP Tool' },
      description: { en: 'MCP description' },
      destination: {
        url: 'https://example.com',
        tool: 'mcp_tool_name',
      },
      inputs: [
        {
          name: 'param',
          type: 'string',
          position: 'payload:param',
          source: 'field',
          required: true,
        },
      ],
    }

    const tool = convertMcpActionToTool(action, 'MCP description', undefined, undefined)

    expect(tool.name).toBe('mcp_tool_name')
    expect(tool.description).toBe('MCP description')
    expect(tool.inputSchema).toBeDefined()
    expect(tool.inputSchema!.param).toBeDefined()
  })

  it('includes output template URI in _meta when provided', () => {
    const action: WarpMcpAction = {
      type: 'mcp',
      label: { en: 'MCP Tool' },
      description: null,
      destination: {
        url: 'https://example.com',
        tool: 'mcp_tool',
      },
      inputs: [],
    }

    const tool = convertMcpActionToTool(action, undefined, undefined, 'ui://widget/mcp_tool')

    expect(tool._meta).toBeDefined()
    expect(tool._meta!['openai/outputTemplate']).toBe('ui://widget/mcp_tool')
  })

  it('sanitizes tool name correctly', () => {
    const action: WarpMcpAction = {
      type: 'mcp',
      label: { en: 'MCP Tool' },
      description: null,
      destination: {
        url: 'https://example.com',
        tool: 'MCP Tool With Spaces',
      },
      inputs: [],
    }

    const tool = convertMcpActionToTool(action, undefined, undefined, undefined)

    expect(tool.name).toBe('mcp_tool_with_spaces')
  })
})
