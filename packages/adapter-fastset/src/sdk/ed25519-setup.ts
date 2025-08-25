import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha512'

// Configure ed25519 library exactly like the official wallet
if (ed.etc) {
  // @ts-ignore
  ed.etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed.etc.concatBytes(...m))
}

export { ed }
