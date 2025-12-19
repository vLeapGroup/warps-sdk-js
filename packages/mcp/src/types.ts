import { Warp } from '@vleap/warps'

export type McpTool = {
  name: string
  description?: string
  inputSchema?: any
  outputSchema?: any
  _meta?: Record<string, any>
}

export type McpResource = {
  name?: string
  uri: string
  description?: string
  mimeType?: string
  content?: string
}

export type McpCapabilities = {
  tools?: McpTool[]
  resources?: McpResource[]
}

export type WarpExecutor = (warp: Warp, inputs: string[]) => Promise<any>

export type McpServerConfig = {
  name: string
  version?: string
  executor?: WarpExecutor
}
