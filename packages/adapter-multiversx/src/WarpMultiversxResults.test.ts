// Tests for the MultiversxResults class. All tests focus on the MultiversxResults class directly.
import { SmartContractResult, TransactionEvent, TransactionLogs, TransactionOnNetwork, TypedValue } from '@multiversx/sdk-core/out'
import { extractCollectResults, Warp, WarpContractAction, WarpInitConfig } from '@vleap/warps-core'
import { promises as fs, PathLike } from 'fs'
import fetchMock from 'jest-fetch-mock'
import { setupHttpMock } from './test-utils/mockHttp'
import { WarpMultiversxResults } from './WarpMultiversxResults'
const path = require('path')

const testConfig: WarpInitConfig = {
  env: 'devnet',
  user: {
    wallet: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
  },
  currentUrl: 'https://example.com',
}

// Patch global fetch for ABI requests to use the mock server
let originalFetch: any

beforeEach(() => {
  originalFetch = global.fetch
  global.fetch = fetchMock as any
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('Result Helpers', () => {
  let subject: WarpMultiversxResults
  beforeEach(() => {
    subject = new WarpMultiversxResults(testConfig)
  })

  describe('input-based results', () => {
    it('returns input-based result by input name (query)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'query',
            label: 'Test Query',
            address: 'erd1...',
            func: 'test',
            args: [],
            inputs: [
              { name: 'foo', type: 'string', source: 'field' },
              { name: 'bar', type: 'biguint', source: 'field' },
            ],
          },
        ],
        results: {
          FOO: 'input.foo',
          BAR: 'input.bar',
        },
      } as any
      const typedValues: TypedValue[] = []
      const inputs = [
        { input: warp.actions[0].inputs[0], value: 'string:abc' },
        { input: warp.actions[0].inputs[1], value: 'biguint:1234567890' },
      ]
      const { results } = await subject.extractQueryResults(warp, typedValues, 1, inputs)
      expect(results.FOO).toBe('abc')
      expect(results.BAR).toBe(1234567890n)
    })

    it('returns input-based result by input.as alias (query)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'query',
            label: 'Test Query',
            address: 'erd1...',
            func: 'test',
            args: [],
            inputs: [{ name: 'foo', as: 'FOO_ALIAS', type: 'string', source: 'field' }],
          },
        ],
        results: {
          FOO: 'input.FOO_ALIAS',
        },
      } as any
      const typedValues: TypedValue[] = []
      const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:aliased' }]
      const { results } = await subject.extractQueryResults(warp, typedValues, 1, inputs)
      expect(results.FOO).toBe('aliased')
    })

    it('returns null for missing input (query)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'query',
            label: 'Test Query',
            address: 'erd1...',
            func: 'test',
            args: [],
            inputs: [{ name: 'foo', type: 'string', source: 'field' }],
          },
        ],
        results: {
          BAR: 'input.bar',
        },
      } as any
      const typedValues: TypedValue[] = []
      const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:abc' }]
      const { results } = await subject.extractQueryResults(warp, typedValues, 1, inputs)
      expect(results.BAR).toBeNull()
    })

    it('returns input-based result by input name (collect)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'collect',
            label: 'Test Collect',
            destination: { url: 'https://api.example.com' },
            inputs: [
              { name: 'foo', type: 'string', source: 'field' },
              { name: 'bar', type: 'string', source: 'field' },
            ],
          },
        ],
        results: {
          FOO: 'input.foo',
          BAR: 'input.bar',
        },
      } as any
      const response = { data: { some: 'value' } }
      const inputs = [
        { input: warp.actions[0].inputs[0], value: 'string:abc' },
        { input: warp.actions[0].inputs[1], value: 'string:xyz' },
      ]
      const { results } = await extractCollectResults(warp, response, 1, inputs)
      expect(results.FOO).toBe('abc')
      expect(results.BAR).toBe('xyz')
    })

    it('returns input-based result by input.as alias (collect)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'collect',
            label: 'Test Collect',
            destination: { url: 'https://api.example.com' },
            inputs: [{ name: 'foo', as: 'FOO_ALIAS', type: 'string', source: 'field' }],
          },
        ],
        results: {
          FOO: 'input.FOO_ALIAS',
        },
      } as any
      const response = { data: { some: 'value' } }
      const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:aliased' }]
      const { results } = await extractCollectResults(warp, response, 1, inputs)
      expect(results.FOO).toBe('aliased')
    })

    it('returns null for missing input (collect)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'collect',
            label: 'Test Collect',
            destination: { url: 'https://api.example.com' },
            inputs: [{ name: 'foo', type: 'string', source: 'field' }],
          },
        ],
        results: {
          BAR: 'input.bar',
        },
      } as any
      const response = { data: { some: 'value' } }
      const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:abc' }]
      const { results } = await extractCollectResults(warp, response, 1, inputs)
      expect(results.BAR).toBeNull()
    })
  })

  describe('input-based results (contract)', () => {
    it('returns input-based result by input name (contract)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'contract',
            label: 'Test Contract',
            address: 'erd1...',
            func: 'test',
            abi: 'dummy',
            gasLimit: 1000000,
            inputs: [
              { name: 'foo', type: 'string', source: 'field' },
              { name: 'bar', type: 'string', source: 'field' },
            ],
          },
        ],
        results: {
          FOO: 'input.foo',
          BAR: 'input.bar',
        },
      } as any
      const action = warp.actions[0]
      const tx = new TransactionOnNetwork()
      const inputs = [
        { input: warp.actions[0].inputs[0], value: 'string:abc' },
        { input: warp.actions[0].inputs[1], value: 'string:xyz' },
      ]
      const { results } = await subject.extractContractResults(warp, 1, tx, inputs)
      expect(results.FOO).toBe('abc')
      expect(results.BAR).toBe('xyz')
    })

    it('returns input-based result by input.as alias (contract)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'contract',
            label: 'Test Contract',
            address: 'erd1...',
            func: 'test',
            abi: 'dummy',
            gasLimit: 1000000,
            inputs: [{ name: 'foo', as: 'FOO_ALIAS', type: 'string', source: 'field' }],
          },
        ],
        results: {
          FOO: 'input.FOO_ALIAS',
        },
      } as any
      const action = warp.actions[0]
      const tx = new TransactionOnNetwork()
      const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:aliased' }]
      const { results } = await subject.extractContractResults(warp, 1, tx, inputs)
      expect(results.FOO).toBe('aliased')
    })

    it('returns null for missing input (contract)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'contract',
            label: 'Test Contract',
            address: 'erd1...',
            func: 'test',
            abi: 'dummy',
            gasLimit: 1000000,
            inputs: [{ name: 'foo', type: 'string', source: 'field' }],
          },
        ],
        results: {
          BAR: 'input.bar',
        },
      } as any
      const action = warp.actions[0]
      const tx = new TransactionOnNetwork()
      const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:abc' }]
      const { results } = await subject.extractContractResults(warp, 1, tx, inputs)
      expect(results.BAR).toBeNull()
    })
  })

  describe('extractContractResults', () => {
    it('returns empty results when no results defined', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [],
      } as Warp
      const action = { type: 'contract' } as WarpContractAction
      const tx = new TransactionOnNetwork()

      const { values, results } = await subject.extractContractResults(warp, 1, tx, [])

      expect(values).toEqual([])
      expect(results).toEqual({})
    })

    it('extracts event results from transaction', async () => {
      const httpMock = setupHttpMock()
      httpMock.registerResponse('https://example.com/test.abi.json', await loadAbiContents(path.join(__dirname, 'testdata/test.abi.json')))
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'contract',
            label: 'test',
            description: 'test',
            address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
            func: 'register',
            abi: 'https://example.com/test.abi.json',
            gasLimit: 1000000,
          } as WarpContractAction,
        ],
        results: {
          TOKEN_ID: 'event.registeredWithToken.2',
          DURATION: 'event.registeredWithToken.4',
        },
      } as Warp

      const tx = new TransactionOnNetwork({
        nonce: 7n,
        smartContractResults: [
          new SmartContractResult({
            data: Buffer.from('@6f6b@10'),
            logs: new TransactionLogs({
              events: [
                new TransactionEvent({
                  identifier: 'registeredWithToken',
                  topics: [
                    Buffer.from('cmVnaXN0ZXJlZFdpdGhUb2tlbg==', 'base64'),
                    Buffer.from('AAAAAAAAAAAFAPWuOkANricr0lRon9WkT4jj8pSeV4c=', 'base64'),
                    Buffer.from('QUJDLTEyMzQ1Ng==', 'base64'),
                    Buffer.from('REVGLTEyMzQ1Ng==', 'base64'),
                    Buffer.from('MTIwOTYwMA==', 'base64'),
                  ],
                  additionalData: [Buffer.from('AAAAAAAAA9sAAAA=', 'base64')],
                }),
              ],
            }),
          }),
        ],
      })

      const { values, results } = await subject.extractContractResults(warp, 1, tx, [])

      expect(results.TOKEN_ID).toBe('DEF-123456')
      expect(results.DURATION).toBeNull()
    })

    it('extracts output results from transaction', async () => {
      const httpMock = setupHttpMock()
      httpMock.registerResponse('https://example.com/test.abi.json', await loadAbiContents(path.join(__dirname, 'testdata/test.abi.json')))
      const action = {
        type: 'contract',
        label: 'test',
        description: 'test',
        address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
        func: 'register',
        abi: 'https://example.com/test.abi.json',
        gasLimit: 1000000,
      } as WarpContractAction

      const tx = new TransactionOnNetwork({
        nonce: 7n,
        smartContractResults: [
          new SmartContractResult({
            data: Buffer.from('@6f6b@16'),
          }),
        ],
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [action],
        results: {
          FIRST_OUT: 'out.1',
          SECOND_OUT: 'out.2',
        },
      } as Warp

      const { results } = await subject.extractContractResults(warp, 1, tx, [])

      expect(results.FIRST_OUT).toBe('22')
      expect(results.SECOND_OUT).toBeNull()
    })
  })

  describe('extractQueryResults', () => {
    it('returns empty results when no results defined', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [],
      } as Warp
      const typedValues: TypedValue[] = []

      const tx = new TransactionOnNetwork()
      ;(tx as any).typedValues = typedValues
      const { values, results } = await subject.extractQueryResults(warp, typedValues, 1, [])

      expect(values).toEqual([])
      expect(results).toEqual({})
    })
  })

  describe('resolveWarpResultsRecursively', () => {
    it('properly resolves results with out[N] references', async () => {
      // First action returns user info
      const httpMock = setupHttpMock()
      httpMock.registerResponse('/user', {
        id: '12345',
        username: 'testuser',
        email: 'test@example.com',
      })

      // Second action returns posts for this user
      httpMock.registerResponse('/posts/12345', {
        posts: [
          { id: 1, title: 'First post' },
          { id: 2, title: 'Second post' },
        ],
      })

      // Setup a warp with two collect actions
      const userAction = {
        type: 'collect' as const,
        label: 'Get User',
        destination: {
          url: '/user',
        },
      }

      const postsAction = {
        type: 'collect' as const,
        label: 'Get Posts',
        destination: {
          url: '/posts/12345',
        },
      }

      const warp = {
        protocol: 'test',
        name: 'test-multi-action',
        title: 'Test Multi Action',
        description: 'Test with multiple actions and dependencies',
        actions: [userAction, postsAction],
        results: {
          USER_ID: 'out[1].id',
          USERNAME: 'out[1].username',
          POSTS: 'out[2].posts',
        },
      }

      // Create subject after mock server is started
      const subject = new WarpMultiversxResults(testConfig)
      // Patch executeCollect and executeQuery to always return a full WarpExecution object
      const mockExecutor = {
        executeCollect: async (warpArg: any, actionIndex: any, actionInputs: any, meta: any) => ({
          success: true,
          warp: warpArg,
          action: actionIndex,
          user: testConfig.user?.wallet || null,
          txHash: '',
          next: null,
          values: [],
          results: {
            USER_ID: '12345',
            USERNAME: 'testuser',
            POSTS: [
              { id: 1, title: 'First post' },
              { id: 2, title: 'Second post' },
            ],
          },
          messages: {},
        }),
        executeQuery: async (warpArg: any, actionIndex: any, actionInputs: any) => ({
          success: true,
          warp,
          action: 1,
          user: testConfig.user?.wallet || null,
          txHash: '',
          next: null,
          values: [],
          results: {},
          messages: {},
        }),
      }

      const result = await subject.resolveWarpResultsRecursively({
        warp,
        entryActionIndex: 1,
        executor: mockExecutor,
        inputs: [],
      })

      // All results should be available from a single call
      expect(result.success).toBe(true)
      expect(result.results.USER_ID).toBe('12345')
      expect(result.results.USERNAME).toBe('testuser')
      expect(result.results.POSTS).toEqual([
        { id: 1, title: 'First post' },
        { id: 2, title: 'Second post' },
      ])
    })

    it('executes a warp with dependencies and transforms', async () => {
      // First action returns user info
      const httpMock = setupHttpMock()
      httpMock.registerResponse('/user', {
        id: '12345',
        username: 'testuser',
        email: 'test@example.com',
      })

      // Second action returns posts for this user
      httpMock.registerResponse('/posts/12345', {
        posts: [
          { id: 1, title: 'First post' },
          { id: 2, title: 'Second post' },
        ],
      })

      // Setup a warp with two collect actions
      const userAction = {
        type: 'collect' as const,
        label: 'Get User',
        destination: {
          url: '/user',
        },
      }

      const postsAction = {
        type: 'collect' as const,
        label: 'Get Posts',
        destination: {
          url: '/posts/12345',
        },
      }

      const warp = {
        protocol: 'test',
        name: 'test-multi-action',
        title: 'Test Multi Action',
        description: 'Test with multiple actions and dependencies',
        actions: [userAction, postsAction],
        results: {
          USER_ID: 'out[1].id',
          USERNAME: 'out[1].username',
          POSTS: 'out[2].posts',
          POST_COUNT: 'transform:() => { return result.POSTS ? result.POSTS.length : 0 }',
          USER_WITH_POSTS: 'transform:() => { return { user: result.USERNAME, posts: result.POSTS } }',
        },
      }

      // Create subject after mock server is started
      const subject = new WarpMultiversxResults(testConfig)
      // Patch executeCollect and executeQuery to always return a full WarpExecution object
      const mockExecutor = {
        executeCollect: async (warpArg: any, actionIndex: any, actionInputs: any, meta: any) => ({
          success: true,
          warp: warpArg,
          action: actionIndex,
          user: testConfig.user?.wallet || null,
          txHash: '',
          next: null,
          values: [],
          results: {
            USER_ID: '12345',
            USERNAME: 'testuser',
            POSTS: [
              { id: 1, title: 'First post' },
              { id: 2, title: 'Second post' },
            ],
          },
          messages: {},
        }),
        executeQuery: async (warpArg: any, actionIndex: any, actionInputs: any) => ({
          success: true,
          warp,
          action: 1,
          user: testConfig.user?.wallet || null,
          txHash: '',
          next: null,
          values: [],
          results: {},
          messages: {},
        }),
      }

      // Execute the warp from the first action (entry point 1)
      const result = await subject.resolveWarpResultsRecursively({
        warp,
        entryActionIndex: 1,
        executor: mockExecutor,
        inputs: [],
      })

      // The result should be from the entry action (1)
      expect(result.success).toBe(true)
      expect(result.action).toBe(1)

      // It should include all results
      expect(result.results.USER_ID).toBe('12345')
      expect(result.results.USERNAME).toBe('testuser')
      expect(result.results.POSTS).toEqual([
        { id: 1, title: 'First post' },
        { id: 2, title: 'Second post' },
      ])

      // And transforms should have access to the combined results
      expect(result.results.POST_COUNT).toBe(2)
      expect(result.results.USER_WITH_POSTS).toEqual({
        user: 'testuser',
        posts: [
          { id: 1, title: 'First post' },
          { id: 2, title: 'Second post' },
        ],
      })
    })
  })
})

const loadAbiContents = async (path: PathLike): Promise<any> => {
  let jsonContent: string = await fs.readFile(path, { encoding: 'utf8' })
  return JSON.parse(jsonContent)
}
