import { WarpChainInfo, WarpContract, WarpContractVerification, WarpInitConfig, WarpLogger } from '@vleap/warps-core'
import { WarpMultiversxExecutor } from './WarpMultiversxExecutor'

export class WarpMultiversxContractLoader {
  constructor(private readonly config: WarpInitConfig) {}

  async getContract(address: string, chain: WarpChainInfo): Promise<WarpContract | null> {
    try {
      const chainEntry = WarpMultiversxExecutor.getChainEntrypoint(chain, this.config.env)
      const chainProvider = chainEntry.createNetworkProvider()
      const res = await chainProvider.doGetGeneric(`accounts/${address}`)

      return {
        address,
        owner: res.ownerAddress,
        verified: res.isVerified || false,
      }
    } catch (error) {
      WarpLogger.error('WarpContractLoader: getContract error', error)
      return null
    }
  }

  async getVerificationInfo(address: string, chain: WarpChainInfo): Promise<WarpContractVerification | null> {
    try {
      const chainEntry = WarpMultiversxExecutor.getChainEntrypoint(chain, this.config.env)
      const chainProvider = chainEntry.createNetworkProvider()
      const res = await chainProvider.doGetGeneric(`accounts/${address}/verification`)

      return {
        codeHash: res.codeHash,
        abi: res.source.abi,
      }
    } catch (error) {
      WarpLogger.error('WarpContractLoader: getVerificationInfo error', error)
      return null
    }
  }
}
