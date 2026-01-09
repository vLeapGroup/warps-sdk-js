import { Warp, WarpClientConfig, WarpLogger } from '@joai/warps'
import type { WarpMcpResource } from '../types'

const loadComponent = async (componentPath: string): Promise<string> => {
  // Check if it's a local file path (relative or absolute) or a URL
  if (componentPath.startsWith('http://') || componentPath.startsWith('https://')) {
    const res = await fetch(componentPath)
    if (!res.ok) throw new Error(`Failed to download component from ${componentPath}: HTTP ${res.status} ${res.statusText}`)
    return res.text()
  }

  throw new Error(`Unsupported component path: ${componentPath}`)
}

const createWidgetTemplate = (componentCode: string): string => {
  // Create widget template exactly as per OpenAI docs:
  // https://developers.openai.com/apps-sdk/build/mcp-server#build-your-mcp-server
  const parts: string[] = ['<div id="root"></div>']
  parts.push(`<script type="module">${componentCode}</script>`)
  return parts.join('\n').trim()
}

export const createAppResource = async (warp: Warp, componentPath: string, config: WarpClientConfig): Promise<WarpMcpResource | null> => {
  if (!warp.meta?.identifier) return null
  try {
    const rawContent = await loadComponent(componentPath)
    let content: string
    if (componentPath.endsWith('.html')) {
      content = rawContent
    } else {
      content = createWidgetTemplate(rawContent)
    }

    return {
      name: warp.name,
      uri: `ui://widget/${warp.meta.identifier}`,
      description: `ChatGPT app for ${warp.name}`,
      mimeType: 'text/html+skybridge',
      content: content,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    WarpLogger.error(`[MCP] Failed to create app resource for warp "${warp.name}" (path: ${componentPath}):`, errorMessage)
    if (errorStack) {
      WarpLogger.error(`[MCP] Error stack:`, errorStack)
    }
    return null
  }
}
