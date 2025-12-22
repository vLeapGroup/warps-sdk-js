import * as ed25519 from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha2.js'

// Configure ed25519 library exactly like the official wallet
ed25519.hashes.sha512 = sha512

export const ed = ed25519 as typeof ed25519 & {
  sign: typeof ed25519.sign
  signAsync: typeof ed25519.signAsync
  getPublicKey: typeof ed25519.getPublicKey
  getPublicKeyAsync: typeof ed25519.getPublicKeyAsync
  utils: typeof ed25519.utils
  hashes: typeof ed25519.hashes
}
