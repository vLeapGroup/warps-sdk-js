// TODO: Implement SUI-specific codec utilities as needed

import { bcs } from '@mysten/sui/bcs'

export function encodeString(value: string): Uint8Array {
  return bcs.string().serialize(value).toBytes()
}

export function decodeString(bytes: Uint8Array): string {
  return bcs.string().parse(bytes)
}

export {}
