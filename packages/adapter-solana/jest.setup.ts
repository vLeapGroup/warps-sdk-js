import fetchMock from 'jest-fetch-mock'
import { TextEncoder, TextDecoder } from 'util'
import { Buffer } from 'buffer'

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder as any
}
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer
}

jest.mock('@solana/web3.js', () => {
  const actual = jest.requireActual('@solana/web3.js')
  return {
    ...actual,
    Connection: jest.fn().mockImplementation(() => ({
      getBalance: jest.fn().mockResolvedValue(0),
      getAccountInfo: jest.fn().mockResolvedValue(null),
      getParsedTokenAccountsByOwner: jest.fn().mockResolvedValue({ value: [] }),
      getLatestBlockhash: jest.fn().mockResolvedValue({ blockhash: 'test', lastValidBlockHeight: 0 }),
      sendRawTransaction: jest.fn().mockResolvedValue('test-signature'),
      getTransaction: jest.fn().mockResolvedValue(null),
      getSignatureStatus: jest.fn().mockResolvedValue({ value: null }),
    })),
    PublicKey: jest.fn().mockImplementation((key) => {
      const actualPublicKey = actual.PublicKey
      if (typeof key === 'string') {
        if (key === 'invalid-address' || key.length < 32 || key.length > 44 || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(key)) {
          throw new Error('Invalid public key input')
        }
      }
      try {
        return new actualPublicKey(key)
      } catch (error) {
        throw error
      }
    }),
    Transaction: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      sign: jest.fn(),
      serialize: jest.fn().mockReturnValue(Buffer.from('test')),
      recentBlockhash: '',
      feePayer: null,
    })),
    SystemProgram: {
      transfer: jest.fn().mockReturnValue({}),
    },
    ComputeBudgetProgram: {
      setComputeUnitLimit: jest.fn().mockReturnValue({}),
      setComputeUnitPrice: jest.fn().mockReturnValue({}),
    },
  }
})

jest.mock('@solana/spl-token', () => ({
  getMint: jest.fn().mockResolvedValue({ decimals: 9 }),
  getAccount: jest.fn().mockResolvedValue(null),
  getAssociatedTokenAddress: jest.fn().mockResolvedValue({ toBase58: () => 'test' }),
  createTransferInstruction: jest.fn().mockReturnValue({}),
  createAssociatedTokenAccountInstruction: jest.fn().mockReturnValue({}),
}))

fetchMock.enableMocks()
