import { z } from 'zod'
import { Warp } from '@vleap/warps'

export type WarpMcpServerConfig = {
  name: string
  version?: string
  executor?: WarpMcpExecutor
}

export type JsonSchema = Record<string, unknown>
export type ToolInputSchema = Record<string, z.ZodTypeAny> | JsonSchema | undefined
export type ToolOutputSchema = JsonSchema | undefined
export type ToolMeta = Record<string, string | boolean>
export type ResourceMeta = Record<string, unknown>

export type WarpMcpTool = {
  name: string
  description?: string
  inputSchema?: ToolInputSchema
  outputSchema?: ToolOutputSchema
  _meta?: ToolMeta
}

export type WarpMcpResource = {
  name?: string
  uri: string
  description?: string
  mimeType?: string
  content?: string
  meta?: ResourceMeta
}

export type WarpMcpCapabilities = {
  tool?: WarpMcpTool | null
  resource?: WarpMcpResource | null
}

export type McpToolArgs = Record<string, unknown>
export type McpToolResult = { content: Array<{ type: 'text'; text: string }> }
export type WarpMcpExecutor = (warp: Warp, inputs: string[]) => Promise<McpToolResult>
