import { WarpClientConfig } from '@vleap/warps'
import * as bech32 from 'bech32'
import { ed } from './ed25519-setup'
;(BigInt.prototype as any).toJSON = function () {
  return Number(this)
}

export interface TransactionData {
  sender: number[] | Uint8Array
  recipient: any
  nonce: number
  timestamp_nanos: bigint
  claim: any
}

export interface AccountInfoResponse {
  sender: number[]
  balance: string
  next_nonce: number
  pending_confirmation?: any
  requested_certificate?: any
  requested_validated_transaction?: any
  requested_received_transfers: any[]
  token_balance: Array<[number[], string]>
  requested_claim_by_id?: any
  requested_claims: any[]
}

export class Transaction {
  constructor(
    private sender: Uint8Array,
    private recipient: { FastSet: Uint8Array } | { External: Uint8Array },
    private nonce: number,
    private claim: any,
    private timestamp: bigint = BigInt(Date.now()) * 1_000_000n
  ) {
    // Fix claim data - remove 0x prefix from amounts
    if (claim?.Transfer?.amount?.startsWith('0x')) {
      claim = { ...claim, Transfer: { ...claim.Transfer, amount: claim.Transfer.amount.slice(2) } }
    }
  }

  toTransaction() {
    return { sender: this.sender, recipient: this.recipient, nonce: this.nonce, timestamp_nanos: this.timestamp, claim: this.claim }
  }

  getRecipientAddress() {
    return this.recipient
  }
  getAmount() {
    return this.claim?.Transfer?.amount || ''
  }
  getUserData() {
    return this.claim?.Transfer?.user_data || null
  }
}

export interface AccountInfoResponse {
  sender: number[]
  balance: string
  next_nonce: number
  pending_confirmation?: any
  requested_certificate?: any
  requested_validated_transaction?: any
  requested_received_transfers: any[]
  token_balance: Array<[number[], string]>
  requested_claim_by_id?: any
  requested_claims: any[]
}

export class FastsetClient {
  private proxyUrl: string

  constructor(config?: WarpClientConfig | { proxyUrl: string }, chain?: any) {
    this.proxyUrl = config && 'proxyUrl' in config ? config.proxyUrl : config && chain ? chain.defaultApiUrl : 'https://proxy.fastset.xyz'
  }

  private async makeRequest<T = any>(method: string, params: any = {}): Promise<T> {
    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }, (k, v) => (v instanceof Uint8Array ? Array.from(v) : v)),
    })

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const jsonResponse = await response.json()
    if (jsonResponse.error) throw new Error(`JSON-RPC error ${jsonResponse.error.code}: ${jsonResponse.error.message}`)
    return jsonResponse.result
  }

  async getAccountInfo(address: number[]): Promise<AccountInfoResponse> {
    return this.makeRequest('set_proxy_getAccountInfo', { address })
  }

  async getNextNonce(address: string | number[]): Promise<number> {
    const addressBytes = typeof address === 'string' ? this.addressToBytes(address) : address
    const accountInfo = await this.getAccountInfo(addressBytes)
    return accountInfo.next_nonce
  }

  async submitTransaction(transaction: TransactionData, signature: number[] | Uint8Array): Promise<string> {
    const signatureArray = Array.isArray(signature) ? signature : Array.from(signature)
    const submitTxReq = {
      transaction: {
        sender: transaction.sender instanceof Uint8Array ? transaction.sender : new Uint8Array(transaction.sender),
        recipient: transaction.recipient,
        nonce: transaction.nonce,
        timestamp_nanos: transaction.timestamp_nanos,
        claim: transaction.claim,
      },
      signature: new Uint8Array(signatureArray),
    }

    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'set_proxy_submitTransaction', params: submitTxReq, id: 1 }, (k, v) =>
        v instanceof Uint8Array ? Array.from(v) : v
      ),
    })

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const jsonResponse = await response.json()
    if (jsonResponse.error) throw new Error(`JSON-RPC error ${jsonResponse.error.code}: ${jsonResponse.error.message}`)
    return jsonResponse.result
  }

  async faucetDrip(recipient: number[] | Uint8Array, amount: string): Promise<any> {
    const recipientArray = Array.isArray(recipient) ? recipient : Array.from(recipient)
    return this.makeRequest('set_proxy_faucetDrip', { recipient: recipientArray, amount })
  }

  private addressToBytes(address: string): number[] {
    try {
      const decoded = bech32.bech32m.decode(address)
      return Array.from(bech32.bech32m.fromWords(decoded.words))
    } catch {
      const decoded = bech32.bech32.decode(address)
      return Array.from(bech32.bech32.fromWords(decoded.words))
    }
  }

  // Wallet utilities
  generateNewWallet(): Wallet {
    const privateKey = ed.utils.randomPrivateKey()
    return new Wallet(Buffer.from(privateKey).toString('hex'))
  }

  createWallet(privateKeyHex: string): Wallet {
    return new Wallet(privateKeyHex)
  }

  static decodeBech32Address(address: string): Uint8Array {
    try {
      const decoded = bech32.bech32m.decode(address)
      return new Uint8Array(bech32.bech32m.fromWords(decoded.words))
    } catch {
      const decoded = bech32.bech32.decode(address)
      return new Uint8Array(bech32.bech32.fromWords(decoded.words))
    }
  }

  static encodeBech32Address(publicKey: Uint8Array): string {
    const words = bech32.bech32m.toWords(publicKey)
    return bech32.bech32m.encode('set', words)
  }
}

export class Wallet {
  public readonly publicKey: Uint8Array
  private readonly privateKey: Uint8Array

  constructor(privateKeyHex: string) {
    this.privateKey = new Uint8Array(Buffer.from(privateKeyHex.replace(/^0x/, ''), 'hex'))
    this.publicKey = ed.getPublicKey(this.privateKey)
  }

  toBech32(): string {
    return bech32.bech32m.encode('set', bech32.bech32m.toWords(this.publicKey))
  }

  signTransactionRaw(data: Uint8Array): Uint8Array {
    return ed.sign(data, this.privateKey)
  }

  getPrivateKey(): Uint8Array {
    return this.privateKey
  }
}
