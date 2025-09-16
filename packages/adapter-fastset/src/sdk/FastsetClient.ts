import { BCS, getSuiMoveConfig } from '@mysten/bcs'
import * as bech32 from 'bech32'
import { FastsetJsonRpcResponse } from './types'
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

// BCS instance for Fastset transaction serialization
const bcs = new BCS(getSuiMoveConfig())

// Register Fastset-specific types
bcs.registerStructType('FastSetAddress', {
  bytes: 'vector<u8>',
})

bcs.registerStructType('ExternalAddress', {
  bytes: 'vector<u8>',
})

// Register Address as a union type
bcs.registerEnumType('Address', {
  FastSet: 'FastSetAddress',
  External: 'ExternalAddress',
})

// Register option type as enum
bcs.registerEnumType('UserDataOption', {
  Some: 'vector<u8>',
  None: 'bool', // Use bool for None variant (false = None)
})

bcs.registerStructType('TransferClaim', {
  amount: 'u256', // 256-bit unsigned integer
  user_data: 'UserDataOption', // Use our custom option type
})

bcs.registerStructType('ClaimType', {
  Transfer: 'TransferClaim',
})

bcs.registerStructType('Transaction', {
  sender: 'vector<u8>', // 32 bytes
  recipient: 'Address',
  nonce: 'u64',
  timestamp_nanos: 'u128',
  claim: 'ClaimType',
})

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

  async getAccountInfo(address: number[]): Promise<FastsetJsonRpcResponse<AccountInfoResponse>> {
    return this.request(this.proxyUrl, 'set_proxy_getAccountInfo', { address })
  }

  async getNextNonce(address: string | number[]): Promise<number> {
    const addressBytes = typeof address === 'string' ? this.addressToBytes(address) : address
    const accountInfoRes = await this.getAccountInfo(addressBytes)
    return accountInfoRes.result?.next_nonce ?? 0
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
