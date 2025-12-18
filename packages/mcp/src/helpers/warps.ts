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
  WarpTransferAction,
} from '@vleap/warps'

export const convertMcpToolToWarp = async (
  config: WarpClientConfig,
  tool: { name: string; description?: string; inputSchema?: any; outputSchema?: any },
  url: string,
  headers?: Record<string, string>
): Promise<Warp> => {
  const inputs: WarpActionInput[] = []

  if (tool.inputSchema && tool.inputSchema.properties) {
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
  if (tool.outputSchema && tool.outputSchema.properties) {
    const properties = tool.outputSchema.properties
    Object.keys(properties).forEach((key) => {
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

export const convertWarpToMcpCapabilities = (warp: Warp): { tools: any[]; resources: any[] } => {
  const tools: any[] = []
  const resources: any[] = []

  const description = warp.description && typeof warp.description === 'object' && 'en' in warp.description ? warp.description.en : undefined

  const outputSchema: any = {
    type: 'object',
    properties: {},
  }

  if (warp.output && Object.keys(warp.output).length > 0) {
    Object.keys(warp.output).forEach((key) => {
      outputSchema.properties[key] = {
        type: 'string',
        description: `Output field ${key}`,
      }
    })
  }

  const hasOutput = Object.keys(outputSchema.properties).length > 0

  warp.actions.forEach((action, index) => {
    const actionDescription =
      action.description && typeof action.description === 'object' && 'en' in action.description ? action.description.en : undefined

    const finalDescription = description || actionDescription || undefined

    if (action.type === 'transfer' || action.type === 'contract') {
      const tool = convertActionToTool(warp, action, finalDescription, hasOutput ? outputSchema : undefined, index)
      tools.push(tool)
    } else if (action.type === 'query') {
      const resource = convertActionToResource(warp, action, finalDescription, index)
      resources.push(resource)
    } else if (action.type === 'collect') {
      const collectAction = action as WarpCollectAction
      if (
        collectAction.destination &&
        typeof collectAction.destination === 'object' &&
        'method' in collectAction.destination &&
        (collectAction.destination.method === 'POST' ||
          collectAction.destination.method === 'PUT' ||
          collectAction.destination.method === 'DELETE')
      ) {
        const tool = convertActionToTool(warp, action, finalDescription, hasOutput ? outputSchema : undefined, index)
        tools.push(tool)
      } else {
        const resource = convertActionToResource(warp, action, finalDescription, index)
        resources.push(resource)
      }
    } else if (action.type === 'mcp') {
      const mcpAction = action as WarpMcpAction
      if (mcpAction.destination) {
        const tool = convertMcpActionToTool(warp, mcpAction, finalDescription, hasOutput ? outputSchema : undefined)
        tools.push(tool)
      }
    }
  })

  return { tools, resources }
}

const convertActionToTool = (
  warp: Warp,
  action: WarpTransferAction | WarpContractAction | WarpCollectAction,
  description: string | undefined,
  outputSchema: any | undefined,
  index: number
): any => {
  const inputSchema = buildInputSchema(action.inputs || [])
  const name = `${warp.name}_${index}`

  let url: string | undefined
  let headers: Record<string, string> | undefined

  if (action.type === 'collect') {
    const collectAction = action as WarpCollectAction
    if (collectAction.destination && typeof collectAction.destination === 'object' && 'url' in collectAction.destination) {
      url = collectAction.destination.url
      headers = collectAction.destination.headers
    }
  }

  return {
    name,
    description,
    inputSchema: Object.keys(inputSchema.properties).length > 0 ? inputSchema : undefined,
    outputSchema,
    url,
    headers,
  }
}

const convertActionToResource = (
  warp: Warp,
  action: WarpQueryAction | WarpCollectAction,
  description: string | undefined,
  index: number
): any => {
  const name = `${warp.name}_${index}`
  let uri: string | undefined
  let mimeType: string | undefined
  let headers: Record<string, string> | undefined

  if (action.type === 'query') {
    const queryAction = action as WarpQueryAction
    if (queryAction.address) {
      uri = queryAction.address
    }
  } else if (action.type === 'collect') {
    const collectAction = action as WarpCollectAction
    if (collectAction.destination) {
      if (typeof collectAction.destination === 'string') {
        uri = collectAction.destination
      } else if (typeof collectAction.destination === 'object' && 'url' in collectAction.destination) {
        uri = collectAction.destination.url
        headers = collectAction.destination.headers
        mimeType = 'application/json'
      }
    }
  }

  return {
    uri: uri || name,
    name,
    description,
    mimeType,
    headers,
  }
}

const convertMcpActionToTool = (warp: Warp, action: WarpMcpAction, description: string | undefined, outputSchema: any | undefined): any => {
  const inputSchema = buildInputSchema(action.inputs || [])
  const { url, tool: toolName, headers } = action.destination!

  return {
    name: toolName,
    description,
    inputSchema: Object.keys(inputSchema.properties).length > 0 ? inputSchema : undefined,
    outputSchema,
    url,
    headers,
  }
}

const buildInputSchema = (inputs: WarpActionInput[]): any => {
  const inputSchema: any = {
    type: 'object',
    properties: {},
    required: [],
  }

  inputs.forEach((input) => {
    if (input.position && typeof input.position === 'string' && input.position.startsWith('payload:')) {
      const key = input.position.replace('payload:', '')
      const jsonSchemaType = convertWarpTypeToJsonSchemaType(input.type)

      const property: any = {
        type: jsonSchemaType.type,
      }

      if (jsonSchemaType.format) {
        property.format = jsonSchemaType.format
      }

      if (input.label && typeof input.label === 'object' && 'en' in input.label) {
        property.title = input.label.en
      }

      if (input.description && typeof input.description === 'object' && 'en' in input.description) {
        property.description = input.description.en
      }

      if (input.default !== undefined) {
        property.default = input.default
      }

      inputSchema.properties[key] = property

      if (input.required) {
        inputSchema.required.push(key)
      }
    }
  })

  return inputSchema
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
