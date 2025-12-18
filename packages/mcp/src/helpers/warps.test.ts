import { Warp, WarpMcpAction } from '@vleap/warps'
import { convertMcpToolToWarp, convertWarpToMcpCapabilities } from './warps'

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

  it('converts basic Warp with MCP action to MCP tool', () => {
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

    const result = convertWarpToMcpCapabilities(warp)

    expect(result.tools).toHaveLength(1)
    expect(result.resources).toHaveLength(0)
    expect(result.tools[0].name).toBe('test_tool')
    expect(result.tools[0].description).toBe('Test tool description')
    expect(result.tools[0].url).toBe(mockUrl)
    expect(result.tools[0].headers).toEqual(mockHeaders)
    expect(result.tools[0].inputSchema).toBeDefined()
    expect(result.tools[0].inputSchema.properties.name).toBeDefined()
    expect(result.tools[0].inputSchema.properties.name.type).toBe('string')
    expect(result.tools[0].inputSchema.properties.name.title).toBe('Name')
    expect(result.tools[0].inputSchema.properties.name.description).toBe('The name')
    expect(result.tools[0].inputSchema.required).toContain('name')
  })

  it('converts Warp with multiple input types correctly', () => {
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

    const result = convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].inputSchema.properties.str.type).toBe('string')
    expect(result.tools[0].inputSchema.properties.num.type).toBe('integer')
    expect(result.tools[0].inputSchema.properties.bool.type).toBe('boolean')
    expect(result.tools[0].inputSchema.required).toContain('num')
    expect(result.tools[0].inputSchema.required).not.toContain('str')
    expect(result.tools[0].inputSchema.required).not.toContain('bool')
  })

  it('converts Warp with output schema correctly', () => {
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

    const result = convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].outputSchema).toBeDefined()
    expect(result.tools[0].outputSchema.properties.id).toBeDefined()
    expect(result.tools[0].outputSchema.properties.name).toBeDefined()
    expect(result.tools[0].outputSchema.properties.count).toBeDefined()
    expect(result.tools[0].outputSchema.properties.id.type).toBe('string')
  })

  it('handles Warp without inputs', () => {
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

    const result = convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].inputSchema).toBeUndefined()
  })

  it('handles Warp without output', () => {
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

    const result = convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].outputSchema).toBeUndefined()
  })

  it('handles default values in inputs', () => {
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

    const result = convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].inputSchema.properties.name.default).toBe('default-name')
    expect(result.tools[0].inputSchema.properties.count.default).toBe(10)
    expect(result.tools[0].inputSchema.properties.active.default).toBe(true)
  })

  it('handles Warp without description', () => {
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

    const result = convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].description).toBeUndefined()
  })

  it('uses action description when warp description is missing', () => {
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

    const result = convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].description).toBe('Action description')
  })

  it('handles Warp without headers', () => {
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

    const result = convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].headers).toBeUndefined()
  })

  it('filters out inputs that are not payload inputs', () => {
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

    const result = convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].inputSchema.properties.payload_input).toBeDefined()
    expect(result.tools[0].inputSchema.properties.non_payload_input).toBeUndefined()
  })

  it('returns empty arrays when Warp has no actions', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'no_actions',
      title: { en: 'No Actions' },
      description: null,
      actions: [],
    }

    const result = convertWarpToMcpCapabilities(warp)
    expect(result.tools).toEqual([])
    expect(result.resources).toEqual([])
  })

  it('skips MCP action when it has no destination', () => {
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

    const result = convertWarpToMcpCapabilities(warp)
    expect(result.tools).toEqual([])
    expect(result.resources).toEqual([])
  })

  it('converts all Warp input types to JSON Schema types', () => {
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

    const result = convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].inputSchema.properties.str.type).toBe('string')
    expect(result.tools[0].inputSchema.properties.bool.type).toBe('boolean')
    expect(result.tools[0].inputSchema.properties.uint8.type).toBe('integer')
    expect(result.tools[0].inputSchema.properties.uint256.type).toBe('integer')
    expect(result.tools[0].inputSchema.properties.biguint.type).toBe('integer')
  })

  it('converts transfer action to tool', () => {
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

    const result = convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(1)
    expect(result.resources).toHaveLength(0)
    expect(result.tools[0].name).toBe('transfer_test_0')
    expect(result.tools[0].description).toBe('Transfer action')
  })

  it('converts contract action to tool', () => {
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

    const result = convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(1)
    expect(result.resources).toHaveLength(0)
    expect(result.tools[0].name).toBe('contract_test_0')
  })

  it('converts query action to resource', () => {
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

    const result = convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(0)
    expect(result.resources).toHaveLength(1)
    expect(result.resources[0].name).toBe('query_test_0')
    expect(result.resources[0].uri).toBe('erd1query')
    expect(result.resources[0].description).toBe('Query action')
  })

  it('converts collect action with POST to tool', () => {
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

    const result = convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(1)
    expect(result.resources).toHaveLength(0)
    expect(result.tools[0].name).toBe('collect_post_test_0')
    expect(result.tools[0].url).toBe('https://api.example.com/collect')
    expect(result.tools[0].headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('converts collect action with PUT to tool', () => {
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

    const result = convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(1)
    expect(result.resources).toHaveLength(0)
  })

  it('converts collect action with DELETE to tool', () => {
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

    const result = convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(1)
    expect(result.resources).toHaveLength(0)
  })

  it('converts collect action with GET to resource', () => {
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

    const result = convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(0)
    expect(result.resources).toHaveLength(1)
    expect(result.resources[0].name).toBe('collect_get_test_0')
    expect(result.resources[0].uri).toBe('https://api.example.com/data')
    expect(result.resources[0].mimeType).toBe('application/json')
    expect(result.resources[0].headers).toEqual({ Accept: 'application/json' })
    expect(result.resources[0].description).toBe('Collect GET action')
  })

  it('converts collect action without method (defaults to GET) to resource', () => {
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

    const result = convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(0)
    expect(result.resources).toHaveLength(1)
    expect(result.resources[0].uri).toBe('https://api.example.com/data')
  })

  it('converts collect action with string destination to resource', () => {
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

    const result = convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(0)
    expect(result.resources).toHaveLength(1)
    expect(result.resources[0].uri).toBe('https://api.example.com/data')
  })

  it('handles multiple actions of different types', () => {
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

    const result = convertWarpToMcpCapabilities(warp)
    expect(result.tools).toHaveLength(2)
    expect(result.resources).toHaveLength(2)
    expect(result.tools[0].name).toBe('multiple_actions_test_0')
    expect(result.tools[1].name).toBe('multiple_actions_test_2')
    expect(result.resources[0].name).toBe('multiple_actions_test_1')
    expect(result.resources[1].name).toBe('multiple_actions_test_3')
  })

  it('sanitizes tool names with spaces and colons', () => {
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

    const result = convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].name).toBe('MultiversX_Staking_Delegate_0')
    expect(result.tools[0].name).toMatch(/^[A-Za-z0-9_.-]+$/)
  })

  it('sanitizes resource names with invalid characters', () => {
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

    const result = convertWarpToMcpCapabilities(warp)

    expect(result.resources[0].name).toBe('Query_Get_Balance_Test_0')
    expect(result.resources[0].name).toMatch(/^[A-Za-z0-9_.-]+$/)
  })

  it('sanitizes MCP tool names with special characters', () => {
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

    const result = convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].name).toBe('test-tool_with_colons')
    expect(result.tools[0].name).toMatch(/^[A-Za-z0-9_.-]+$/)
  })

  it('handles names with multiple consecutive invalid characters', () => {
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

    const result = convertWarpToMcpCapabilities(warp)

    expect(result.tools[0].name).toBe('Tool_With_Spaces_0')
    expect(result.tools[0].name).not.toContain('__')
  })
})
