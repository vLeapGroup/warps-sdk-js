// Mock for @noble/ed25519
export const getPublicKey = jest.fn()
export const sign = jest.fn()
export const verify = jest.fn()
export const utils = {
  randomBytes: jest.fn(),
  randomPrivateKey: jest.fn(),
}
export const Point = jest.fn()
export const CURVE = {}
