import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { normalizeObjectSchema } from '@modelcontextprotocol/sdk/server/zod-compat.js'
import { z } from 'zod'
import { Warp } from '@vleap/warps'
import { convertMcpArgsToWarpInputs } from './helpers/execution'
import { WarpMcpCapabilities, WarpMcpExecutor, WarpMcpServerConfig, ToolInputSchema, McpToolArgs, McpToolResult } from './types'

const processInputSchema = (inputSchema: ToolInputSchema): z.ZodTypeAny | Record<string, z.ZodTypeAny> | undefined => {
  if (!inputSchema) return undefined
  if (typeof inputSchema === 'object' && '_zod' in inputSchema) {
    return (inputSchema as { _zod: z.ZodTypeAny })._zod
  }
  if (typeof inputSchema === 'object' && !Array.isArray(inputSchema)) {
    const normalized = normalizeObjectSchema(inputSchema as Parameters<typeof normalizeObjectSchema>[0])
    return (normalized || inputSchema) as z.ZodTypeAny | Record<string, z.ZodTypeAny>
  }
  return inputSchema as z.ZodTypeAny | Record<string, z.ZodTypeAny>
}

export const createMcpServerFromWarps = (
  config: WarpMcpServerConfig,
  warps: Warp[],
  capabilities: WarpMcpCapabilities[],
  executor?: WarpMcpExecutor
): McpServer => {
  const server = new McpServer({ name: config.name, version: config.version || '1.0.0' })
  const defaultExecutor = config.executor || executor

  for (let i = 0; i < capabilities.length; i++) {
    const { tool, resource } = capabilities[i]
    const warp = warps[i]

    if (tool) {
      const inputSchema = processInputSchema(tool.inputSchema)
      const toolDefinition = { 
        description: tool.description || '', 
        inputSchema,
        ...(tool._meta && { _meta: tool._meta })
      }
      server.registerTool(tool.name, toolDefinition as Parameters<typeof server.registerTool>[1], async (args: McpToolArgs): Promise<McpToolResult> => {
        if (defaultExecutor) {
          const inputs = convertMcpArgsToWarpInputs(warp, args || {})
          const result = await defaultExecutor(warp, inputs)
          return result
        }
        return { content: [{ type: 'text' as const, text: `Tool ${tool.name} executed successfully` }] }
      })
    }

    if (resource) {
      server.registerResource(
        resource.name || resource.uri,
        resource.uri,
        { description: resource.description, mimeType: resource.mimeType },
        async () => {
          const content: { uri: string; text: string; mimeType?: string; _meta?: Record<string, unknown> } = {
            uri: resource.uri,
            text: resource.content || '',
            mimeType: resource.mimeType,
          }
          if (resource.meta) content._meta = resource.meta as Record<string, unknown>
          return { contents: [content] }
        }
      )
    }
  }

  return server
}
