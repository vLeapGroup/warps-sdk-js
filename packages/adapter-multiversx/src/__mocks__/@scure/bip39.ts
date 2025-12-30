// Mock for @scure/bip39
export const mnemonicToSeedSync = jest.fn(() => new Uint8Array(64)) // Return 64-byte seed
export const validateMnemonic = jest.fn(() => true)
export const generateMnemonic = jest.fn((wordlist, strength) => {
  // Return a 24-word mnemonic when strength is 256
  if (strength === 256) {
    return 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'
  }
  return 'test mnemonic'
})
export const entropyToMnemonic = jest.fn(() => 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')

// Mock the default export as well
export default {
  mnemonicToSeedSync,
  validateMnemonic,
  generateMnemonic,
  entropyToMnemonic,
}
