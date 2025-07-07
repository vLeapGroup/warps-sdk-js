import axios from 'axios'
import { promises as fs } from 'fs'
import fetchMock from 'jest-fetch-mock'

type MockResponse = {
  ok: boolean
  json: () => Promise<any>
}

type MockHandler = (url: string, options?: any) => Promise<MockResponse> | MockResponse
type MockImplementation = (url: string, options?: any) => Promise<MockResponse>

const createMockImplementation = (handlers: Map<string, MockHandler>): MockImplementation => {
  return async (url: string, options?: any): Promise<MockResponse> => {
    for (const [pattern, handler] of handlers.entries()) {
      if (url.startsWith(pattern)) {
        const response = await handler(url, options)
        return {
          ok: true,
          json: async () => response.json(),
        }
      }
    }

    console.error('Unregistered mock HTTP request:', { url, options })

    return {
      ok: false,
      json: async () => ({}),
    }
  }
}

export const loadJsonContents = async (path: string): Promise<any> => {
  const jsonContent = await fs.readFile(path, { encoding: 'utf8' })
  return JSON.parse(jsonContent)
}

export const setupHttpMock = () => {
  const originalFetch = global.fetch
  const handlers = new Map<string, MockHandler>()
  let mockImplementation: MockImplementation

  const registerHttpMockResponse = (url: string, handler: MockHandler) => {
    handlers.set(url, handler)
    mockImplementation = createMockImplementation(handlers)

    if (fetchMock) {
      fetchMock.mockImplementation(async (args_0: string | Request | undefined, args_1: RequestInit | undefined) => {
        let urlStr: string
        if (typeof args_0 === 'string') {
          urlStr = args_0
        } else if (args_0 && typeof args_0 === 'object' && 'url' in args_0) {
          urlStr = (args_0 as Request).url
        } else if (args_0 && typeof args_0 === 'object' && typeof (args_0 as any).toString === 'function') {
          urlStr = (args_0 as any).toString()
        } else if (args_0 !== undefined) {
          urlStr = String(args_0)
        } else {
          urlStr = ''
        }
        const mockResp = await mockImplementation(urlStr, args_1)
        return new Response(JSON.stringify(await mockResp.json()), { status: mockResp.ok ? 200 : 500 })
      })
    }
    if (mockAxios) {
      mockAxios.default.get.mockImplementation(async (url, options) => {
        const response = await mockImplementation(url, options)
        return { data: await response.json() }
      })
      mockAxios.default.post.mockImplementation(async (url, options) => {
        const response = await mockImplementation(url, options)
        return { data: await response.json() }
      })
      mockAxios.default.put.mockImplementation(async (url, options) => {
        const response = await mockImplementation(url, options)
        return { data: await response.json() }
      })
      mockAxios.default.delete.mockImplementation(async (url, options) => {
        const response = await mockImplementation(url, options)
        return { data: await response.json() }
      })
    }
  }

  const registerResponse = (url: string, response: any) => {
    registerHttpMockResponse(url, async () => ({
      ok: true,
      json: async () => response,
    }))
  }

  global.fetch = fetchMock as any

  const mockAxios = {
    default: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    },
  }

  jest.mock('axios', () => mockAxios)

  mockImplementation = createMockImplementation(handlers)
  fetchMock.mockImplementation(async (args_0: string | Request | undefined, args_1: RequestInit | undefined) => {
    let urlStr: string
    if (typeof args_0 === 'string') {
      urlStr = args_0
    } else if (args_0 && typeof args_0 === 'object' && 'url' in args_0) {
      urlStr = (args_0 as Request).url
    } else if (args_0 && typeof args_0 === 'object' && typeof (args_0 as any).toString === 'function') {
      urlStr = (args_0 as any).toString()
    } else if (args_0 !== undefined) {
      urlStr = String(args_0)
    } else {
      urlStr = ''
    }
    const mockResp = await mockImplementation(urlStr, args_1)
    return new Response(JSON.stringify(await mockResp.json()), { status: mockResp.ok ? 200 : 500 })
  })

  mockAxios.default.post.mockImplementation(async (url, data, config) => {
    const response = await mockImplementation(url, { method: 'POST', body: data })
    return {
      data: await response.json(),
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    }
  })

  mockAxios.default.get.mockImplementation(async (url, options) => {
    const response = await mockImplementation(url, options)
    return {
      data: await response.json(),
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    }
  })

  const assertCall = (
    url: string,
    options: {
      method?: string
      body?: any
      headers?: Record<string, string>
    },
    callIndex: number = -1
  ) => {
    const calls = fetchMock.mock.calls
    const call = calls[callIndex < 0 ? calls.length + callIndex : callIndex]

    expect(call[0]).toBe(url)

    if (options.method && call[1]) {
      expect(call[1].method).toBe(options.method)
    }

    if (options.body && call[1]) {
      expect(JSON.parse(call[1].body as string)).toEqual(options.body)
    }

    if (options.headers && call[1]) {
      expect(call[1].headers).toEqual(expect.objectContaining(options.headers))
    }
  }

  return {
    registerResponse,
    assertCall,
    cleanup: () => {
      global.fetch = originalFetch
      jest.clearAllMocks()
    },
  }
}

export const createErrorMock = (error: Error) => {
  const handlers = new Map<string, MockHandler>()
  const mockImplementation = createMockImplementation(handlers)

  const register = (url: string, handler: MockHandler) => {
    handlers.set(url, handler)
  }

  const originalFetch = global.fetch
  fetchMock.mockImplementation(async (args_0: string | Request | undefined, args_1: RequestInit | undefined) => {
    let urlStr: string
    if (typeof args_0 === 'string') {
      urlStr = args_0
    } else if (args_0 && typeof args_0 === 'object' && 'url' in args_0) {
      urlStr = (args_0 as Request).url
    } else if (args_0 && typeof args_0 === 'object' && typeof (args_0 as any).toString === 'function') {
      urlStr = (args_0 as any).toString()
    } else if (args_0 !== undefined) {
      urlStr = String(args_0)
    } else {
      urlStr = ''
    }
    const mockResp = await mockImplementation(urlStr, args_1)
    return new Response(JSON.stringify(await mockResp.json()), { status: mockResp.ok ? 200 : 500 })
  })
  fetchMock.mockRejectedValue(error)

  const mockAxios = {
    default: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    },
  }
  jest.spyOn(axios, 'get').mockImplementation(mockAxios.default.get)
  jest.spyOn(axios, 'post').mockImplementation(mockAxios.default.post)
  jest.spyOn(axios, 'put').mockImplementation(mockAxios.default.put)
  jest.spyOn(axios, 'delete').mockImplementation(mockAxios.default.delete)

  mockAxios.default.get.mockImplementation(async (url, options) => {
    const response = await mockImplementation(url, options)
    return { data: await response.json() }
  })
  mockAxios.default.post.mockImplementation(async (url, options) => {
    const response = await mockImplementation(url, options)
    return { data: await response.json() }
  })
  mockAxios.default.put.mockImplementation(async (url, options) => {
    const response = await mockImplementation(url, options)
    return { data: await response.json() }
  })
  mockAxios.default.delete.mockImplementation(async (url, options) => {
    const response = await mockImplementation(url, options)
    return { data: await response.json() }
  })
  mockAxios.default.get.mockRejectedValue(error)
  mockAxios.default.post.mockRejectedValue(error)
  mockAxios.default.put.mockRejectedValue(error)
  mockAxios.default.delete.mockRejectedValue(error)

  return {
    register,
    cleanup: () => {
      global.fetch = originalFetch
      jest.clearAllMocks()
    },
  }
}
