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

// Fastset RPC endpoints
const FASTSET_VALIDATOR_URL = 'http://157.90.201.117:8765'
const FASTSET_PROXY_URL = 'http://136.243.61.168:44444'

export class FastsetClient {
  private config: FastsetClientConfig

  constructor(config?: FastsetClientConfig) {
    this.config = config || {
      validatorUrl: FASTSET_VALIDATOR_URL,
      proxyUrl: FASTSET_PROXY_URL,
    }
  }

  async getAccountInfo(address: string): Promise<FastsetAccountInfo | null> {
    try {
      const addressBytes = Wallet.decodeBech32Address(address)
      const response = await this.requestValidator('set_getAccountInfo', {
        address: Array.from(addressBytes),
      })
      return response.result as FastsetAccountInfo
    } catch (error) {
      return null
    }
  }

  async getNextNonce(senderAddress: string): Promise<number> {
    const accountInfo = await this.getAccountInfo(senderAddress)
    return accountInfo?.next_nonce ?? 0
  }

  async getAssetBalance(accountId: string, assetId: string): Promise<FastsetAssetBalance | null> {
    try {
      const response = await this.requestValidator('vsl_getAssetBalance', {
        account_id: accountId,
        assert_id: assetId,
      })
      return response.result as FastsetAssetBalance
    } catch (error) {
      return null
    }
  }

  async getAssetBalances(accountId: string): Promise<FastsetAssetBalances | null> {
    try {
      const response = await this.requestValidator('vsl_getAssetBalances', {
        account_id: accountId,
      })
      return response.result as FastsetAssetBalances
    } catch (error) {
      return null
    }
  }

  async fundFromFaucet(recipientAddress: string, amount: string): Promise<FastsetFaucetResponse> {
    const recipientBytes = Wallet.decodeBech32Address(recipientAddress)
    const response = await this.requestProxy('faucetDrip', {
      recipient: Array.from(recipientBytes),
      amount,
    })
    return response.result as FastsetFaucetResponse
  }

  async submitTransaction(request: FastsetSubmitTransactionRequest): Promise<FastsetSubmitTransactionResponse> {
    const response = await this.requestValidator('set_submitTransaction', {
      transaction: request.transaction,
      signature: Array.from(request.signature),
    })

    const result = response.result as {
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
    await this.requestValidator('set_submitTransactionCertificate', {
      transaction: request.transaction,
      signature: Array.from(request.signature),
      validator_signatures: request.validator_signatures.map(([validator, signature]) => [Array.from(validator), Array.from(signature)]),
    })
  }

  async executeTransfer(senderPrivateKey: Uint8Array, recipient: string, amount: string, userData?: Uint8Array): Promise<Uint8Array> {
    const senderPublicKey = await getPublicKey(senderPrivateKey)
    const senderAddress = Wallet.encodeBech32Address(senderPublicKey)
    const nonce = await this.getNextNonce(senderAddress)
    const recipientBytes = Wallet.decodeBech32Address(recipient)

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

    const signature = await this.signTransaction(transaction, senderPrivateKey)

    const submitResponse = await this.submitTransaction({
      transaction,
      signature,
    })

    await this.submitCertificate({
      transaction,
      signature,
      validator_signatures: [[submitResponse.validator, submitResponse.signature]],
    })

    return submitResponse.transaction_hash
  }

  async submitClaim(senderPrivateKey: Uint8Array, claim: any): Promise<Uint8Array> {
    const senderPublicKey = await getPublicKey(senderPrivateKey)
    const senderAddress = Wallet.encodeBech32Address(senderPublicKey)
    const nonce = await this.getNextNonce(senderAddress)

    const transaction: FastsetTransaction = {
      sender: senderPublicKey,
      nonce,
      timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
      claim,
    }

    const signature = await this.signTransaction(transaction, senderPrivateKey)

    const submitResponse = await this.submitTransaction({
      transaction,
      signature,
    })

    await this.submitCertificate({
      transaction,
      signature,
      validator_signatures: [[submitResponse.validator, submitResponse.signature]],
    })

    return submitResponse.transaction_hash
  }

  async signTransaction(transaction: FastsetTransaction, privateKey: Uint8Array): Promise<Uint8Array> {
    return await TransactionSigner.signTransaction(transaction, privateKey)
  }

  async getTransactionStatus(txHash: string): Promise<any> {
    try {
      const response = await this.requestValidator('set_getTransactionStatus', {
        hash: txHash,
      })
      return response.result
    } catch (error) {
      return null
    }
  }

  async getTransactionInfo(txHash: string): Promise<any> {
    try {
      const response = await this.requestValidator('set_getTransactionInfo', {
        hash: txHash,
      })
      return response.result
    } catch (error) {
      return null
    }
  }

  async getNetworkInfo(): Promise<any> {
    try {
      const response = await this.requestValidator('set_getNetworkInfo', {})
      return response.result
    } catch (error) {
      return null
    }
  }

  private async requestValidator(method: string, params: unknown): Promise<FastsetJsonRpcResponse> {
    return this.request(this.config.validatorUrl, method, params)
  }

  private async requestProxy(method: string, params: unknown): Promise<FastsetJsonRpcResponse> {
    return this.request(this.config.proxyUrl, method, params)
  }

  private async request(url: string, method: string, params: unknown): Promise<FastsetJsonRpcResponse> {
    try {
      const request: FastsetJsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method,
        params: params as Record<string, unknown>,
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request, this.jsonReplacer),
      })

      if (!response.ok) {
        throw new Error(`HTTP request failed: ${response.statusText}`)
      }

      const jsonResponse = await response.json()

      if (jsonResponse.error) {
        throw new Error(`RPC error: ${jsonResponse.error.message}`)
      }

      return jsonResponse
    } catch (error) {
      console.error(`Fastset RPC request failed: ${error}`)
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
