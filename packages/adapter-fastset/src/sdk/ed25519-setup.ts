import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha512'

// Configure ed25519 library exactly like the official wallet
ed.hashes.sha512 = sha512

export { ed }
