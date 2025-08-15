import { WarpTransferAction } from '@vleap/warps'
import { WarpFastsetBuilder } from './WarpFastsetBuilder'

// Mock fetch globally
global.fetch = jest.fn()

describe('WarpFastsetBuilder', () => {
  let builder: WarpFastsetBuilder
  let mockConfig: any

  beforeEach(() => {
    mockConfig = {
      env: 'testnet',
      user: {
        wallets: {
          fastset: 'fs1testaddress123456789',
        },
      },
    }
    builder = new WarpFastsetBuilder(mockConfig)
    ;(fetch as jest.Mock).mockClear()
  })

  describe('createFromRaw', () => {
    it('should create warp from raw JSON data', async () => {
      const rawData = JSON.stringify({
        title: 'Test Warp',
        description: 'A test warp',
        actions: [
          {
            type: 'transfer',
            label: 'Send PI',
          },
        ],
      })

      const warp = await builder.createFromRaw(rawData)

      expect(warp.title).toBe('Test Warp')
      expect(warp.description).toBe('A test warp')
      expect(warp.actions).toHaveLength(1)
      expect(warp.actions[0].type).toBe('transfer')
    })

    it('should throw error for invalid JSON', async () => {
      const invalidData = 'invalid json'

      await expect(builder.createFromRaw(invalidData)).rejects.toThrow('Failed to parse Fastset warp data')
    })
  })

  describe('setTitle', () => {
    it('should set warp title', () => {
      const result = builder.setTitle('New Title')
      expect(result).toBe(builder)
    })
  })

  describe('setDescription', () => {
    it('should set warp description', () => {
      const result = builder.setDescription('New Description')
      expect(result).toBe(builder)
    })
  })

  describe('setPreview', () => {
    it('should set warp preview', () => {
      const result = builder.setPreview('preview-url')
      expect(result).toBe(builder)
    })
  })

  describe('setActions', () => {
    it('should set warp actions', () => {
      const actions: WarpTransferAction[] = [
        {
          type: 'transfer',
          label: 'Send PI',
        },
      ]
      const result = builder.setActions(actions)
      expect(result).toBe(builder)
    })
  })

  describe('addAction', () => {
    it('should add action to warp', () => {
      const action: WarpTransferAction = {
        type: 'transfer',
        label: 'Send PI',
      }
      const result = builder.addAction(action)
      expect(result).toBe(builder)
    })
  })

  describe('build', () => {
    it('should build complete warp', async () => {
      builder.setTitle('Test Warp').setDescription('A test warp').setPreview('preview-url').addAction({
        type: 'transfer',
        label: 'Send FS',
      })

      const warp = await builder.build()

      expect(warp).toEqual({
        protocol: 'warp',
        name: 'fastset-warp',
        title: 'Test Warp',
        description: 'A test warp',
        preview: 'preview-url',
        actions: [
          {
            type: 'transfer',
            label: 'Send FS',
          },
        ],
        meta: {
          chain: 'fastset',
          hash: expect.any(String),
          creator: 'fs1testaddress123456789',
          createdAt: expect.any(String),
        },
      })
    })

    it('should build warp with default values', async () => {
      const warp = await builder.build()

      expect(warp).toEqual({
        protocol: 'warp',
        name: 'fastset-warp',
        title: '',
        description: null,
        preview: null,
        actions: [],
        meta: {
          chain: 'fastset',
          hash: expect.any(String),
          creator: 'fs1testaddress123456789',
          createdAt: expect.any(String),
        },
      })
    })
  })

  describe('createInscriptionTransaction', () => {
    it('should create inscription transaction', () => {
      const warp = {
        protocol: 'warp',
        name: 'test-warp',
        title: 'Test Warp',
        actions: [],
        meta: {},
      } as any

      const tx = builder.createInscriptionTransaction(warp)

      expect(tx).toEqual({
        type: 'fastset-inscription',
        data: JSON.stringify(warp),
      })
    })
  })

  describe('createFromTransaction', () => {
    it('should create warp from transaction with data', async () => {
      const tx = {
        data: JSON.stringify({
          title: 'Test Warp',
          description: 'A test warp',
          actions: [
            {
              type: 'transfer',
              label: 'Send FS',
            },
          ],
        }),
      }

      const warp = await builder.createFromTransaction(tx)

      expect(warp.title).toBe('Test Warp')
      expect(warp.description).toBe('A test warp')
      expect(warp.actions).toHaveLength(1)
    })

    it('should create warp from transaction with payload', async () => {
      const tx = {
        payload: JSON.stringify({
          title: 'Test Warp',
          description: 'A test warp',
          actions: [],
        }),
      }

      const warp = await builder.createFromTransaction(tx)

      expect(warp.title).toBe('Test Warp')
      expect(warp.description).toBe('A test warp')
    })

    it('should create warp from transaction with content', async () => {
      const tx = {
        content: JSON.stringify({
          title: 'Test Warp',
          description: 'A test warp',
          actions: [],
        }),
      }

      const warp = await builder.createFromTransaction(tx)

      expect(warp.title).toBe('Test Warp')
      expect(warp.description).toBe('A test warp')
    })

    it('should throw error when no warp data found', async () => {
      const tx = {}

      await expect(builder.createFromTransaction(tx)).rejects.toThrow('No warp data found in transaction')
    })

    it('should throw error for invalid JSON in transaction', async () => {
      const tx = {
        data: 'invalid json',
      }

      await expect(builder.createFromTransaction(tx)).rejects.toThrow('Failed to create warp from Fastset transaction')
    })

    it('should skip validation when validate is false', async () => {
      const tx = {
        data: JSON.stringify({
          title: 'Test Warp',
          // Missing required fields
        }),
      }

      const warp = await builder.createFromTransaction(tx, false)

      expect(warp.title).toBe('Test Warp')
    })
  })

  describe('createFromTransactionHash', () => {
    it('should create warp from transaction hash', async () => {
      const mockTx = {
        data: JSON.stringify({
          title: 'Test Warp',
          description: 'A test warp',
          actions: [],
        }),
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTx),
      })

      const warp = await builder.createFromTransactionHash('test-hash')

      expect(warp).toBeDefined()
      expect(warp?.title).toBe('Test Warp')
      expect(fetch).toHaveBeenCalledWith('https://api.fastset.xyz/transaction/test-hash')
    })

    it('should return null when transaction not found', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

      const warp = await builder.createFromTransactionHash('test-hash')

      expect(warp).toBeNull()
    })

    it('should handle fetch errors gracefully', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const warp = await builder.createFromTransactionHash('test-hash')

      expect(warp).toBeNull()
    })
  })
})
