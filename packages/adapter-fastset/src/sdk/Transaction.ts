import { FastsetTransaction } from './types'

export interface TransactionOptions {
  timestamp?: bigint
  recipient?: { FastSet: Uint8Array } | { External: Uint8Array }
}

export class Transaction {
  private sender: Uint8Array
  private recipient: { FastSet: Uint8Array } | { External: Uint8Array }
  private nonce: number
  private claim: any
  private timestamp: bigint

  constructor(
    sender: Uint8Array,
    recipient: { FastSet: Uint8Array } | { External: Uint8Array },
    nonce: number,
    claim: any,
    options: TransactionOptions = {}
  ) {
    this.sender = sender
    this.recipient = recipient
    this.nonce = nonce
    this.claim = claim
    this.timestamp = options.timestamp ?? BigInt(Date.now()) * 1_000_000n
  }

  toTransaction(): FastsetTransaction {
    return {
      sender: this.sender,
      recipient: this.recipient,
      nonce: this.nonce,
      timestamp_nanos: this.timestamp,
      claim: this.claim,
    }
  }

  getSender(): Uint8Array {
    return this.sender
  }

  getRecipient(): { FastSet: Uint8Array } | { External: Uint8Array } {
    return this.recipient
  }

  getNonce(): number {
    return this.nonce
  }

  getClaim(): any {
    return this.claim
  }

  getTimestamp(): bigint {
    return this.timestamp
  }

  static fromTransaction(transaction: FastsetTransaction): Transaction {
    return new Transaction(transaction.sender, transaction.recipient, transaction.nonce, transaction.claim, {
      timestamp: transaction.timestamp_nanos,
    })
  }
}
