import { WarpChainInfo, WarpClientConfig, WarpExecutable, WarpTransferAction, WarpContractAction, WarpChainName } from '@vleap/warps'
import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js'
import { WarpSolanaExecutor } from './WarpSolanaExecutor'
import { WarpSolanaWallet } from './WarpSolanaWallet'
import { WarpSolanaDataLoader } from './WarpSolanaDataLoader'
import { NativeTokenSol } from './chains/solana'

jest.unmock('@scure/bip39')

describe('WarpSolanaIntegration', () => {
  const privateKey = '5ChhuwWoBzvXFsaCBuz9woTzb7tXgV5oALFBQ9LABRbnjb9fzioHsoak1qA8SKEkDzZyqtc4cNsxdcK8gzc5iLUt'
  const testAddress = '5KJvsngHeMoo424rH3Y1bVhjKM2f7jNsN1Tsp9i6F9XHj8qJ7vK' // This will be derived from wallet
  const receiverAddress = '11111111111111111111111111111111' // System Program (valid Solana address)

  let mockConnection: any
  let mockConfig: WarpClientConfig

  const createMockConnection = () => ({
    getLatestBlockhash: jest.fn().mockResolvedValue({
      blockhash: 'test-blockhash',
      lastValidBlockHeight: 100,
    }),
    sendRawTransaction: jest.fn().mockResolvedValue('test-signature'),
    getTransaction: jest.fn().mockResolvedValue(null),
    confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    getAccountInfo: jest.fn().mockResolvedValue(null),
    getBalance: jest.fn().mockResolvedValue(1000000000),
  })

  beforeEach(() => {
    mockConnection = createMockConnection()
    jest.spyOn(Connection.prototype, 'getLatestBlockhash').mockImplementation(mockConnection.getLatestBlockhash)
    jest.spyOn(Connection.prototype, 'sendRawTransaction').mockImplementation(mockConnection.sendRawTransaction)
    jest.spyOn(Connection.prototype, 'getTransaction').mockImplementation(mockConnection.getTransaction)
    jest.spyOn(Connection.prototype, 'confirmTransaction').mockImplementation(mockConnection.confirmTransaction)
    jest.spyOn(Connection.prototype, 'getAccountInfo').mockImplementation(mockConnection.getAccountInfo)
    jest.spyOn(Connection.prototype, 'getBalance').mockImplementation(mockConnection.getBalance)

    mockConfig = {
      env: 'devnet',
      user: {
        wallets: {
          solana: {
            provider: 'privateKey',
            address: testAddress,
            privateKey,
          },
        },
      },
    } as WarpClientConfig
  })

  describe('Devnet (Solana)', () => {
    let chainInfo: WarpChainInfo
    let executor: WarpSolanaExecutor
    let wallet: WarpSolanaWallet
    let dataLoader: WarpSolanaDataLoader

    beforeEach(() => {
      chainInfo = {
        name: WarpChainName.Solana,
        displayName: 'Solana Devnet',
        chainId: '103',
        blockTime: 400,
        addressHrp: '',
        defaultApiUrl: 'https://api.devnet.solana.com',
        logoUrl: {
          light: 'https://joai.ai/images/chains/solana-white.svg',
          dark: 'https://joai.ai/images/chains/solana-black.svg',
        },
        nativeToken: NativeTokenSol,
      }
      executor = new WarpSolanaExecutor(mockConfig, chainInfo)
      wallet = new WarpSolanaWallet(mockConfig, chainInfo)
      dataLoader = new WarpSolanaDataLoader(mockConfig, chainInfo)
    })

    describe('Native SOL Transfers', () => {
      it('should create native SOL transfer transaction', async () => {
        const userAddress = wallet.getAddress()
        if (!userAddress) {
          throw new Error('Wallet address not available')
        }

        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'transfer',
                label: 'Transfer SOL',
              } as WarpTransferAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: receiverAddress,
          value: 1000000000n,
          data: null,
          args: [],
          transfers: [],
          resolvedInputs: [],
        }

        const tx = await executor.createTransaction(executable)
        expect(tx).toBeDefined()
        expect(tx instanceof VersionedTransaction).toBe(true)
      })

      it('should sign and send native SOL transfer', async () => {
        const userAddress = wallet.getAddress()
        if (!userAddress) {
          throw new Error('Wallet address not available')
        }

        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'transfer',
                label: 'Transfer SOL',
              } as WarpTransferAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: receiverAddress,
          value: 1000000000n,
          data: null,
          args: [],
          transfers: [],
          resolvedInputs: [],
        }

        const tx = await executor.createTransaction(executable)
        const signedTx = await wallet.signTransaction(tx)
        const signature = await wallet.sendTransaction(signedTx)
        expect(signature).toBeDefined()
        expect(typeof signature).toBe('string')
      })
    })

    describe('Contract Calls', () => {
      it('should create contract call transaction', async () => {
        const userAddress = wallet.getAddress()
        if (!userAddress) {
          throw new Error('Wallet address not available')
        }

        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'contract',
                label: 'Call Program',
                func: 'invoke',
                abi: '{}',
              } as WarpContractAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: receiverAddress,
          value: 0n,
          data: null,
          args: [],
          transfers: [],
          resolvedInputs: [],
        }

        const tx = await executor.createTransaction(executable)
        expect(tx).toBeDefined()
        expect(tx instanceof VersionedTransaction).toBe(true)
      })

      it('should create contract call with accounts', async () => {
        const userAddress = wallet.getAddress()
        if (!userAddress) {
          throw new Error('Wallet address not available')
        }

        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'contract',
                label: 'Call Program',
                func: 'deposit_sol',
                abi: JSON.stringify({
                  instructions: {
                    deposit_sol: {
                      discriminator: [3, 0, 0, 0, 0, 0, 0, 0],
                      args: [{ name: 'lamports', type: 'u64' }],
                    },
                  },
                }),
                accounts: [
                  { address: 'Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb', writable: true, signer: false },
                  { address: '{{USER_WALLET}}', writable: true, signer: true },
                ],
              } as WarpContractAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: 'SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy',
          value: 0n,
          data: null,
          args: ['biguint:100000000'],
          transfers: [],
          resolvedInputs: [],
        }

        const tx = await executor.createTransaction(executable)
        expect(tx).toBeDefined()
        expect(tx instanceof VersionedTransaction).toBe(true)
      })

      it('should sign and send contract call', async () => {
        const userAddress = wallet.getAddress()
        if (!userAddress) {
          throw new Error('Wallet address not available')
        }

        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'contract',
                label: 'Call Program',
                func: 'invoke',
                abi: '{}',
              } as WarpContractAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: receiverAddress,
          value: 0n,
          data: null,
          args: [],
          transfers: [],
          resolvedInputs: [],
        }

        const tx = await executor.createTransaction(executable)
        const signedTx = await wallet.signTransaction(tx)
        const signature = await wallet.sendTransaction(signedTx)
        expect(signature).toBeDefined()
        expect(typeof signature).toBe('string')
      })
    })

    describe('Transaction Verification', () => {
      it('should verify successful transaction', async () => {
        const mockTx = {
          slot: 12345,
          blockTime: Math.floor(Date.now() / 1000),
          transaction: {
            message: {
              staticAccountKeys: [PublicKey.default, PublicKey.default],
            },
          },
          meta: {
            err: null,
            preBalances: [1000000000, 0],
            postBalances: [999000000, 1000000],
          },
        }

        mockConnection.getTransaction.mockResolvedValue(mockTx)

        const action = await dataLoader.getAction('test-signature', true)
        expect(action).toBeDefined()
        if (action) {
          expect(action.status).toBe('success')
          expect(action.sender).toBeDefined()
        }
      })

      it('should verify failed transaction', async () => {
        const mockTx = {
          slot: 12345,
          blockTime: Math.floor(Date.now() / 1000),
          transaction: {
            message: {
              staticAccountKeys: [PublicKey.default, PublicKey.default],
            },
          },
          meta: {
            err: { InstructionError: [0, 'Custom', 1] },
            preBalances: [1000000000, 0],
            postBalances: [1000000000, 0],
          },
        }

        mockConnection.getTransaction.mockResolvedValue(mockTx)

        const action = await dataLoader.getAction('test-signature', true)
        expect(action).toBeDefined()
        if (action) {
          expect(action.status).toBe('failed')
          expect(action.error).toBeDefined()
        }
      })
    })
  })
})
