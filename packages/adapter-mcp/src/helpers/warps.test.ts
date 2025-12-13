import { WarpActionInputType } from '@vleap/warps'
import { convertMcpToolToWarp } from './warps'

describe('convertMcpToolToWarp', () => {
  const mockUrl = 'https://mcp.example.com'
  const mockHeaders = { Authorization: 'Bearer test-token' }

  it('converts basic MCP tool to Warp', () => {
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

    const warp = convertMcpToolToWarp(tool, mockUrl, mockHeaders)

    expect(warp.protocol).toBe('mcp')
    expect(warp.name).toBe('test_tool')
    expect(warp.title.en).toBe('test_tool')
    expect(warp.description?.en).toBe('Test tool description')
    expect(warp.actions).toHaveLength(1)
    expect(warp.actions[0].type).toBe('mcp')
    expect(warp.actions[0].destination?.url).toBe(mockUrl)
    expect(warp.actions[0].destination?.tool).toBe('test_tool')
    expect(warp.actions[0].destination?.headers).toEqual(mockHeaders)
  })

  it('converts input schema properties correctly', () => {
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

    const warp = convertMcpToolToWarp(tool, mockUrl)

    expect(warp.actions[0].inputs).toHaveLength(4)

    const nameInput = warp.actions[0].inputs?.find((i) => i.name === 'name')
    expect(nameInput?.type).toBe('string')
    expect(nameInput?.label).toBe('Name')
    expect(nameInput?.description?.en).toBe('The name')
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

  it('converts all JSON Schema types correctly', () => {
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

    const warp = convertMcpToolToWarp(tool, mockUrl)
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

  it('handles default values', () => {
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

    const warp = convertMcpToolToWarp(tool, mockUrl)
    const inputs = warp.actions[0].inputs || []

    expect(inputs.find((i) => i.name === 'name')?.default).toBe('default-name')
    expect(inputs.find((i) => i.name === 'count')?.default).toBe(10)
    expect(inputs.find((i) => i.name === 'active')?.default).toBe(true)
  })

  it('handles tool without inputSchema', () => {
    const tool = {
      name: 'no_inputs_tool',
      description: 'Tool with no inputs',
    }

    const warp = convertMcpToolToWarp(tool, mockUrl)

    expect(warp.actions[0].inputs).toEqual([])
  })

  it('handles tool with empty inputSchema', () => {
    const tool = {
      name: 'empty_inputs_tool',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    }

    const warp = convertMcpToolToWarp(tool, mockUrl)

    expect(warp.actions[0].inputs).toEqual([])
  })

  it('converts output schema to warp output', () => {
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

    const warp = convertMcpToolToWarp(tool, mockUrl)

    expect(warp.output).toBeDefined()
    expect(warp.output?.id).toBe('out.id')
    expect(warp.output?.name).toBe('out.name')
    expect(warp.output?.count).toBe('out.count')
  })

  it('handles tool without outputSchema', () => {
    const tool = {
      name: 'no_output_tool',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
    }

    const warp = convertMcpToolToWarp(tool, mockUrl)

    expect(warp.output).toBeUndefined()
  })

  it('handles tool with empty outputSchema', () => {
    const tool = {
      name: 'empty_output_tool',
      outputSchema: {
        type: 'object',
        properties: {},
      },
    }

    const warp = convertMcpToolToWarp(tool, mockUrl)

    expect(warp.output).toBeUndefined()
  })

  it('handles tool without description', () => {
    const tool = {
      name: 'no_description_tool',
    }

    const warp = convertMcpToolToWarp(tool, mockUrl)

    expect(warp.description).toBeNull()
    expect(warp.actions[0].description).toBeNull()
  })

  it('uses key as label when title is not provided', () => {
    const tool = {
      name: 'test_tool',
      inputSchema: {
        type: 'object',
        properties: {
          fieldWithoutTitle: { type: 'string' },
        },
      },
    }

    const warp = convertMcpToolToWarp(tool, mockUrl)
    const input = warp.actions[0].inputs?.find((i) => i.name === 'fieldWithoutTitle')

    expect(input?.label).toEqual({ en: 'fieldWithoutTitle' })
  })

  it('handles input without description', () => {
    const tool = {
      name: 'test_tool',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
        },
      },
    }

    const warp = convertMcpToolToWarp(tool, mockUrl)
    const input = warp.actions[0].inputs?.find((i) => i.name === 'name')

    expect(input?.description).toBeNull()
  })

  it('handles tool without headers', () => {
    const tool = {
      name: 'test_tool',
    }

    const warp = convertMcpToolToWarp(tool, mockUrl)

    expect(warp.actions[0].destination?.headers).toBeUndefined()
  })
})
