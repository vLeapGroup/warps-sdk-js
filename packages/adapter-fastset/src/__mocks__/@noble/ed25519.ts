// Mock for @noble/ed25519
export const getPublicKey = jest.fn((privateKey) => new Uint8Array(32)) // Return 32-byte public key
export const sign = jest.fn((message, privateKey) => new Uint8Array(64)) // Return 64-byte signature
export const verify = jest.fn(() => true)
export const utils = {
  randomBytes: jest.fn(() => new Uint8Array(32)),
  randomPrivateKey: jest.fn(() => new Uint8Array(32)),
}
export const Point = jest.fn()
export const CURVE = {}
export const etc = {
  bytesToHex: jest.fn(),
  hexToBytes: jest.fn(),
  concatBytes: jest.fn(),
  randomBytes: jest.fn(),
}
export const hashes = {
  sha512: jest.fn(),
  sha512Async: jest.fn(),
}

// Mock the default export as well
export default {
  getPublicKey,
  sign,
  verify,
  utils,
  Point,
  CURVE,
  etc,
  hashes,
}
