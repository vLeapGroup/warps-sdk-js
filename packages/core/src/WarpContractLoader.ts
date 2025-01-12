import { ApiNetworkProvider } from '@multiversx/sdk-core/out'
import { WarpConfig, WarpContract, WarpContractVerification } from './types'

export class WarpContractLoader {
  constructor(private readonly config: WarpConfig) {}

  async getContract(address: string): Promise<WarpContract | null> {
    try {
      const chainApi = this.getConfiguredChainApi()
      const res = await chainApi.doGetGeneric(`accounts/${address}/verification`)

      return {
        address,
        owner: res.ownerAddress,
        verified: res.isVerified,
      }
    } catch (error) {
      return null
    }
  }

  async getVerificationInfo(address: string): Promise<WarpContractVerification | null> {
    try {
      const chainApi = this.getConfiguredChainApi()
      const res = await chainApi.doGetGeneric(`accounts/${address}/verification`)

      return {
        codeHash: res.codeHash,
        abi: JSON.parse(res.abi),
      }
    } catch (error) {
      return null
    }
  }

  private getConfiguredChainApi(): ApiNetworkProvider {
    if (!this.config.chainApiUrl) throw new Error('WarpContract: Chain API URL not set')
    return new ApiNetworkProvider(this.config.chainApiUrl, { timeout: 30000 })
  }
}
