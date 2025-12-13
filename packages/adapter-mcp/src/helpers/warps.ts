import { Warp, WarpActionInput, WarpActionInputType, WarpMcpAction } from '@vleap/warps'

export const convertMcpToolToWarp = (
  tool: { name: string; description?: string; inputSchema?: any; outputSchema?: any },
  url: string,
  headers?: Record<string, string>
): Warp => {
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
        description: value.description ? { en: value.description } : null,
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
    description: tool.description ? { en: tool.description } : null,
    destination: { url, tool: tool.name, headers },
    inputs,
  }

  const warp: Warp = {
    protocol: 'mcp',
    name: tool.name,
    title: { en: tool.name },
    description: tool.description ? { en: tool.description } : null,
    actions: [mcpAction],
    output: Object.keys(output).length > 0 ? output : undefined,
  }

  return warp
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
