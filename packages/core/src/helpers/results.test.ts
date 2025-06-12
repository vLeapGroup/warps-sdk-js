import { SmartContractResult, TransactionEvent, TransactionLogs, TransactionOnNetwork, TypedValue } from '@multiversx/sdk-core/out'
import { promises as fs, PathLike } from 'fs'
import { setupHttpMock } from '../test-utils/mockHttp'
import { Warp, WarpConfig, WarpContractAction } from '../types'
import { WarpActionExecutor } from '../WarpActionExecutor'
import { extractCollectResults, extractContractResults, extractQueryResults } from './results'

const testConfig: WarpConfig = {
  env: 'devnet',
  user: {
    wallet: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
  },
  currentUrl: 'https://example.com',
}

describe('Result Helpers', () => {
  describe('extractContractResults', () => {
    it('returns empty results when no results defined', async () => {
      const executor = new WarpActionExecutor(testConfig)
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [],
      } as Warp
      const action = { type: 'contract' } as WarpContractAction
      const tx = new TransactionOnNetwork()

      const { values, results } = await extractContractResults(executor, warp, action, tx)

      expect(values).toEqual([])
      expect(results).toEqual({})
    })

    it('extracts event results from transaction', async () => {
      const executor = new WarpActionExecutor(testConfig)
      const httpMock = setupHttpMock()
      httpMock.registerResponse('https://mock.com/test.abi.json', await loadAbiContents('./src/testdata/test.abi.json'))

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [],
        results: {
          TOKEN_ID: 'event.registeredWithToken.1',
          DURATION: 'event.registeredWithToken.3',
        },
      } as Warp

      const action = {
        type: 'contract',
        label: 'test',
        description: 'test',
        address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
        func: 'register',
        abi: 'https://mock.com/test.abi.json',
        gasLimit: 1000000,
      } as WarpContractAction

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
                    Buffer.from('EnUA', 'base64'),
                  ],
                  additionalData: [Buffer.from('AAAAAAAAA9sAAAA=', 'base64')],
                }),
              ],
            }),
          }),
        ],
      })

      const { values, results } = await extractContractResults(executor, warp, action, tx)

      expect(results.TOKEN_ID).toBe('ABC-123456')
      expect(results.DURATION).toBe('1209600')
      expect(values).toHaveLength(2)

      httpMock.cleanup()
    })

    it('extracts output results from transaction', async () => {
      const executor = new WarpActionExecutor(testConfig)
      const httpMock = setupHttpMock()

      httpMock.registerResponse('https://mock.com/test.abi.json', await loadAbiContents('./src/testdata/test.abi.json'))

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [],
        results: {
          FIRST_OUT: 'out.1',
          SECOND_OUT: 'out.2',
        },
      } as Warp

      const action = {
        type: 'contract',
        label: 'test',
        description: 'test',
        address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
        func: 'register',
        abi: 'https://mock.com/test.abi.json',
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

      const { values, results } = await extractContractResults(executor, warp, action, tx)

      expect(results.FIRST_OUT).toBe('22')
      expect(results.SECOND_OUT).toBeNull()
      expect(values).toHaveLength(2)

      httpMock.cleanup()
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

      const { values, results } = await extractQueryResults(warp, typedValues)

      expect(values).toEqual([])
      expect(results).toEqual({})
    })
  })

  describe('extractCollectResults', () => {
    it('returns empty results when no results defined', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [],
      } as Warp
      const response = {}

      const { values, results } = await extractCollectResults(warp, response)

      expect(values).toEqual([])
      expect(results).toEqual({})
    })

    it('extracts nested values from collect response', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [],
        results: {
          USERNAME: 'out.data.username',
          ID: 'out.data.id',
          ALL: 'out',
        },
      } as Warp

      const response = {
        data: {
          username: 'testuser',
          id: '123',
        },
      }

      const { values, results } = await extractCollectResults(warp, response)

      expect(results.USERNAME).toBe('testuser')
      expect(results.ID).toBe('123')
      expect(results.ALL).toEqual(response.data)
      expect(values).toHaveLength(3)
    })

    it('handles null values in response', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [],
        results: {
          USERNAME: 'out.data.username',
          MISSING: 'out.data.missing',
        },
      } as Warp

      const response = {
        data: {
          username: null,
        },
      }

      const { values, results } = await extractCollectResults(warp, response)

      expect(results.USERNAME).toBeNull()
      expect(results.MISSING).toBeNull()
      expect(values).toHaveLength(2)
    })

    it('evaluates transform results in collect', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [],
        results: {
          BASE: 'out.value',
          DOUBLED: 'transform:() => { return input.BASE * 2 }',
        },
      } as Warp

      const response = {
        value: 10,
      }

      const { values, results } = await extractCollectResults(warp, response)

      expect(results.BASE).toBe(10)
      expect(results.DOUBLED).toBe(20)
    })

    describe('extractCollectResults with array notation', () => {
      it('returns null for out[N] where N != current', async () => {
        const warp = {
          protocol: 'test',
          name: 'multi-action-test',
          title: 'Multi Action Test',
          description: 'Test multiple actions',
          actions: [{}, {}],
          results: {
            USERS_FROM_ACTION1: 'out[1].users',
            BALANCE_FROM_ACTION2: 'out[2].balance',
            CURRENT_ACTION_DATA: 'out',
          },
        } as any
        const response = { data: 'current-action-data' }
        const { results } = await extractCollectResults(warp, response, 1)
        expect(results.USERS_FROM_ACTION1).toBeNull()
        expect(results.BALANCE_FROM_ACTION2).toBeNull()
        expect(results.CURRENT_ACTION_DATA).toBe('current-action-data')
      })
    })
  })

  describe('resolveWarpResultsRecursively', () => {
    it('properly resolves results with out[N] references', async () => {
      const subject = new WarpActionExecutor(testConfig)
      const httpMock = setupHttpMock()

      // First action returns user info
      httpMock.registerResponse('https://api.example.com/user', {
        id: '12345',
        username: 'testuser',
        email: 'test@example.com',
      })

      // Second action returns posts for this user
      httpMock.registerResponse('https://api.example.com/posts/12345', {
        posts: [
          { id: 1, title: 'First post' },
          { id: 2, title: 'Second post' },
        ],
      })

      // Setup a warp with two collect actions
      const userAction = {
        type: 'collect',
        label: 'Get User',
        destination: {
          url: 'https://api.example.com/user',
        },
      }

      const postsAction = {
        type: 'collect',
        label: 'Get Posts',
        destination: {
          url: 'https://api.example.com/posts/12345',
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

      // Execute the warp from the first action (entry point 1)
      const result = await require('./results').resolveWarpResultsRecursively(warp, 1, subject)

      // All results should be available from a single call
      expect(result.success).toBe(true)
      expect(result.results.USER_ID).toBe('12345')
      expect(result.results.USERNAME).toBe('testuser')
      expect(result.results.POSTS).toEqual([
        { id: 1, title: 'First post' },
        { id: 2, title: 'Second post' },
      ])

      httpMock.cleanup()
    })

    it('executes a warp with dependencies and transforms', async () => {
      const subject = new WarpActionExecutor(testConfig)
      const httpMock = setupHttpMock()

      // First action returns user info
      httpMock.registerResponse('https://api.example.com/user', {
        id: '12345',
        username: 'testuser',
        email: 'test@example.com',
      })

      // Second action returns posts for this user
      httpMock.registerResponse('https://api.example.com/posts/12345', {
        posts: [
          { id: 1, title: 'First post' },
          { id: 2, title: 'Second post' },
        ],
      })

      // Setup a warp with two collect actions
      const userAction = {
        type: 'collect',
        label: 'Get User',
        destination: {
          url: 'https://api.example.com/user',
        },
      }

      const postsAction = {
        type: 'collect',
        label: 'Get Posts',
        destination: {
          url: 'https://api.example.com/posts/12345',
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
          POST_COUNT: 'transform:() => { return input.POSTS ? input.POSTS.length : 0 }',
          USER_WITH_POSTS: 'transform:() => { return { user: input.USERNAME, posts: input.POSTS } }',
        },
      }

      // Execute the warp from the first action (entry point 1)
      const result = await require('./results').resolveWarpResultsRecursively(warp, 1, subject)

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

      httpMock.cleanup()
    })
  })
})

const loadAbiContents = async (path: PathLike): Promise<any> => {
  let jsonContent: string = await fs.readFile(path, { encoding: 'utf8' })
  return JSON.parse(jsonContent)
}
