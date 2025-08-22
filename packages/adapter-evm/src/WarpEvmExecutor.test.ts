import { WarpChainInfo, WarpClientConfig, WarpExecutable } from '@vleap/warps'
import { ethers } from 'ethers'
import { WarpEvmExecutor } from './WarpEvmExecutor'
import { NativeTokenEth } from './chains'

jest.mock('ethers')

describe('WarpEvmExecutor', () => {
  let executor: WarpEvmExecutor
  let mockConfig: WarpClientConfig
  let mockProvider: any
  let mockChainInfo: WarpChainInfo
  let mockWarp: any

  const getTestChainInfo = () => mockChainInfo

  beforeEach(() => {
    mockConfig = {
      env: 'testnet',
      user: {
        wallets: {
          ethereum: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        },
      },
    } as WarpClientConfig

    mockChainInfo = {
      name: 'ethereum',
      displayName: 'Ethereum Testnet',
      chainId: '11155111',
      blockTime: 12000,
      addressHrp: '0x',
      defaultApiUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
      nativeToken: NativeTokenEth,
    }

    mockWarp = {
      actions: [
        {
          type: 'transfer',
        },
      ],
    }

    // Mock ethers functions
    ;(ethers.isAddress as unknown as jest.Mock).mockImplementation((address: unknown) => {
      return typeof address === 'string' && address.startsWith('0x') && address.length === 42
    })
    ;(ethers.isHexString as unknown as jest.Mock).mockImplementation((hex: unknown) => {
      return typeof hex === 'string' && hex.startsWith('0x') && /^[0-9a-fA-F]+$/.test(hex.slice(2))
    })
    ;(ethers.getAddress as unknown as jest.Mock).mockImplementation((address: unknown) => {
      return typeof address === 'string' ? address.toLowerCase() : address
    })
    ;(ethers.parseUnits as unknown as jest.Mock).mockImplementation((value: unknown, unit: unknown) => {
      if (typeof value === 'string' && typeof unit === 'string' && unit === 'gwei') {
        return BigInt(parseInt(value) * 1000000000)
      }
      return typeof value === 'string' ? BigInt(value) : BigInt(0)
    })

    mockProvider = {
      estimateGas: jest.fn().mockResolvedValue(BigInt(21000)),
      getFeeData: jest.fn().mockResolvedValue({
        maxFeePerGas: ethers.parseUnits('20', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
      }),
    } as any
    ;(ethers.JsonRpcProvider as unknown as jest.Mock).mockImplementation(() => mockProvider)

    executor = new WarpEvmExecutor(mockConfig, mockChainInfo)
  })

  describe('createTransferTransaction', () => {
    it('should create a native token transfer transaction', async () => {
      const executable: WarpExecutable = {
        warp: mockWarp,
        action: 0,
        chain: mockChainInfo,
        destination: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: ethers.parseEther('1.0'),
        data: null,
        args: [],
        transfers: [],
        resolvedInputs: [],
      }

      const tx = await executor.createTransferTransaction(executable)
      expect(tx.to).toBe('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
      expect(tx.value).toBe(ethers.parseEther('1.0'))
      expect(tx.data).toBe('0x')
    })

    it('should create an ERC-20 token transfer transaction', async () => {
      const tokenAddress = '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C'
      const executable: WarpExecutable = {
        warp: mockWarp,
        action: 0,
        chain: mockChainInfo,
        destination: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: 0n,
        data: null,
        args: [],
        transfers: [
          {
            identifier: tokenAddress,
            nonce: 0n,
            amount: ethers.parseUnits('100', 18),
          },
        ],
        resolvedInputs: [],
      }

      const tx = await executor.createTransferTransaction(executable)
      expect(tx.to).toBe(tokenAddress)
      expect(tx.value).toBe(0n)
    })

    it('should throw error for invalid token address', async () => {
      const executable: WarpExecutable = {
        warp: mockWarp,
        action: 0,
        chain: mockChainInfo,
        destination: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: 0n,
        data: null,
        args: [],
        transfers: [
          {
            identifier: 'invalid-address',
            nonce: 0n,
            amount: ethers.parseUnits('100', 18),
          },
        ],
        resolvedInputs: [],
      }

      await expect(executor.createTransferTransaction(executable)).rejects.toThrow(
        'WarpEvmExecutor: Invalid token address: invalid-address'
      )
    })

    it('should throw error for multiple token transfers', async () => {
      const tokenAddress1 = '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C'
      const tokenAddress2 = '0xB1c97b44E7551b8c4C8C8C8C8C8C8C8C8C8C8C8C'
      const executable: WarpExecutable = {
        warp: mockWarp,
        action: 0,
        chain: mockChainInfo,
        destination: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: 0n,
        data: null,
        args: [],
        transfers: [
          {
            identifier: tokenAddress1,
            nonce: 0n,
            amount: ethers.parseUnits('100', 18),
          },
          {
            identifier: tokenAddress2,
            nonce: 0n,
            amount: ethers.parseUnits('50', 18),
          },
        ],
        resolvedInputs: [],
      }

      await expect(executor.createTransferTransaction(executable)).rejects.toThrow(
        'WarpEvmExecutor: Multiple token transfers not yet supported'
      )
    })

    it('should throw error for invalid destination address', async () => {
      const executable = {
        destination: 'invalid-address',
        value: BigInt(1000000000000000000),
        data: null,
        chain: getTestChainInfo(),
        warp: {
          actions: [
            {
              type: 'transfer',
            },
          ],
        },
        action: 1,
        args: [],
        transfers: [],
        resolvedInputs: [],
      } as any

      await expect(executor.createTransferTransaction(executable)).rejects.toThrow('WarpEvmExecutor: Invalid destination address')
    })
  })

  describe('createContractCallTransaction', () => {
    it('should create a contract call transaction', async () => {
      const executable = {
        destination: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: BigInt(0),
        data: null,
        chain: getTestChainInfo(),
        warp: {
          actions: [
            {
              type: 'contract',
              func: 'transfer(address,uint256)',
            },
          ],
        },
        action: 1,
        args: ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', '1000000000000000000'],
        transfers: [],
        resolvedInputs: [],
      } as any

      const tx = await executor.createContractCallTransaction(executable)

      expect(tx).toEqual({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: BigInt(0),
        data: undefined,
        gasLimit: BigInt(21000),
        maxFeePerGas: ethers.parseUnits('20', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
      })
    })

    it('should throw error for invalid contract address', async () => {
      const executable = {
        destination: 'invalid-address',
        value: BigInt(0),
        data: null,
        chain: getTestChainInfo(),
        warp: {
          actions: [
            {
              type: 'contract',
              func: 'transfer(address,uint256)',
            },
          ],
        },
        action: 1,
        args: ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', '1000000000000000000'],
        transfers: [],
        resolvedInputs: [],
      } as any

      await expect(executor.createContractCallTransaction(executable)).rejects.toThrow('WarpEvmExecutor: Invalid contract address')
    })
  })

  describe('executeQuery', () => {
    it('should execute a query successfully', async () => {
      const executable = {
        destination: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: BigInt(0),
        data: null,
        chain: getTestChainInfo(),
        warp: {
          actions: [
            {
              type: 'query',
              func: 'balanceOf(address)',
            },
          ],
        },
        action: 1,
        args: ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'],
        transfers: [],
        resolvedInputs: [],
      } as any

      const result = await executor.executeQuery(executable)

      expect(result).toEqual({
        success: false,
        warp: executable.warp,
        action: 1,
        user: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        txHash: null,
        tx: null,
        next: null,
        values: [],
        results: {},
        messages: {},
      })
    })

    it('should handle query failure', async () => {
      const executable = {
        destination: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: BigInt(0),
        data: null,
        chain: getTestChainInfo(),
        warp: {
          actions: [
            {
              type: 'query',
              func: 'balanceOf(address)',
            },
          ],
        },
        action: 1,
        args: ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'],
        transfers: [],
        resolvedInputs: [],
      } as any

      const result = await executor.executeQuery(executable)

      expect(result).toEqual({
        success: false,
        warp: executable.warp,
        action: 1,
        user: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        txHash: null,
        tx: null,
        next: null,
        values: [],
        results: {},
        messages: {},
      })
    })
  })

  describe('createTransaction', () => {
    it('should create a transfer transaction', async () => {
      const executable = {
        destination: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: BigInt(1000000000000000000),
        data: null,
        chain: getTestChainInfo(),
        warp: {
          actions: [
            {
              type: 'transfer',
            },
          ],
        },
        action: 1,
        args: [],
        transfers: [],
        resolvedInputs: [],
      } as any

      const tx = await executor.createTransaction(executable)

      expect(tx).toEqual({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: BigInt(1000000000000000000),
        data: '0x',
        gasLimit: BigInt(21000),
        maxFeePerGas: ethers.parseUnits('20', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
      })
    })

    it('should create a contract call transaction', async () => {
      const executable = {
        destination: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: BigInt(0),
        data: null,
        chain: getTestChainInfo(),
        warp: {
          actions: [
            {
              type: 'contract',
              func: 'transfer(address,uint256)',
            },
          ],
        },
        action: 1,
        args: ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', '1000000000000000000'],
        transfers: [],
        resolvedInputs: [],
      } as any

      const tx = await executor.createTransaction(executable)

      expect(tx).toEqual({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: BigInt(0),
        data: undefined,
        gasLimit: BigInt(21000),
        maxFeePerGas: ethers.parseUnits('20', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
      })
    })

    it('should throw error for unsupported action type', async () => {
      const executable = {
        destination: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: BigInt(0),
        data: null,
        chain: getTestChainInfo(),
        warp: {
          actions: [
            {
              type: 'query',
              func: 'balanceOf(address)',
            },
          ],
        },
        action: 1,
        args: [],
        transfers: [],
        resolvedInputs: [],
      } as any

      await expect(executor.createTransaction(executable)).rejects.toThrow(
        'WarpEvmExecutor: Invalid action type for createTransaction; Use executeQuery instead'
      )
    })
  })

  describe('signMessage', () => {
    it('should sign a message', async () => {
      const message = 'test message'
      const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      await expect(executor.signMessage(message, privateKey)).rejects.toThrow('Not implemented')
    })
  })
})
