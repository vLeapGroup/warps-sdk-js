import { WarpClientConfig } from '@vleap/warps'
import { ethers } from 'ethers'
import { WarpEvmExecutor } from './WarpEvmExecutor'

jest.mock('ethers')

describe('WarpEvmExecutor', () => {
  let executor: WarpEvmExecutor
  let mockConfig: WarpClientConfig
  let mockProvider: any

  beforeEach(() => {
    mockConfig = {
      env: 'testnet',
      user: {
        wallets: {
          evm: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        },
      },
    } as WarpClientConfig

    // Mock ethers functions
    ;(ethers.isAddress as unknown as jest.Mock).mockImplementation((address: string) => {
      return address.startsWith('0x') && address.length === 42
    })
    ;(ethers.isHexString as unknown as jest.Mock).mockImplementation((hex: string) => {
      return hex.startsWith('0x') && /^[0-9a-fA-F]+$/.test(hex.slice(2))
    })
    ;(ethers.getAddress as unknown as jest.Mock).mockImplementation((address: string) => {
      return address.toLowerCase()
    })
    ;(ethers.parseUnits as unknown as jest.Mock).mockImplementation((value: string, unit: string) => {
      if (unit === 'gwei') {
        return BigInt(parseInt(value) * 1000000000)
      }
      return BigInt(value)
    })

    mockProvider = {
      estimateGas: jest.fn().mockResolvedValue(BigInt(21000)),
      getFeeData: jest.fn().mockResolvedValue({
        maxFeePerGas: ethers.parseUnits('20', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
      }),
    }
    ;(ethers.JsonRpcProvider as unknown as jest.Mock).mockImplementation(() => mockProvider)

    executor = new WarpEvmExecutor(mockConfig)
  })

  describe('preprocessInput', () => {
    it('should validate and format addresses', async () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
      const result = await executor.preprocessInput({} as any, 'address', 'address', address)
      expect(result).toBe(ethers.getAddress(address))
    })

    it('should validate and format hex strings', async () => {
      const hex = '0x1234567890abcdef'
      const result = await executor.preprocessInput({} as any, 'hex', 'hex', hex)
      expect(result).toBe(hex)
    })

    it('should validate and format bigint values', async () => {
      const result = await executor.preprocessInput({} as any, 'biguint', 'biguint', '123456789')
      expect(result).toBe('123456789')
    })

    it('should throw error for invalid addresses', async () => {
      await expect(executor.preprocessInput({} as any, 'address', 'address', 'invalid-address')).rejects.toThrow('Invalid address format')
    })

    it('should throw error for invalid hex strings', async () => {
      await expect(executor.preprocessInput({} as any, 'hex', 'hex', 'invalid-hex')).rejects.toThrow('Invalid hex format')
    })

    it('should throw error for negative bigint values', async () => {
      await expect(executor.preprocessInput({} as any, 'biguint', 'biguint', '-123')).rejects.toThrow('Negative value not allowed')
    })
  })

  describe('createTransferTransaction', () => {
    it('should create a transfer transaction', async () => {
      const executable = {
        destination: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: BigInt(1000000000000000000), // 1 ETH
        data: null,
        chain: { name: 'evm' },
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

      const result = await executor.createTransferTransaction(executable)

      expect(result.to).toBe(executable.destination)
      expect(result.value).toBe(executable.value)
      expect(result.data).toBe('0x')
    })
  })

  describe('createContractCallTransaction', () => {
    it('should create a contract call transaction', async () => {
      const executable = {
        destination: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: BigInt(0),
        data: null,
        chain: { name: 'evm' },
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

      ;(ethers.Interface as unknown as jest.Mock).mockImplementation(() => ({
        encodeFunctionData: jest.fn().mockReturnValue('0x1234567890abcdef'),
      }))

      const result = await executor.createContractCallTransaction(executable)

      expect(result.to).toBe(executable.destination)
      expect(result.value).toBe(executable.value)
      expect(result.data).toBe('0x1234567890abcdef')
    })
  })
})
