// Cross-environment utilities using the Buffer polyfill
export const encoder = new TextEncoder()
export const decoder = new TextDecoder()

// Clean helper functions using Buffer
export function uint8ArrayToHex(uint8Array: Uint8Array): string {
  return Buffer.from(uint8Array).toString('hex')
}

export function hexToUint8Array(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'))
}

export function uint8ArrayToString(uint8Array: Uint8Array): string {
  return Buffer.from(uint8Array).toString('utf8')
}

export function stringToUint8Array(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, 'utf8'))
}
