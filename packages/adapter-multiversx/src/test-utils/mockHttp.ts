import { createServer, IncomingMessage, Server, ServerResponse } from 'http'
import { AddressInfo } from 'net'

export type MockHttpResponse = {
  url: string
  method?: string
  response: any
  status?: number
  headers?: Record<string, string>
}

export class MockHttpServer {
  private server: Server
  private responses: MockHttpResponse[] = []
  private port: number = 0

  constructor() {
    this.server = createServer(this.handleRequest.bind(this))
  }

  start(): Promise<number> {
    return new Promise((resolve) => {
      this.server.listen(0, () => {
        this.port = (this.server.address() as AddressInfo).port
        resolve(this.port)
      })
    })
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => resolve())
    })
  }

  registerResponse(path: string, response: any, method: string = 'GET', status: number = 200, headers: Record<string, string> = {}) {
    this.responses.push({ url: path, method, response, status, headers })
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse) {
    const url = req.url || ''
    const method = req.method || 'GET'
    const path = new URL(url, 'http://localhost').pathname
    const match = this.responses.find((r) => r.url === path && r.method === method)
    if (match) {
      res.writeHead(match.status || 200, match.headers || { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(match.response))
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not found' }))
    }
  }
}

export function setupHttpMock() {
  const server = new MockHttpServer()
  let port: number | undefined

  return {
    server,
    async start() {
      port = await server.start()
      return port
    },
    async stop() {
      await server.stop()
    },
    get url() {
      if (!port) throw new Error('Server not started')
      return `http://localhost:${port}`
    },
    registerResponse: server.registerResponse.bind(server),
    cleanup: async () => {
      await server.stop()
    },
  }
}
