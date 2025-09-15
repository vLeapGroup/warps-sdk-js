import fetchMock from 'jest-fetch-mock'
import { TextDecoder, TextEncoder } from 'util'

// Polyfill TextEncoder and TextDecoder for Node.js test environment
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder
}

fetchMock.enableMocks()
