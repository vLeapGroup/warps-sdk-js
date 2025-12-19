import { Warp, WarpActionInputType, WarpBuilder, WarpClientConfig, WarpMcpAction, WarpText, getWarpPrimaryAction } from '@vleap/warps'
import type { McpResource } from '../types'
import { convertActionToTool, convertMcpActionToTool } from './tools'
import { createAppResource } from './ui'

export const extractText = (text: WarpText | null | undefined): string | undefined => {
  if (!text) return undefined
  if (typeof text === 'string') return text
  if (typeof text === 'object' && 'en' in text) return text.en
  return undefined
}

export const convertWarpToMcpCapabilities = async (warp: Warp): Promise<{ tools: any[]; resources?: McpResource[] }> => {
  const tools: any[] = []
  let appResource: McpResource | null = null

  if (warp.ui && warp.ui !== 'table') {
    appResource = await createAppResource(warp, warp.ui)
  }

  try {
    const { action: primaryAction } = getWarpPrimaryAction(warp)
    if (primaryAction.type === 'mcp') {
      const mcpAction = primaryAction as WarpMcpAction
      if (mcpAction.destination) {
        const description = extractText(warp.description) || extractText(primaryAction.description)
        const tool = convertMcpActionToTool(mcpAction, description, primaryAction.inputs, appResource?.uri)
        tools.push(tool)
      }
    } else {
      const description = extractText(warp.description) || extractText(primaryAction.description)
      const tool = convertActionToTool(warp, primaryAction, description, primaryAction.inputs, appResource?.uri)
      tools.push(tool)
    }
  } catch (error) {
    console.log(`[MCP] ${warp.name} - failed to get primary action:`, error)
  }

  return {
    tools,
    ...(appResource && { resources: [appResource] }),
  }
}

export const convertWarpsToMcpCapabilities = async (warps: Warp[]): Promise<{ tools: any[]; resources?: McpResource[] }[]> => {
  return Promise.all(warps.map(convertWarpToMcpCapabilities))
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

export const convertMcpToolToWarp = async (
  config: WarpClientConfig,
  tool: { name: string; description?: string; inputSchema?: any; outputSchema?: any },
  url: string,
  headers?: Record<string, string>
): Promise<Warp> => {
  const inputs: any[] = []

  if (tool.inputSchema?.properties) {
    const properties = tool.inputSchema.properties
    const required = tool.inputSchema.required || []

    Object.entries(properties).forEach(([key, value]: [string, any]) => {
      const isRequired = required.includes(key)
      const inputType = convertJsonSchemaTypeToWarpType(value.type, value.format)

      const inputDef = {
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
