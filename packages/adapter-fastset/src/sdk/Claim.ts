import { FastsetTransaction } from './types'

export interface ClaimData {
  [key: string]: unknown
}

export abstract class Claim {
  abstract readonly type: string
  abstract readonly data: ClaimData

  abstract toTransactionData(): unknown

  static fromTransaction(transaction: FastsetTransaction): Claim {
    const claimType = Object.keys(transaction.claim)[0]
    const claimData = transaction.claim[claimType as keyof typeof transaction.claim]

    switch (claimType) {
      case 'Transfer':
        return TransferClaim.fromData(claimData as any)
      default:
        throw new Error(`Unknown claim type: ${claimType}`)
    }
  }
}

export class TransferClaim extends Claim {
  readonly type = 'Transfer'
  readonly data: {
    recipient: Uint8Array
    amount: string
    userData?: Uint8Array
  }

  constructor(recipient: Uint8Array, amount: string, userData?: Uint8Array) {
    super()
    this.data = { recipient, amount, userData }
  }

  toTransactionData(): unknown {
    return {
      Transfer: {
        recipient: { FastSet: this.data.recipient },
        amount: this.data.amount,
        user_data: this.data.userData ?? null,
      },
    }
  }

  static fromData(data: any): TransferClaim {
    const recipient = data.recipient.FastSet || data.recipient.External
    return new TransferClaim(recipient, data.amount, data.user_data)
  }

  getRecipient(): Uint8Array {
    return this.data.recipient
  }

  getAmount(): string {
    return this.data.amount
  }

  getUserData(): Uint8Array | undefined {
    return this.data.userData
  }
}
