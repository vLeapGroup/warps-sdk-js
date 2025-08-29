import { bcs } from '@mysten/bcs'

// BigInt serialization workaround
// @ts-ignore
BigInt.prototype.toJSON = function () {
  return Number(this)
}

// BCS Type Definitions
export const Bytes32 = bcs.fixedArray(32, bcs.u8())
export const PublicKey = Bytes32

export const Address = bcs.enum('Address', {
  External: PublicKey,
  FastSet: PublicKey,
})

export const Amount = bcs.u256().transform({
  input: (val: unknown) => hexToDecimal((val as string).toString()),
  output: (value: string) => value,
})

export const UserData = bcs.option(Bytes32)
export const Nonce = bcs.u64()

export const Transfer = bcs.struct('Transfer', {
  recipient: Address,
  amount: Amount,
  user_data: UserData,
})

export const ClaimType = bcs.enum('ClaimType', {
  Transfer: Transfer,
})

export const BcsTransaction = bcs.struct('Transaction', {
  sender: PublicKey,
  nonce: Nonce,
  timestamp_nanos: bcs.u128(),
  claim: ClaimType,
})

// TypeScript interfaces
export interface FastsetTransaction {
  sender: Uint8Array
  nonce: number
  timestamp_nanos: bigint
  claim: {
    Transfer: {
      recipient: { FastSet: Uint8Array } | { External: Uint8Array }
      amount: string
      user_data: Uint8Array | null
    }
  }
}

export interface FastsetTransferRequest {
  recipient: Uint8Array
  amount: string
  user_data?: Uint8Array
}

export interface FastsetAccountInfo {
  balance: string
  next_nonce: number
  sequence_number: number
}

export interface FastsetSubmitTransactionRequest {
  transaction: FastsetTransaction
  signature: Uint8Array
}

export interface FastsetSubmitTransactionResponse {
  transaction_hash: Uint8Array
  validator: Uint8Array
  signature: Uint8Array
}

export interface FastsetSubmitCertificateRequest {
  transaction: FastsetTransaction
  signature: Uint8Array
  validator_signatures: [Uint8Array, Uint8Array][]
}

export interface FastsetFaucetRequest {
  recipient: Uint8Array
  amount: string
}

export interface FastsetFaucetResponse {
  balance: string
}

export interface FastsetJsonRpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params: Record<string, unknown>
}

export interface FastsetJsonRpcResponse<T = unknown> {
  jsonrpc: '2.0'
  id: number
  result?: T
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

export interface FastsetAssetBalance {
  asset_id: string
  balance: string
  name?: string
  decimals?: number
  logo_url?: string
}

export interface FastsetAssetBalances {
  [assetId: string]: FastsetAssetBalance
}

// Helper function
function hexToDecimal(hex: string): string {
  return BigInt(`0x${hex}`).toString()
}
