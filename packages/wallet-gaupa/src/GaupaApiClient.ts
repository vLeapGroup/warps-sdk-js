type CreateAgenticWalletRequest = { shard?: number }
type CreateAgenticWalletResponse = {
  success: boolean
  wallet: { address_multiversx: string; address_evm?: string; shard?: number | null }
}
type SignMessageRequest = { message: string; walletAddress: string }
type SignMessageResponse = { address: string; signature: string; message: string; version: number; signer: string; txHash?: string }

export class GaupaApiClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly publicKey: string

  constructor(apiKey: string, apiUrl: string, publicKey: string) {
    this.apiKey = apiKey
    this.publicKey = publicKey
    this.baseUrl = apiUrl.replace(/\/$/, '')
  }

  async createAgenticWallet(request: CreateAgenticWalletRequest): Promise<CreateAgenticWalletResponse> {
    return this.request<CreateAgenticWalletResponse>('/manage/create-agentic-wallet', {
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

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Gaupa API error (${response.status}): ${errorText}`)
    }

    return response.json()
  }
}
