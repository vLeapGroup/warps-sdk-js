import { bcs } from '@mysten/bcs'

// BigInt serialization workaround
// @ts-ignore
BigInt.prototype.toJSON = function () {
  return Number(this)
}

// Type guards
export const isValidFastSetAddress = (address: string): boolean => {
  return address.startsWith('set1') && address.length === 62
}

export const isValidHexString = (hex: string): boolean => {
  return /^0x[0-9a-fA-F]*$/.test(hex)
}

// BCS Type Definitions
export const Bytes32 = bcs.fixedArray(32, bcs.u8())
export const PublicKey = Bytes32
export const Signature = bcs.fixedArray(64, bcs.u8())

export const Address = bcs.enum('Address', {
  External: PublicKey,
  FastSet: PublicKey,
})

export const Amount = bcs.u256().transform({
  input: (val: unknown) => hexToDecimal((val as string).toString()),
  output: (value: string) => value,
})

export const Balance = bcs.string().transform({
  input: (val: unknown) => val as string,
  output: (value: string) => value,
})

export const UserData = bcs.option(Bytes32)
export const Nonce = bcs.u64()
export const Quorum = bcs.u64()
export const TokenId = Bytes32

export const Transfer = bcs.struct('Transfer', {
  recipient: Address,
  amount: Amount,
  user_data: UserData,
})

export const TokenTransfer = bcs.struct('TokenTransfer', {
  token_id: TokenId,
  amount: Amount,
  user_data: UserData,
})

export const TokenCreation = bcs.struct('TokenCreation', {
  token_name: bcs.string(),
  decimals: bcs.u8(),
  initial_amount: Amount,
  mints: bcs.vector(PublicKey),
  user_data: UserData,
})

export const AddressChange = bcs.enum('AddressChange', {
  Add: PublicKey,
  Remove: PublicKey,
})

export const TokenManagement = bcs.struct('TokenManagement', {
  token_id: TokenId,
  update_id: Nonce,
  new_admin: bcs.option(PublicKey),
  mints: bcs.vector(bcs.tuple([AddressChange, PublicKey])),
  user_data: UserData,
})

export const Mint = bcs.struct('Mint', {
  token_id: TokenId,
  amount: Amount,
})

export const ClaimData = bcs.vector(bcs.u8())

export const ExternalClaimBody = bcs.struct('ExternalClaimBody', {
  verifier_committee: bcs.vector(PublicKey),
  verifier_quorum: Quorum,
  claim_data: ClaimData,
})

export const ExternalClaim = bcs.struct('ExternalClaim', {
  claim: ExternalClaimBody,
  signatures: bcs.vector(bcs.tuple([PublicKey, Signature])),
})

export const ClaimType = bcs.enum('ClaimType', {
  Transfer: Transfer,
  TokenTransfer: TokenTransfer,
  TokenCreation: TokenCreation,
  TokenManagement: TokenManagement,
  Mint: Mint,
  ExternalClaim: ExternalClaim,
})

export const BcsTransaction = bcs.struct('Transaction', {
  sender: PublicKey,
  recipient: Address,
  nonce: Nonce,
  timestamp_nanos: bcs.u128(),
  claim: ClaimType,
})

// TypeScript interfaces for API types
// Transaction types from the example
export interface TransactionData {
  sender: number[] // PublicKeyBytes (32 bytes) as array
  recipient: Address
  nonce: number // uint64
  timestamp_nanos: string // uint128 as string
  claim: ClaimType
}

export interface Address {
  External?: number[]
  FastSet?: number[]
}

export interface ClaimType {
  Transfer?: Transfer
  TokenTransfer?: TokenTransfer
  TokenCreation?: TokenCreation
  TokenManagement?: TokenManagement
  Mint?: Mint
  ExternalClaim?: ExternalClaim
}

export interface Transfer {
  amount: string // Amount as hex string
  user_data?: number[] | null // Optional 32 bytes as array
}

export interface TokenTransfer {
  token_id: number[] // 32 bytes as array
  amount: string // Amount as hex string
  user_data?: number[] | null // Optional 32 bytes as array
}

export interface TokenCreation {
  token_name: string
  decimals: number // uint8
  initial_amount: string // Amount as hex string
  mints: number[][] // Array of PublicKeyBytes as arrays
  user_data?: number[] | null // Optional 32 bytes as array
}

export interface TokenManagement {
  token_id: number[] // 32 bytes as array
  update_id: number // uint64
  new_admin?: number[] // Optional PublicKeyBytes as array
  mints: Array<[AddressChange, number[]]>
  user_data?: number[] | null // Optional 32 bytes as array
}

export interface AddressChange {
  Add?: any[]
  Remove?: any[]
}

export interface Mint {
  token_id: number[] // 32 bytes as array
  amount: string // Amount as hex string
}

export interface ExternalClaim {
  claim: ExternalClaimBody
  signatures: Array<[number[], number[]]> // [(PublicKeyBytes, Signature)] as arrays
}

export interface ExternalClaimBody {
  verifier_committee: number[][] // Array of PublicKeyBytes as arrays
  verifier_quorum: number // uint64
  claim_data: number[] // Array of bytes
}

export interface Signature extends Array<number> {} // 64 bytes as array

export interface PageRequest {
  limit: number
  token?: number[] // Optional array of bytes
}

export interface Pagination {
  limit?: number
  offset: number
}

// Legacy interface for backward compatibility
export interface FastsetTransaction {
  sender: Uint8Array
  recipient: { FastSet: Uint8Array } | { External: Uint8Array }
  nonce: number
  timestamp_nanos: bigint
  claim: any // Can be Transfer, TokenTransfer, TokenCreation, etc.
}

// API Response Types
export interface TokenMetadata {
  update_id: number
  admin: Uint8Array
  token_name: string
  decimals: number
  total_supply: string
  mints: Uint8Array[]
}

export interface SettleTiming {
  settled_at: bigint
}

export interface Timed<T> {
  data: T
  timing?: SettleTiming
}

export interface Pagination {
  limit?: number
  offset: number
}

export interface Page<T> {
  data: T[]
  next_page_token: Uint8Array
}

export interface TokenInfoResponse {
  requested_token_metadata: Array<[Uint8Array, TokenMetadata]>
}

export interface TransactionWithHash {
  transaction: TransactionData
  hash: Uint8Array
}

export interface ValidatedTransaction {
  value: TransactionEnvelope
  validator: Uint8Array
  signature: Uint8Array
}

export interface TransactionCertificate {
  envelope: TransactionEnvelope
  signatures: Array<[Uint8Array, Uint8Array]>
}

export interface TransactionEnvelope {
  transaction: TransactionData
  signature: Uint8Array
}

export interface AccountInfoResponse {
  sender: Uint8Array
  balance: string
  next_nonce: number
  pending_confirmation?: ValidatedTransaction
  requested_certificate?: TransactionCertificate
  requested_validated_transaction?: ValidatedTransaction
  requested_received_transfers: TransactionCertificate[]
  token_balance: Array<[Uint8Array, string]>
  requested_claim_by_id?: any
  requested_claims: TransactionWithHash[]
}

// Legacy interfaces (keeping for compatibility)
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
  recipient: string | Uint8Array
  amount: typeof Amount
  tokenId?: typeof TokenId | Uint8Array
}

export interface FastsetFaucetResponse {
  // Empty response
}

export interface FastsetJsonRpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params: unknown[]
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
