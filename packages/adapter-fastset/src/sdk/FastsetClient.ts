import { getPublicKey } from '@noble/ed25519'
import { TransactionSigner } from './TransactionSigner'
import {
  AccountInfoResponse,
  Amount,
  FastSetAddress,
  FastsetJsonRpcRequest,
  FastsetJsonRpcResponse,
  FastsetTransaction,
  Page,
  PageRequest,
  Timed,
  TokenId,
  TokenInfoResponse,
  TransactionWithHash,
  isValidFastSetAddress,
} from './types'
import { Wallet } from './Wallet'

// @ts-ignore
BigInt.prototype.toJSON = () => Number(this)

export interface FastsetClientConfig {
  proxyUrl: string
}

const FASTSET_PROXY_URL = 'https://rpc.fastset.xyz'

export class FastsetClient {
  private config: FastsetClientConfig

  constructor(config?: FastsetClientConfig) {
    this.config = config || {
      proxyUrl: FASTSET_PROXY_URL,
    }
  }

  async submitTransaction(transaction: FastsetTransaction, signature: Uint8Array): Promise<string> {
    const result = await this.handleRpcCall<string>(
      'set_proxy_submitTransaction',
      [transaction, Array.from(signature)],
      'Failed to submit transaction'
    )
    if (!result) throw new Error('Failed to submit transaction: no result returned')
    return result
  }

  async requestFaucetDrip(recipient: FastSetAddress, amount: Amount, tokenId?: TokenId): Promise<void> {
    if (!isValidFastSetAddress(recipient)) {
      throw new Error('Invalid FastSet address format')
    }

    const recipientBytes = Wallet.decodeBech32Address(recipient)
    const params = [Array.from(recipientBytes), amount]

    if (tokenId) {
      const tokenIdBytes = tokenId.startsWith('0x')
        ? new Uint8Array(Buffer.from(tokenId.slice(2), 'hex'))
        : new Uint8Array(Buffer.from(tokenId, 'hex'))
      params.push(Array.from(tokenIdBytes))
    }

    await this.handleRpcCall<void>('set_proxy_faucetDrip', params, 'Failed to request faucet drip', true)
  }

  async getAccountInfo(
    address: Uint8Array,
    options?: { tokenBalancesFilter?: Uint8Array[]; certificateByNonce?: number }
  ): Promise<AccountInfoResponse> {
    const params: unknown[] = [Array.from(address)]

    if (options?.tokenBalancesFilter) {
      params.push(options.tokenBalancesFilter.map((token) => Array.from(token)))
    } else {
      params.push(null)
    }

    if (options?.certificateByNonce !== undefined) {
      params.push(options.certificateByNonce)
    } else {
      params.push(null)
    }

    // Try the prefixed method first, then fallback to non-prefixed
    let result = await this.handleRpcCall<AccountInfoResponse>('set_proxy_getAccountInfo', params, 'Failed to get account info', true)

    // If prefixed method fails, try the non-prefixed method
    if (!result) {
      result = await this.handleRpcCall<AccountInfoResponse>('getAccountInfo', params, 'Failed to get account info', true)
    }

    if (!result) {
      // Return default account info when both RPC methods fail
      return {
        sender: address,
        balance: '0',
        next_nonce: 0,
        pending_confirmation: undefined,
        requested_certificate: undefined,
        requested_validated_transaction: undefined,
        requested_received_transfers: [],
        token_balance: [],
        requested_claim_by_id: undefined,
        requested_claims: [],
      } as unknown as AccountInfoResponse
    }
    return result
  }

  async getTokensOwned(address: FastSetAddress): Promise<{ tokenId: TokenId; balance: Amount }[]> {
    if (!isValidFastSetAddress(address)) {
      throw new Error('Invalid FastSet address format')
    }

    const addressBytes = Wallet.decodeBech32Address(address)
    const accountInfo = await this.getAccountInfo(addressBytes)

    if (!accountInfo?.token_balance) {
      return []
    }

    return accountInfo.token_balance.map(([tokenId, balance]) => ({
      tokenId: ('0x' + Buffer.from(tokenId).toString('hex')) as TokenId,
      balance: balance as Amount,
    }))
  }

  async getTokenInfo(tokenIds: Uint8Array[]): Promise<TokenInfoResponse> {
    const result = await this.handleRpcCall<TokenInfoResponse>(
      'set_proxy_getTokenInfo',
      [tokenIds.map((token) => Array.from(token))],
      'Failed to get token info'
    )
    if (!result) {
      throw new Error('Failed to get token info: no result returned')
    }
    return result
  }

  async getTransfers(page: PageRequest): Promise<Page<Timed<any>>> {
    const params: unknown[] = [
      {
        limit: page.limit,
        token: page.token ? Array.from(page.token) : null,
      },
    ]

    const result = await this.handleRpcCall<Page<Timed<any>>>('set_proxy_getTransfers', params, 'Failed to get transfers')
    if (!result) {
      throw new Error('Failed to get transfers: no result returned')
    }
    return result
  }

  async getClaims(confirmed: boolean, page: PageRequest): Promise<Page<Timed<any>>> {
    const params: unknown[] = [
      confirmed,
      {
        limit: page.limit,
        token: page.token ? Array.from(page.token) : null,
      },
    ]

    const result = await this.handleRpcCall<Page<Timed<any>>>('set_proxy_getClaims', params, 'Failed to get claims')
    if (!result) {
      throw new Error('Failed to get claims: no result returned')
    }
    return result
  }

  async getClaimsByAddress(address: Uint8Array, page: { limit?: number; offset: number }): Promise<TransactionWithHash[]> {
    const params: unknown[] = [
      Array.from(address),
      {
        limit: page.limit,
        offset: page.offset,
      },
    ]

    const result = await this.handleRpcCall<TransactionWithHash[]>(
      'set_proxy_getClaimsByAddress',
      params,
      'Failed to get claims by address'
    )
    if (!result) {
      throw new Error('Failed to get claims by address: no result returned')
    }
    return result
  }

  async getNextNonce(senderAddress: string): Promise<number> {
    const addressBytes = Wallet.decodeBech32Address(senderAddress)

    try {
      const accountInfo = await this.getAccountInfo(addressBytes)
      return accountInfo?.next_nonce ?? 0
    } catch (error) {
      return 0
    }
  }

  async createTransferTransaction(
    sender: FastSetAddress,
    recipient: FastSetAddress,
    amount: Amount,
    userData?: Uint8Array
  ): Promise<FastsetTransaction> {
    if (!isValidFastSetAddress(sender)) {
      throw new Error('Invalid sender FastSet address format')
    }
    if (!isValidFastSetAddress(recipient)) {
      throw new Error('Invalid recipient FastSet address format')
    }

    const senderBytes = Wallet.decodeBech32Address(sender)
    const nonce = await this.getNextNonce(sender)
    const recipientBytes = Wallet.decodeBech32Address(recipient)

    return {
      sender: senderBytes,
      recipient: { FastSet: recipientBytes },
      nonce,
      timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
      claim: {
        Transfer: {
          recipient: { FastSet: recipientBytes },
          amount,
          user_data: userData ?? null,
        },
      },
    }
  }

  async createTokenTransferTransaction(
    sender: FastSetAddress,
    tokenId: TokenId,
    recipient: FastSetAddress,
    amount: Amount,
    userData?: Uint8Array
  ): Promise<FastsetTransaction> {
    if (!isValidFastSetAddress(sender)) {
      throw new Error('Invalid sender FastSet address format')
    }
    if (!isValidFastSetAddress(recipient)) {
      throw new Error('Invalid recipient FastSet address format')
    }

    const senderBytes = Wallet.decodeBech32Address(sender)
    const nonce = await this.getNextNonce(sender)
    const recipientBytes = Wallet.decodeBech32Address(recipient)
    const tokenIdBytes = tokenId.startsWith('0x')
      ? new Uint8Array(Buffer.from(tokenId.slice(2), 'hex'))
      : new Uint8Array(Buffer.from(tokenId, 'hex'))

    return {
      sender: senderBytes,
      recipient: { FastSet: recipientBytes },
      nonce,
      timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
      claim: {
        TokenTransfer: {
          token_id: tokenIdBytes,
          recipient: { FastSet: recipientBytes },
          amount,
          user_data: userData ?? null,
        },
      },
    }
  }

  async createTokenCreationTransaction(
    sender: FastSetAddress,
    tokenName: string,
    decimals: number,
    initialAmount: Amount,
    mints: FastSetAddress[],
    userData?: Uint8Array
  ): Promise<FastsetTransaction> {
    if (!isValidFastSetAddress(sender)) {
      throw new Error('Invalid sender FastSet address format')
    }

    const senderBytes = Wallet.decodeBech32Address(sender)
    const nonce = await this.getNextNonce(sender)
    const mintAddresses = mints.map((addr) => {
      if (!isValidFastSetAddress(addr)) {
        throw new Error(`Invalid mint address: ${addr}`)
      }
      return Wallet.decodeBech32Address(addr)
    })

    return {
      sender: senderBytes,
      recipient: { FastSet: senderBytes },
      nonce,
      timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
      claim: {
        TokenCreation: {
          token_name: tokenName,
          decimals,
          initial_amount: initialAmount,
          mints: mintAddresses,
          user_data: userData ?? null,
        },
      },
    }
  }

  async createTokenManagementTransaction(
    sender: FastSetAddress,
    tokenId: TokenId,
    updateId: number,
    newAdmin?: FastSetAddress,
    mints?: Array<{ change: 'Add' | 'Remove'; address: FastSetAddress }>,
    userData?: Uint8Array
  ): Promise<FastsetTransaction> {
    if (!isValidFastSetAddress(sender)) {
      throw new Error('Invalid sender FastSet address format')
    }

    const senderBytes = Wallet.decodeBech32Address(sender)
    const nonce = await this.getNextNonce(sender)
    const tokenIdBytes = tokenId.startsWith('0x')
      ? new Uint8Array(Buffer.from(tokenId.slice(2), 'hex'))
      : new Uint8Array(Buffer.from(tokenId, 'hex'))

    let newAdminBytes: Uint8Array | null = null
    if (newAdmin) {
      if (!isValidFastSetAddress(newAdmin)) {
        throw new Error('Invalid new admin FastSet address format')
      }
      newAdminBytes = Wallet.decodeBech32Address(newAdmin)
    }

    const mintChanges = (mints || []).map((mint) => {
      if (!isValidFastSetAddress(mint.address)) {
        throw new Error(`Invalid mint address: ${mint.address}`)
      }
      const addressBytes = Wallet.decodeBech32Address(mint.address)
      return [mint.change === 'Add' ? { Add: addressBytes } : { Remove: addressBytes }, addressBytes]
    })

    return {
      sender: senderBytes,
      recipient: { FastSet: senderBytes },
      nonce,
      timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
      claim: {
        TokenManagement: {
          token_id: tokenIdBytes,
          update_id: updateId,
          new_admin: newAdminBytes,
          mints: mintChanges,
          user_data: userData ?? null,
        },
      },
    }
  }

  async createMintTransaction(sender: FastSetAddress, tokenId: TokenId, amount: Amount): Promise<FastsetTransaction> {
    if (!isValidFastSetAddress(sender)) {
      throw new Error('Invalid sender FastSet address format')
    }

    const senderBytes = Wallet.decodeBech32Address(sender)
    const nonce = await this.getNextNonce(sender)
    const tokenIdBytes = tokenId.startsWith('0x')
      ? new Uint8Array(Buffer.from(tokenId.slice(2), 'hex'))
      : new Uint8Array(Buffer.from(tokenId, 'hex'))

    return {
      sender: senderBytes,
      recipient: { FastSet: senderBytes },
      nonce,
      timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
      claim: {
        Mint: {
          token_id: tokenIdBytes,
          amount,
        },
      },
    }
  }

  async createExternalClaimTransaction(
    sender: FastSetAddress,
    verifierCommittee: FastSetAddress[],
    verifierQuorum: number,
    claimData: Uint8Array,
    signatures: Array<{ signer: Uint8Array; signature: Uint8Array }>
  ): Promise<FastsetTransaction> {
    if (!isValidFastSetAddress(sender)) {
      throw new Error('Invalid sender FastSet address format')
    }

    const senderBytes = Wallet.decodeBech32Address(sender)
    const nonce = await this.getNextNonce(sender)
    const verifierCommitteeBytes = verifierCommittee.map((addr) => {
      if (!isValidFastSetAddress(addr)) {
        throw new Error(`Invalid verifier address: ${addr}`)
      }
      return Wallet.decodeBech32Address(addr)
    })

    return {
      sender: senderBytes,
      recipient: { FastSet: senderBytes },
      nonce,
      timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
      claim: {
        ExternalClaim: {
          claim: {
            verifier_committee: verifierCommitteeBytes,
            verifier_quorum: verifierQuorum,
            claim_data: claimData,
          },
          signatures: signatures.map((sig) => [sig.signer, sig.signature]),
        },
      },
    }
  }

  async signTransaction(transaction: FastsetTransaction, privateKey: Uint8Array): Promise<Uint8Array> {
    return await TransactionSigner.signTransaction(transaction, privateKey)
  }

  async submitSignedTransaction(transaction: FastsetTransaction, signature: Uint8Array): Promise<string> {
    return this.submitTransaction(transaction, signature)
  }

  async createAndSignTransfer(
    senderPrivateKey: Uint8Array,
    recipient: FastSetAddress,
    amount: Amount,
    userData?: Uint8Array
  ): Promise<{ transaction: FastsetTransaction; signature: Uint8Array }> {
    const transaction = await this.createTransferTransaction(
      Wallet.encodeBech32Address(await getPublicKey(senderPrivateKey)),
      recipient,
      amount,
      userData
    )
    const signature = await this.signTransaction(transaction, senderPrivateKey)
    return { transaction, signature }
  }

  async createAndSignTokenTransfer(
    senderPrivateKey: Uint8Array,
    tokenId: TokenId,
    recipient: FastSetAddress,
    amount: Amount,
    userData?: Uint8Array
  ): Promise<{ transaction: FastsetTransaction; signature: Uint8Array }> {
    const senderAddress = Wallet.encodeBech32Address(await getPublicKey(senderPrivateKey))
    const transaction = await this.createTokenTransferTransaction(senderAddress, tokenId, recipient, amount, userData)
    const signature = await this.signTransaction(transaction, senderPrivateKey)
    return { transaction, signature }
  }

  async createAndSignTokenCreation(
    senderPrivateKey: Uint8Array,
    tokenName: string,
    decimals: number,
    initialAmount: Amount,
    mints: FastSetAddress[],
    userData?: Uint8Array
  ): Promise<{ transaction: FastsetTransaction; signature: Uint8Array }> {
    const senderAddress = Wallet.encodeBech32Address(await getPublicKey(senderPrivateKey))
    const transaction = await this.createTokenCreationTransaction(senderAddress, tokenName, decimals, initialAmount, mints, userData)
    const signature = await this.signTransaction(transaction, senderPrivateKey)
    return { transaction, signature }
  }

  protected async handleRpcCall<T>(method: string, params: unknown[], errorMessage: string, allowNull = true): Promise<T | null> {
    try {
      const response = await this.requestProxy(method, params)
      return response.result as T
    } catch (error) {
      if (!allowNull) throw error
      return null
    }
  }

  private async requestProxy(method: string, params: unknown[]): Promise<FastsetJsonRpcResponse> {
    return this.request(this.config.proxyUrl, method, params)
  }

  private async request(url: string, method: string, params: unknown[]): Promise<FastsetJsonRpcResponse> {
    try {
      const request: FastsetJsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method,
        params: params,
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request, this.jsonReplacer),
      })

      if (!response.ok) {
        throw new Error(`HTTP request failed: ${response.status} ${response.statusText}`)
      }

      const jsonResponse = await response.json()

      if (jsonResponse.error) {
        throw new Error(`RPC error: ${jsonResponse.error.message} (code: ${jsonResponse.error.code})`)
      }

      return jsonResponse
    } catch (error) {
      throw error
    }
  }

  private jsonReplacer(key: string, value: unknown): unknown {
    if (value instanceof Uint8Array) {
      return Array.from(value)
    }
    return value
  }
}
