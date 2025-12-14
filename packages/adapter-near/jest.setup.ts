import { Buffer } from 'buffer'
import fetchMock from 'jest-fetch-mock'
import { TextDecoder, TextEncoder } from 'util'

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder as any
}
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer
}

jest.mock('near-api-js', () => {
  const actual = jest.requireActual('near-api-js')
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue({
      account: jest.fn().mockResolvedValue({
        getAccountBalance: jest.fn().mockResolvedValue('0'),
        viewFunction: jest.fn().mockResolvedValue(null),
        functionCall: jest.fn().mockResolvedValue({ transaction: { hash: 'test-hash' } }),
        sendMoney: jest.fn().mockResolvedValue({ transaction: { hash: 'test-hash' } }),
      }),
      connection: {
        provider: {
          sendTransaction: jest.fn().mockResolvedValue({ transaction: { hash: 'test-hash' } }),
          txStatus: jest.fn().mockResolvedValue({ status: { SuccessValue: '' } }),
        },
      },
    }),
    keyStores: {
      InMemoryKeyStore: jest.fn().mockImplementation(() => ({
        setKey: jest.fn(),
        getKey: jest.fn(),
      })),
    },
    KeyPair: {
      fromString: jest.fn(),
    },
    utils: {
      format: {
        parseNearAmount: jest.fn((amount) => amount),
        formatNearAmount: jest.fn((amount) => amount),
      },
    },
  }
})

fetchMock.enableMocks()
