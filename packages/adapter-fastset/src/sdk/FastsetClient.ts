import { bcs } from '@mysten/bcs'
import { WarpClientConfig } from '@vleap/warps'
import * as bech32 from 'bech32'

const bcsTransaction = bcs.struct('Transaction', {
  sender: bcs.fixedArray(32, bcs.u8()),
  recipient: bcs.enum('Address', {
    External: bcs.fixedArray(32, bcs.u8()),
    FastSet: bcs.fixedArray(32, bcs.u8()),
  }),
  nonce: bcs.u64(),
  timestamp_nanos: bcs.u128(),
  claim: bcs.enum('ClaimType', {
    Transfer: bcs.struct('Transfer', {
      recipient: bcs.enum('Address', {
        External: bcs.fixedArray(32, bcs.u8()),
        FastSet: bcs.fixedArray(32, bcs.u8()),
      }),
      amount: bcs.string(),
      user_data: bcs.option(bcs.fixedArray(32, bcs.u8())),
    }),
    TokenTransfer: bcs.struct('TokenTransfer', {
      token_id: bcs.fixedArray(32, bcs.u8()),
      amount: bcs.string(),
      user_data: bcs.option(bcs.fixedArray(32, bcs.u8())),
    }),
    TokenCreation: bcs.struct('TokenCreation', {
      token_name: bcs.string(),
      decimals: bcs.u8(),
      initial_amount: bcs.string(),
      mints: bcs.vector(bcs.fixedArray(32, bcs.u8())),
      user_data: bcs.option(bcs.fixedArray(32, bcs.u8())),
    }),
    TokenManagement: bcs.struct('TokenManagement', {
      token_id: bcs.fixedArray(32, bcs.u8()),
      update_id: bcs.u64(),
      new_admin: bcs.option(bcs.fixedArray(32, bcs.u8())),
      mints: bcs.vector(
        bcs.tuple([
          bcs.enum('AddressChange', {
            Add: bcs.fixedArray(32, bcs.u8()),
            Remove: bcs.fixedArray(32, bcs.u8()),
          }),
          bcs.fixedArray(32, bcs.u8()),
        ])
      ),
      user_data: bcs.option(bcs.fixedArray(32, bcs.u8())),
    }),
    Mint: bcs.struct('Mint', {
      token_id: bcs.fixedArray(32, bcs.u8()),
      amount: bcs.string(),
    }),
    ExternalClaim: bcs.struct('ExternalClaim', {
      claim: bcs.struct('ExternalClaimBody', {
        verifier_committee: bcs.vector(bcs.fixedArray(32, bcs.u8())),
        verifier_quorum: bcs.u64(),
        claim_data: bcs.vector(bcs.u8()),
      }),
      signatures: bcs.vector(bcs.tuple([bcs.fixedArray(32, bcs.u8()), bcs.fixedArray(64, bcs.u8())])),
    }),
  }),
})

export interface PageRequest {
  limit: number
  token?: number[]
}

export interface Pagination {
  limit?: number
  offset: number
}

export interface Page<T> {
  data: T[]
  next_page_token: number[]
}

export interface Timed<T> {
  data: T
  timing?: {
    signing_duration_nanos?: number
    user_time_nanos?: number
    settlement_duration_nanos: number
  }
}

export interface TokenMetadata {
  update_id: number
  admin: number[]
  token_name: string
  decimals: number
  total_supply: string
  mints: number[][]
}

export interface TokenInfoResponse {
  requested_token_metadata: Array<[number[], TokenMetadata]>
}

export interface TransactionData {
  sender: number[]
  recipient: any
  nonce: number
  timestamp_nanos: string
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

export class FastsetClient {
  private readonly apiUrl: string

  constructor(config?: WarpClientConfig | { proxyUrl: string }, chain?: any) {
    if (config && 'proxyUrl' in config) {
      // Legacy constructor for executor
      this.apiUrl = config.proxyUrl
    } else if (config && chain) {
      // New constructor for data loader
      this.apiUrl = chain.defaultApiUrl
    } else {
      // Default
      this.apiUrl = 'https://rpc.fastset.xyz'
    }
  }

  private async makeRequest<T = any>(method: string, params: any = {}): Promise<T> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now(),
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const jsonResponse = await response.json()

    if (jsonResponse.error) {
      throw new Error(`JSON-RPC error ${jsonResponse.error.code}: ${jsonResponse.error.message}`)
    }

    return jsonResponse.result
  }

  async getAccountInfo(address: number[], token_balance_filter?: number[][], certificate_by_nonce?: number): Promise<AccountInfoResponse> {
    return this.makeRequest('set_getAccountInfo', {
      address,
      token_balance_filter,
      certificate_by_nonce,
    })
  }

  async getTokenInfo(token_ids: number[][]): Promise<TokenInfoResponse> {
    return this.makeRequest('set_getTokenInfo', {
      token_ids,
    })
  }

  async getTransfers(page: PageRequest): Promise<Page<Timed<any>>> {
    return this.makeRequest('set_getTransfers', { page })
  }

  async getClaims(confirmed: boolean, page: PageRequest): Promise<Page<Timed<any>>> {
    return this.makeRequest('set_getClaims', { confirmed, page })
  }

  async getClaimsByAddress(address: number[], page: Pagination): Promise<any[]> {
    return this.makeRequest('set_getClaimsByAddress', {
      address,
      page,
    })
  }

  async getNextNonce(address: string | number[]): Promise<number> {
    if (typeof address === 'string') {
      const addressBytes = this.addressToBytes(address)
      const accountInfo = await this.getAccountInfo(addressBytes)
      return accountInfo.next_nonce
    }
    const accountInfo = await this.getAccountInfo(address)
    return accountInfo.next_nonce
  }

  async submitTransaction(transaction: TransactionData, signature: number[] | Uint8Array): Promise<any> {
    const signatureArray = Array.isArray(signature) ? signature : Array.from(signature)
    return this.makeRequest('set_submitTransaction', {
      transaction,
      signature: signatureArray,
    })
  }

  private addressToBytes(address: string): number[] {
    try {
      const decoded = bech32.bech32m.decode(address)
      return Array.from(bech32.bech32m.fromWords(decoded.words))
    } catch {
      try {
        const decoded = bech32.bech32.decode(address)
        return Array.from(bech32.bech32.fromWords(decoded.words))
      } catch {
        throw new Error(`Invalid FastSet address: ${address}`)
      }
    }
  }
}
