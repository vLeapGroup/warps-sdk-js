type CreateAgenticWalletRequest = { shard?: number; userId?: string }
type CreateAgenticWalletResponse = {
  success: boolean
  wallet: { address_multiversx: string; address_evm?: string; shard?: number | null }
}
type SignMessageRequest = { message: string; walletAddress: string }
type SignMessageResponse = { address: string; signature: string; message: string; version: number; signer: string; txHash?: string }
type SignTransactionRequest = {
  userId?: string
  walletAddress?: string
  send?: boolean
  relay?: boolean
  transaction: {
    sender?: string
    receiver: string
    value: string
    data?: string
    gasLimit: number
    gasPrice: number
    nonce?: number
  }
}
type SignTransactionResponse = {
  status: string
  data: {
    transaction: {
      nonce: number
      value: string
      receiver: string
      sender: string
      gasPrice: number
      gasLimit: number
      chainID: string
      version: number
      signature: string
    }
    sender: string
    receiver: string
    timestamp: string
  }
}

export class GaupaApiClient {
  private readonly publicKey: string
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(publicKey: string, apiKey: string, apiUrl: string) {
    this.publicKey = publicKey
    this.apiKey = apiKey
    this.baseUrl = apiUrl.replace(/\/$/, '')
  }

  async createAgenticWallet(request: CreateAgenticWalletRequest): Promise<CreateAgenticWalletResponse> {
    return this.request<CreateAgenticWalletResponse>('/manage/create-agentic-wallet', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async signTransaction(request: SignTransactionRequest): Promise<SignTransactionResponse> {
    return await this.request<SignTransactionResponse>('/manage/submit-agentic-transaction', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async signMessage(request: SignMessageRequest): Promise<SignMessageResponse> {
    return this.request<SignMessageResponse>('/manage/sign-agentic-message', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'Public-Key': this.publicKey,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    const responseStatus = response.status
    let responseBody: string | undefined

    try {
      responseBody = await response.text()
    } catch (error) {
      responseBody = `Failed to read response body: ${error}`
    }

    if (!response.ok) {
      throw new Error(`Gaupa API error (${responseStatus}): ${responseBody || 'Unknown error'}`)
    }

    try {
      return JSON.parse(responseBody || '{}')
    } catch (error) {
      throw new Error(`Failed to parse response JSON: ${error}. Response: ${responseBody}`)
    }
  }
}
