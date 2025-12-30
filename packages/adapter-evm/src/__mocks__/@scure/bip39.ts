// Mock for @scure/bip39 - use real implementation
const realBip39 = jest.requireActual('@scure/bip39')

export const mnemonicToSeedSync = jest.fn((mnemonic) => {
  return realBip39.mnemonicToSeedSync(mnemonic)
})

export const validateMnemonic = jest.fn((mnemonic, wordlist) => {
  return realBip39.validateMnemonic(mnemonic, wordlist)
})

export const generateMnemonic = jest.fn((wordlist, strength) => {
  return realBip39.generateMnemonic(wordlist, strength)
})

export const entropyToMnemonic = jest.fn(() => 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')

// Mock the default export as well
export default {
  mnemonicToSeedSync,
  validateMnemonic,
  generateMnemonic,
  entropyToMnemonic,
}
