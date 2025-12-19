import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { normalizeObjectSchema } from '@modelcontextprotocol/sdk/server/zod-compat'
import { Warp } from '@vleap/warps'
import { convertMcpArgsToWarpInputs } from './helpers/execution'
import { McpCapabilities, McpServerConfig, WarpExecutor } from './types'

const processInputSchema = (inputSchema: any): any => {
  if (!inputSchema) return undefined
  if (inputSchema._zod) return inputSchema._zod
  return normalizeObjectSchema(inputSchema) || inputSchema
}

export const createMcpServerFromWarps = (
  config: McpServerConfig,
  warps: Warp[],
  capabilities: McpCapabilities[],
  executor?: WarpExecutor
): McpServer => {
  const server = new McpServer({ name: config.name, version: config.version || '1.0.0' })
  const defaultExecutor = config.executor || executor

  for (let i = 0; i < capabilities.length; i++) {
    const { tools, resources } = capabilities[i]
    const warp = warps[i]

    tools?.forEach((tool) => {
      const inputSchema = processInputSchema(tool.inputSchema)
      server.registerTool(tool.name, { description: tool.description || '', inputSchema }, async (args: any) => {
        if (defaultExecutor) {
          const inputs = convertMcpArgsToWarpInputs(warp, args || {})
          const result = await defaultExecutor(warp, inputs)
          return result
        }
        return { content: [{ type: 'text' as const, text: `Tool ${tool.name} executed successfully` }] }
      })
    })

    resources?.forEach((resource) => {
      server.registerResource(
        resource.name || resource.uri,
        resource.uri,
        { description: resource.description, mimeType: resource.mimeType },
        async () => ({
          contents: [{ uri: resource.uri, mimeType: resource.mimeType || 'text/plain', text: 'Resource content' }],
        })
      )
    })
  }

  return server
}
