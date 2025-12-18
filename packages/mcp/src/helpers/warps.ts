import {
  Warp,
  WarpActionInput,
  WarpActionInputType,
  WarpBuilder,
  WarpClientConfig,
  WarpCollectAction,
  WarpContractAction,
  WarpMcpAction,
  WarpQueryAction,
  WarpText,
  WarpTransferAction,
} from '@vleap/warps'

export const convertMcpToolToWarp = async (
  config: WarpClientConfig,
  tool: { name: string; description?: string; inputSchema?: any; outputSchema?: any },
  url: string,
  headers?: Record<string, string>
): Promise<Warp> => {
  const inputs: WarpActionInput[] = []

  if (tool.inputSchema?.properties) {
    const properties = tool.inputSchema.properties
    const required = tool.inputSchema.required || []

    Object.entries(properties).forEach(([key, value]: [string, any]) => {
      const isRequired = required.includes(key)
      const inputType = convertJsonSchemaTypeToWarpType(value.type, value.format)

      const inputDef: WarpActionInput = {
        name: key,
        label: value.title || { en: key },
        description: value.description ? { en: value.description.trim() } : null,
        type: inputType,
        position: `payload:${key}`,
        source: 'field',
        required: isRequired,
        default: value.default,
      }

      inputs.push(inputDef)
    })
  }

  const output: Record<string, string> = {}
  if (tool.outputSchema?.properties) {
    Object.keys(tool.outputSchema.properties).forEach((key) => {
      output[key] = `out.${key}`
    })
  }

  const mcpAction: WarpMcpAction = {
    type: 'mcp',
    label: { en: tool.name },
    description: tool.description ? { en: tool.description.trim() } : null,
    destination: { url, tool: tool.name, headers },
    inputs,
  }

  return await new WarpBuilder(config)
    .setName(tool.name)
    .setTitle({ en: tool.name })
    .setDescription(tool.description ? { en: tool.description.trim() } : null)
    .addAction(mcpAction)
    .setOutput(Object.keys(output).length > 0 ? output : null)
    .build(false)
}

export const convertWarpToMcpCapabilities = (warp: Warp): { tools: any[] } => {
  const tools: any[] = []
  const warpDescription = extractText(warp.description)

  warp.actions.forEach((action, index) => {
    const actionDescription = extractText(action.description)
    const description = warpDescription || actionDescription

    if (action.type === 'mcp') {
      const mcpAction = action as WarpMcpAction
      if (mcpAction.destination) {
        const tool = convertMcpActionToTool(mcpAction, description)
        tools.push(tool)
      }
    } else {
      const tool = convertActionToTool(warp, action, description, index)
      tools.push(tool)
    }
  })

  return { tools }
}

const extractText = (text: WarpText | null | undefined): string | undefined => {
  if (!text) return undefined
  if (typeof text === 'string') return text
  if (typeof text === 'object' && 'en' in text) return text.en
  return undefined
}

const convertActionToTool = (
  warp: Warp,
  action: WarpTransferAction | WarpContractAction | WarpCollectAction | WarpQueryAction,
  description: string | undefined,
  index: number
): any => {
  const inputSchema = buildInputSchema(action.inputs || [])
  const name = sanitizeMcpName(`${warp.name}_${index}`)

  return {
    name,
    description,
    inputSchema: hasProperties(inputSchema) ? inputSchema : undefined,
  }
}

const convertMcpActionToTool = (action: WarpMcpAction, description: string | undefined): any => {
  const inputSchema = buildInputSchema(action.inputs || [])
  const toolName = action.destination!.tool

  return {
    name: sanitizeMcpName(toolName),
    description,
    inputSchema: hasProperties(inputSchema) ? inputSchema : undefined,
  }
}

const buildInputSchema = (inputs: WarpActionInput[]): any => {
  const schema: any = {
    type: 'object',
    properties: {},
    required: [],
  }

  inputs.forEach((input) => {
    if (!isPayloadInput(input)) return

    const key = extractPayloadKey(input.position as string)
    const property = buildPropertySchema(input)

    schema.properties[key] = property

    if (input.required) {
      schema.required.push(key)
    }
  })

  return schema
}

const isPayloadInput = (input: WarpActionInput): boolean => {
  return typeof input.position === 'string' && input.position.startsWith('payload:')
}

const extractPayloadKey = (position: string): string => {
  return position.replace('payload:', '')
}

const buildPropertySchema = (input: WarpActionInput): any => {
  const jsonSchemaType = convertWarpTypeToJsonSchemaType(input.type)
  const property: any = {
    type: jsonSchemaType.type,
  }

  if (jsonSchemaType.format) {
    property.format = jsonSchemaType.format
  }

  const title = extractText(input.label) || input.name
  if (title) {
    property.title = title
  }

  const description = buildDescription(input)
  if (description) {
    property.description = description
  }

  if (input.default !== undefined) {
    property.default = input.default
  }

  if (typeof input.min === 'number') {
    property.minimum = input.min
  }

  if (typeof input.max === 'number') {
    property.maximum = input.max
  }

  if (input.pattern) {
    property.pattern = input.pattern
  }

  const enumValues = extractEnumValues(input.options)
  if (enumValues) {
    property.enum = enumValues
  }

  return property
}

const buildDescription = (input: WarpActionInput): string | undefined => {
  const description = extractText(input.description)
  const patternDesc = extractText(input.patternDescription)

  if (!description && !patternDesc) return undefined
  if (description && patternDesc) return `${description}. ${patternDesc}`
  return description || patternDesc
}

const extractEnumValues = (options: string[] | { [key: string]: WarpText } | undefined): string[] | undefined => {
  if (!options) return undefined
  if (Array.isArray(options)) return options
  if (typeof options === 'object') return Object.keys(options)
  return undefined
}

const hasProperties = (schema: any): boolean => {
  return schema && schema.properties && Object.keys(schema.properties).length > 0
}

const sanitizeMcpName = (name: string): string => {
  return name
    .replace(/\s+/g, '_')
    .replace(/:/g, '_')
    .replace(/[^A-Za-z0-9_.-]/g, '_')
    .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '')
    .replace(/_+/g, '_')
}

const convertJsonSchemaTypeToWarpType = (type: string, format?: string): WarpActionInputType => {
  if (format === 'date-time' || format === 'date') return 'string'
  if (type === 'string') return 'string'
  if (type === 'number') return 'uint256'
  if (type === 'integer') return 'uint256'
  if (type === 'boolean') return 'bool'
  if (type === 'array') return 'string'
  if (type === 'object') return 'string'
  return 'string'
}

const convertWarpTypeToJsonSchemaType = (warpType: string): { type: string; format?: string } => {
  if (warpType === 'string') return { type: 'string' }
  if (warpType === 'bool') return { type: 'boolean' }
  if (
    warpType === 'uint8' ||
    warpType === 'uint16' ||
    warpType === 'uint32' ||
    warpType === 'uint64' ||
    warpType === 'uint128' ||
    warpType === 'uint256' ||
    warpType === 'biguint'
  ) {
    return { type: 'integer' }
  }
  if (warpType === 'number') return { type: 'number' }
  return { type: 'string' }
}
