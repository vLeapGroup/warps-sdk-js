import * as bech32 from 'bech32'
import { FastsetJsonRpcResponse, TokenInfoResponse } from './types'
;(BigInt.prototype as any).toJSON = function () {
  return Number(this)
}

export interface TransactionData {
  sender: number[] | Uint8Array
  recipient: any
  nonce: number
  timestamp_nanos: bigint
  claim: any
  signature?: string
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

let id = 0

export class FastsetClient {
  private proxyUrl: string

  constructor(proxyUrl: string) {
    this.proxyUrl = proxyUrl
  }

  async request(url: string, method: string, params: any): Promise<any> {
    const request = this.buildJsonRpcRequest(id++, method, params)
    const headers = { 'Content-Type': 'application/json' }
    const body = this.jsonSerialize(request)
    const response = await fetch(url, { method: 'POST', headers, body })
    const json = await response.json()
    return json
  }

  private buildJsonRpcRequest(id: number, method: string, params: any) {
    return { jsonrpc: '2.0', id, method, params }
  }

  private jsonSerialize(data: any) {
    return JSON.stringify(data, (k, v) => {
      if (v instanceof Uint8Array) {
        return Array.from(v)
      }
      return v
    })
  }

  async getAccountInfo(address: Uint8Array): Promise<FastsetJsonRpcResponse<AccountInfoResponse>> {
    return this.request(this.proxyUrl, 'set_proxy_getAccountInfo', { address, token_balances_filter: [] })
  }

  async getTokenInfo(tokenIds: Uint8Array): Promise<FastsetJsonRpcResponse<TokenInfoResponse>> {
    return this.request(this.proxyUrl, 'set_proxy_getTokenInfo', { tokenIds: [Array.from(tokenIds)] })
  }

  async getNextNonce(address: string | Uint8Array): Promise<number> {
    const addressBytes = typeof address === 'string' ? this.addressToBytes(address) : address
    const accountInfoRes = await this.getAccountInfo(addressBytes)
    return accountInfoRes.result?.next_nonce ?? 0
  }

  private addressToBytes(address: string): Uint8Array {
    try {
      const decoded = bech32.bech32m.decode(address)
      return new Uint8Array(bech32.bech32m.fromWords(decoded.words))
    } catch {
      const decoded = bech32.bech32.decode(address)
      return new Uint8Array(bech32.bech32.fromWords(decoded.words))
    }
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
