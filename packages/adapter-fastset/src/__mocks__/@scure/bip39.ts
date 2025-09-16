// Mock for @scure/bip39
export const mnemonicToSeedSync = jest.fn(() => new Uint8Array(64)) // Return 64-byte seed
export const validateMnemonic = jest.fn(() => true)
export const generateMnemonic = jest.fn(() => 'test mnemonic')

// Mock the default export as well
export default {
  mnemonicToSeedSync,
  validateMnemonic,
  generateMnemonic,
}
