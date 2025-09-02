import { getPublicKey } from '@noble/ed25519'
import { TransactionSigner } from './TransactionSigner'
import {
  FastsetAccountInfo,
  FastsetAssetBalance,
  FastsetAssetBalances,
  FastsetFaucetResponse,
  FastsetJsonRpcRequest,
  FastsetJsonRpcResponse,
  FastsetSubmitCertificateRequest,
  FastsetSubmitTransactionRequest,
  FastsetSubmitTransactionResponse,
  FastsetTransaction,
} from './types'
import { Wallet } from './Wallet'

// Configure ed25519 library for Node.js environment
// @ts-ignore
BigInt.prototype.toJSON = function () {
  return Number(this)
}

export interface FastsetClientConfig {
  validatorUrl: string
  proxyUrl: string
}

const FASTSET_VALIDATOR_URL = 'https://rpc.fastset.xyz'
const FASTSET_PROXY_URL = 'http://136.243.61.168:44444'

export class FastsetClient {
  private config: FastsetClientConfig

  constructor(config?: FastsetClientConfig) {
    this.config = config || {
      validatorUrl: FASTSET_VALIDATOR_URL,
      proxyUrl: FASTSET_PROXY_URL,
    }
  }

  // Generic error handling wrapper for RPC calls
  private async handleRpcCall<T>(
    method: string,
    params: unknown,
    errorMessage: string,
    useProxy = false,
    allowNull = true
  ): Promise<T | null> {
    try {
      const response = useProxy ? await this.requestProxy(method, params) : await this.requestValidator(method, params)
      console.log(`RPC call to ${method} successful:`, response.result)
      return response.result as T
    } catch (error) {
      console.error(`${errorMessage}:`, error)
      if (!allowNull) throw error
      return null
    }
  }

  async getAccountInfo(address: string): Promise<FastsetAccountInfo | null> {
    const addressBytes = Wallet.decodeBech32Address(address)
    return this.handleRpcCall('set_getAccountInfo', [Array.from(addressBytes)], `Failed to get account info for address ${address}`)
  }

  async getNextNonce(senderAddress: string): Promise<number> {
    const accountInfo = await this.getAccountInfo(senderAddress)
    return accountInfo?.next_nonce ?? 0
  }

  async getAssetBalance(accountId: string, assetId: string): Promise<FastsetAssetBalance | null> {
    return this.handleRpcCall(
      'vsl_getAssetBalance',
      [accountId, assetId],
      `Failed to get asset balance for account ${accountId}, asset ${assetId}`
    )
  }

  async getAssetBalances(accountId: string): Promise<FastsetAssetBalances | null> {
    return this.handleRpcCall('vsl_getAssetBalances', [accountId], `Failed to get asset balances for account ${accountId}`)
  }

  async fundFromFaucet(recipientAddress: string, amount: string): Promise<FastsetFaucetResponse> {
    const recipientBytes = Wallet.decodeBech32Address(recipientAddress)
    return this.handleRpcCall(
      'faucetDrip',
      [Array.from(recipientBytes), amount],
      `Failed to fund from faucet for address ${recipientAddress}`,
      true,
      false
    ) as Promise<FastsetFaucetResponse>
  }

  async submitTransaction(request: FastsetSubmitTransactionRequest): Promise<FastsetSubmitTransactionResponse> {
    const response = await this.handleRpcCall(
      'set_submitTransaction',
      [request.transaction, Array.from(request.signature)],
      'Failed to submit transaction',
      false,
      false
    )

    const result = response as {
      transaction_hash: number[]
      validator: number[]
      signature: number[]
    }
    return {
      transaction_hash: new Uint8Array(result.transaction_hash),
      validator: new Uint8Array(result.validator),
      signature: new Uint8Array(result.signature),
    }
  }

  async submitCertificate(request: FastsetSubmitCertificateRequest): Promise<void> {
    await this.handleRpcCall(
      'set_submitTransactionCertificate',
      [
        request.transaction,
        Array.from(request.signature),
        request.validator_signatures.map(([validator, signature]) => [Array.from(validator), Array.from(signature)]),
      ],
      'Failed to submit certificate',
      false,
      false
    )
  }

  async executeTransfer(senderPrivateKey: Uint8Array, recipient: string, amount: string, userData?: Uint8Array): Promise<Uint8Array> {
    try {
      console.log(`Executing transfer from sender to ${recipient} for amount ${amount}`)

      const senderPublicKey = getPublicKey(senderPrivateKey)
      const senderAddress = Wallet.encodeBech32Address(senderPublicKey)
      console.log(`Sender address: ${senderAddress}`)

      const nonce = await this.getNextNonce(senderAddress)
      console.log(`Using nonce: ${nonce}`)

      const recipientBytes = Wallet.decodeBech32Address(recipient)
      console.log(`Recipient decoded successfully`)

      const transaction: FastsetTransaction = {
        sender: senderPublicKey,
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

      console.log('Signing transaction...')
      const signature = await this.signTransaction(transaction, senderPrivateKey)

      console.log('Submitting transaction...')
      const submitResponse = await this.submitTransaction({
        transaction,
        signature,
      })

      console.log('Submitting certificate...')
      await this.submitCertificate({
        transaction,
        signature,
        validator_signatures: [[submitResponse.validator, submitResponse.signature]],
      })

      console.log(`Transfer executed successfully. Transaction hash: ${submitResponse.transaction_hash}`)
      return submitResponse.transaction_hash
    } catch (error) {
      console.error(`Failed to execute transfer to ${recipient}:`, error)
      throw error
    }
  }

  async submitClaim(senderPrivateKey: Uint8Array, claim: any): Promise<Uint8Array> {
    try {
      console.log('Submitting claim...')

      const senderPublicKey = await getPublicKey(senderPrivateKey)
      const senderAddress = Wallet.encodeBech32Address(senderPublicKey)
      console.log(`Claim sender address: ${senderAddress}`)

      const nonce = await this.getNextNonce(senderAddress)
      console.log(`Using nonce: ${nonce}`)

      const transaction: FastsetTransaction = {
        sender: senderPublicKey,
        nonce,
        timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
        claim,
      }

      console.log('Signing claim transaction...')
      const signature = await this.signTransaction(transaction, senderPrivateKey)

      console.log('Submitting claim transaction...')
      const submitResponse = await this.submitTransaction({
        transaction,
        signature,
      })

      console.log('Submitting claim certificate...')
      await this.submitCertificate({
        transaction,
        signature,
        validator_signatures: [[submitResponse.validator, submitResponse.signature]],
      })

      console.log(`Claim submitted successfully. Transaction hash: ${submitResponse.transaction_hash}`)
      return submitResponse.transaction_hash
    } catch (error) {
      console.error('Failed to submit claim:', error)
      throw error
    }
  }

  async signTransaction(transaction: FastsetTransaction, privateKey: Uint8Array): Promise<Uint8Array> {
    return await TransactionSigner.signTransaction(transaction, privateKey)
  }

  async getTransactionStatus(txHash: string): Promise<any> {
    return this.handleRpcCall('set_getTransactionStatus', [txHash], `Failed to get transaction status for hash ${txHash}`)
  }

  async getTransactionInfo(txHash: string): Promise<any> {
    return this.handleRpcCall('set_getTransactionInfo', [txHash], `Failed to get transaction info for hash ${txHash}`)
  }

  async getNetworkInfo(): Promise<any> {
    return this.handleRpcCall('set_getNetworkInfo', [], 'Failed to get network info')
  }

  private async requestValidator(method: string, params: unknown): Promise<FastsetJsonRpcResponse> {
    return this.request(this.config.validatorUrl, method, params)
  }

  private async requestProxy(method: string, params: unknown): Promise<FastsetJsonRpcResponse> {
    return this.request(this.config.proxyUrl, method, params)
  }

  private async request(url: string, method: string, params: unknown): Promise<FastsetJsonRpcResponse> {
    try {
      // Validate parameters before making the request
      if (params !== null && params !== undefined) {
        if (Array.isArray(params)) {
          // For array parameters, ensure all elements are valid
          for (let i = 0; i < params.length; i++) {
            if (params[i] === undefined) {
              throw new Error(`Parameter at index ${i} is undefined`)
            }
          }
        } else if (typeof params === 'object') {
          // For object parameters, ensure no undefined values
          const paramObj = params as Record<string, unknown>
          for (const [key, value] of Object.entries(paramObj)) {
            if (value === undefined) {
              throw new Error(`Parameter '${key}' is undefined`)
            }
          }
        }
      }

      const request: FastsetJsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method,
        params: params as Record<string, unknown>,
      }

      console.log(`Making RPC request to ${method} with params:`, params)

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

      console.log(`RPC request to ${method} successful:`, jsonResponse.result)
      return jsonResponse
    } catch (error) {
      console.error(`Fastset RPC request failed for method ${method}:`, error)
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
