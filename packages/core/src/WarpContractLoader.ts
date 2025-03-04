import { WarpConfig, WarpContract, WarpContractVerification } from './types'
import { WarpUtils } from './WarpUtils'

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
      console.error('WarpContractLoader: getContract error', error)
      return null
    }
  }

  async getVerificationInfo(address: string): Promise<WarpContractVerification | null> {
    try {
      const chainApi = WarpUtils.getConfiguredChainApi(this.config)
      const res = await chainApi.doGetGeneric(`accounts/${address}/verification`)

      return {
        codeHash: res.codeHash,
        abi: res.source.abi,
      }
    } catch (error) {
      console.error('WarpContractLoader: getVerificationInfo error', error)
      return null
    }
  }
}
