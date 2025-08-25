import { sign } from '@noble/ed25519'
import { BcsTransaction } from './types'

export class TransactionSigner {
  static async signTransaction(transaction: any, privateKey: Uint8Array): Promise<Uint8Array> {
    const msg = BcsTransaction.serialize(transaction)
    const msgBytes = msg.toBytes()

    const prefix = new TextEncoder().encode('Transaction::')
    const dataToSign = new Uint8Array(prefix.length + msgBytes.length)
    dataToSign.set(prefix, 0)
    dataToSign.set(msgBytes, prefix.length)

    return sign(dataToSign, privateKey)
  }
}
