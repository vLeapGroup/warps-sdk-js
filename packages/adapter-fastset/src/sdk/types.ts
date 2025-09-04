import { bcs } from '@mysten/bcs'

// BigInt serialization workaround
// @ts-ignore
BigInt.prototype.toJSON = function () {
  return Number(this)
}

// Strong Type Definitions
export type FastSetAddress = string
export type TokenId = string
export type Amount = string
export type HexString = string

// Type guards
export const isValidFastSetAddress = (address: string): address is FastSetAddress => {
  return address.startsWith('set1') && address.length === 62
}

export const isValidHexString = (hex: string): hex is HexString => {
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
export interface FastsetTransaction {
  sender: Uint8Array
  recipient: { FastSet: Uint8Array } | { External: Uint8Array }
  nonce: number
  timestamp_nanos: bigint
  claim: any // Can be Transfer, TokenTransfer, TokenCreation, etc.
}

// API Request/Response Types
export interface FastsetTransferRequest {
  recipient: FastSetAddress | Uint8Array
  amount: Amount
  user_data?: Uint8Array
}

export interface FastsetTokenTransferRequest {
  token_id: Uint8Array | HexString
  recipient: FastSetAddress | Uint8Array
  amount: Amount
  user_data?: Uint8Array
}

export interface FastsetTokenCreationRequest {
  token_name: string
  decimals: number
  initial_amount: Amount
  mints: (FastSetAddress | Uint8Array)[]
  user_data?: Uint8Array
}

export interface FastsetTokenManagementRequest {
  token_id: Uint8Array | HexString
  update_id: number
  new_admin?: FastSetAddress | Uint8Array
  mints: Array<{ change: 'Add' | 'Remove'; address: FastSetAddress | Uint8Array }>
  user_data?: Uint8Array
}

export interface FastsetMintRequest {
  token_id: Uint8Array | HexString
  amount: Amount
}

export interface FastsetExternalClaimRequest {
  claim: {
    verifier_committee: Uint8Array[]
    verifier_quorum: number
    claim_data: Uint8Array
  }
  signatures: Array<{ signer: Uint8Array; signature: Uint8Array }>
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

export interface PageRequest {
  limit: number
  token?: Uint8Array
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
  transaction: FastsetTransaction
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
  transaction: FastsetTransaction
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
  recipient: FastSetAddress | Uint8Array
  amount: Amount
  tokenId?: TokenId | Uint8Array
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
