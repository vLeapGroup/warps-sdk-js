import { Buffer } from 'buffer'
import { TextEncoder, TextDecoder } from 'util'

export default async () => {
  global.Buffer = Buffer
  global.TextEncoder = TextEncoder
  global.TextDecoder = TextDecoder as any
}
