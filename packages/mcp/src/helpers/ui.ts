import { Warp, WarpClientConfig, WarpLogger } from '@joai/warps'
import type { WarpMcpResource } from '../types'
import { extractTextOrUndefined } from './warps'

const downloadApp = async (url: string): Promise<string> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download app from ${url}: HTTP ${res.status} ${res.statusText}`)
  return res.text()
}

const resolveUrl = (base: string, path: string): string => {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const baseUrl = new URL(base)
  return new URL(path, baseUrl).href
}

const inlineResources = async (html: string, baseUrl: string): Promise<string> => {
  const cssRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi
  const jsRegex = /<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi

  const promises: Promise<{ match: string; content: string }>[] = []
  let match: RegExpExecArray | null

  while ((match = cssRegex.exec(html)) !== null) {
    const matchStr = match[0]
    const url = resolveUrl(baseUrl, match[1])
    promises.push(
      fetch(url)
        .then((res) => (res.ok ? res.text() : ''))
        .then((content) => ({ match: matchStr, content: content ? `<style>${content}</style>` : '' }))
        .catch(() => ({ match: matchStr, content: '' }))
    )
  }

  while ((match = jsRegex.exec(html)) !== null) {
    const matchStr = match[0]
    const url = resolveUrl(baseUrl, match[1])
    promises.push(
      fetch(url)
        .then((res) => (res.ok ? res.text() : ''))
        .then((content) => ({ match: matchStr, content: content ? `<script>${content}</script>` : '' }))
        .catch(() => ({ match: matchStr, content: '' }))
    )
  }

  if (promises.length === 0) return html

  const results = await Promise.all(promises)
  let result = html
  for (const { match, content } of results) {
    result = result.replace(match, content || '')
  }

  return result
}

const stripHtmlTags = (html: string): string => {
  let result = html
  result = result.replace(/<html[^>]*>/gi, '').replace(/<\/html>/gi, '')
  result = result.replace(/<head[^>]*>/gi, '').replace(/<\/head>/gi, '')
  result = result.replace(/<body[^>]*>/gi, '').replace(/<\/body>/gi, '')
  return result.trim()
}

const injectData = (html: string, data: Record<string, any>): string => {
  const script = `<script type="application/json" id="warp-app-data">${JSON.stringify(data)}</script>`
  const stripped = stripHtmlTags(html)
  return `${script}\n${stripped}`
}

export const createAppResource = async (warp: Warp, appUrl: string, config: WarpClientConfig): Promise<WarpMcpResource | null> => {
  if (!warp.meta?.identifier) return null
  try {
    let html = await downloadApp(appUrl)
    html = await inlineResources(html, appUrl)
    const data = {
      warp: {
        name: warp.name,
        title: extractTextOrUndefined(warp.title, config),
        description: extractTextOrUndefined(warp.description, config),
      },
    }
    return {
      name: warp.name,
      uri: `ui://widget/${warp.meta.identifier}`,
      description: `ChatGPT app for ${warp.name}`,
      mimeType: 'text/html+skybridge',
      content: injectData(html, data),
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    WarpLogger.error(`[MCP] Failed to create app resource for warp "${warp.name}" (url: ${appUrl}):`, errorMessage)
    if (errorStack) {
      WarpLogger.error(`[MCP] Error stack:`, errorStack)
    }
    return null
  }
}
