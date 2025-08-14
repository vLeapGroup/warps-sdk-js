import { getPublicKey, sign } from '@noble/ed25519'
import {
  FastsetAccountInfo,
  FastsetFaucetRequest,
  FastsetFaucetResponse,
  FastsetJsonRpcRequest,
  FastsetJsonRpcResponse,
  FastsetSubmitCertificateRequest,
  FastsetSubmitTransactionRequest,
  FastsetSubmitTransactionResponse,
  FastsetTransaction,
  Transaction,
} from './types'

export interface FastsetClientConfig {
  validatorUrl: string
  proxyUrl: string
}

export class FastsetClient {
  private config: FastsetClientConfig

  constructor(config: FastsetClientConfig) {
    this.config = config
  }

  async getAccountInfo(address: Uint8Array): Promise<FastsetAccountInfo | null> {
    try {
      const response = await this.requestValidator('set_getAccountInfo', {
        address: Array.from(address),
      })

      if (response.error) {
        return null
      }

      return response.result as FastsetAccountInfo
    } catch (error) {
      return null
    }
  }

  async getNextNonce(senderAddress: Uint8Array): Promise<number> {
    const accountInfo = await this.getAccountInfo(senderAddress)
    return accountInfo?.next_nonce ?? 0
  }

  async fundFromFaucet(request: FastsetFaucetRequest): Promise<FastsetFaucetResponse> {
    const response = await this.requestProxy('faucetDrip', {
      recipient: Array.from(request.recipient),
      amount: request.amount,
    })

    if (response.error) {
      throw new Error(`Faucet request failed: ${response.error.message}`)
    }

    return response.result as FastsetFaucetResponse
  }

  async submitTransaction(request: FastsetSubmitTransactionRequest): Promise<FastsetSubmitTransactionResponse> {
    const response = await this.requestValidator('set_submitTransaction', {
      transaction: this.serializeTransaction(request.transaction),
      signature: Array.from(request.signature),
    })

    if (response.error) {
      throw new Error(`Transaction submission failed: ${response.error.message}`)
    }

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
    const response = await this.requestValidator('set_submitTransactionCertificate', {
      transaction: this.serializeTransaction(request.transaction),
      signature: Array.from(request.signature),
      validator_signatures: request.validator_signatures.map(([validator, signature]) => [Array.from(validator), Array.from(signature)]),
    })

    if (response.error) {
      throw new Error(`Certificate submission failed: ${response.error.message}`)
    }
  }

  async executeTransfer(senderPrivateKey: Uint8Array, recipient: Uint8Array, amount: string, userData?: Uint8Array): Promise<Uint8Array> {
    const senderPublicKey = await getPublicKey(senderPrivateKey)
    const nonce = await this.getNextNonce(senderPublicKey)

    const transaction: FastsetTransaction = {
      sender: senderPublicKey,
      nonce,
      timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
      claim: {
        Transfer: {
          recipient: { FastSet: recipient },
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

  async signTransaction(transaction: FastsetTransaction, privateKey: Uint8Array): Promise<Uint8Array> {
    const msg = Transaction.serialize(transaction)
    const msgBytes = msg.toBytes()

    const prefix = new TextEncoder().encode('Transaction::')
    const dataToSign = new Uint8Array(prefix.length + msgBytes.length)
    dataToSign.set(prefix, 0)
    dataToSign.set(msgBytes, prefix.length)

    return sign(dataToSign, privateKey)
  }

  private serializeTransaction(transaction: FastsetTransaction): unknown {
    return JSON.stringify(transaction, this.jsonReplacer)
  }

  private async requestValidator(method: string, params: unknown): Promise<FastsetJsonRpcResponse> {
    return this.request(this.config.validatorUrl, method, params)
  }

  private async requestProxy(method: string, params: unknown): Promise<FastsetJsonRpcResponse> {
    return this.request(this.config.proxyUrl, method, params)
  }

  private async request(url: string, method: string, params: unknown): Promise<FastsetJsonRpcResponse> {
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

    return response.json()
  }

  private jsonReplacer(key: string, value: unknown): unknown {
    if (value instanceof Uint8Array) {
      return Array.from(value)
    }
    return value
  }
}
