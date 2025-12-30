// Mock for @scure/bip39 - use real implementation
const realBip39 = jest.requireActual('@scure/bip39')

export const mnemonicToSeedSync = jest.fn((mnemonic) => {
  const result = realBip39.mnemonicToSeedSync(mnemonic)
  if (result instanceof Uint8Array && !Buffer.isBuffer(result)) {
    return result
  }
  if (Buffer.isBuffer(result)) {
    return Uint8Array.from(result)
  }
  return new Uint8Array(result)
})

export const validateMnemonic = jest.fn((mnemonic, wordlist) => {
  return realBip39.validateMnemonic(mnemonic, wordlist)
})

export const generateMnemonic = jest.fn((wordlist: any, strength: number) => {
  const result = realBip39.generateMnemonic(wordlist, strength)
  if (typeof result === 'string') {
    return result
  }
  if (Buffer.isBuffer(result)) {
    return Buffer.from(result).toString('utf8')
  }
  return String(result)
})

export const entropyToMnemonic = jest.fn(() => 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')

// Mock the default export as well
export default {
  mnemonicToSeedSync,
  validateMnemonic,
  generateMnemonic,
  entropyToMnemonic,
}
