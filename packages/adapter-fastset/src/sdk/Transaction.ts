import { Claim } from './Claim'
import { FastsetTransaction } from './types'

export interface TransactionOptions {
  timestamp?: bigint
}

export class Transaction {
  private sender: Uint8Array
  private nonce: number
  private claim: Claim
  private timestamp: bigint

  constructor(sender: Uint8Array, nonce: number, claim: Claim, options: TransactionOptions = {}) {
    this.sender = sender
    this.nonce = nonce
    this.claim = claim
    this.timestamp = options.timestamp ?? BigInt(Date.now()) * 1_000_000n
  }

  toTransaction(): FastsetTransaction {
    return {
      sender: this.sender,
      nonce: this.nonce,
      timestamp_nanos: this.timestamp,
      claim: this.claim.toTransactionData() as any,
    }
  }

  getSender(): Uint8Array {
    return this.sender
  }

  getNonce(): number {
    return this.nonce
  }

  getClaim(): Claim {
    return this.claim
  }

  getTimestamp(): bigint {
    return this.timestamp
  }

  static fromTransaction(transaction: FastsetTransaction): Transaction {
    const claim = Claim.fromTransaction(transaction)
    return new Transaction(transaction.sender, transaction.nonce, claim, { timestamp: transaction.timestamp_nanos })
  }
}
