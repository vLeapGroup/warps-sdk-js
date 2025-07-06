import { createMockAdapter } from '../test-utils/mockAdapter'
import { setupHttpMock } from '../test-utils/mockHttp'
import { Warp, WarpInitConfig } from '../types'
import { WarpActionExecutor } from '../WarpActionExecutor'
import { extractCollectResults } from './results'

const testConfig: WarpInitConfig = {
  env: 'devnet',
  user: {
    wallet: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
  },
  currentUrl: 'https://example.com',
}

describe('Result Helpers', () => {
  describe('input-based results', () => {
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

      const { values, results } = await extractCollectResults(warp, response, 1, [])

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

      const { values, results } = await extractCollectResults(warp, response, 1, [])

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

      const { values, results } = await extractCollectResults(warp, response, 1, [])

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
          DOUBLED: 'transform:() => { return result.BASE * 2 }',
        },
      } as Warp

      const response = {
        value: 10,
      }

      const { values, results } = await extractCollectResults(warp, response, 1, [])

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
        const { results } = await extractCollectResults(warp, response, 1, [])
        expect(results.USERS_FROM_ACTION1).toBeNull()
        expect(results.BALANCE_FROM_ACTION2).toBeNull()
        expect(results.CURRENT_ACTION_DATA).toBe('current-action-data')
      })
    })
  })

  describe('resolveWarpResultsRecursively', () => {
    it('properly resolves results with out[N] references', async () => {
      const subject = new WarpActionExecutor(createMockAdapter(testConfig))
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
      const subject = new WarpActionExecutor(createMockAdapter(testConfig))
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
          POST_COUNT: 'transform:() => { return result.POSTS ? result.POSTS.length : 0 }',
          USER_WITH_POSTS: 'transform:() => { return { user: result.USERNAME, posts: result.POSTS } }',
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
