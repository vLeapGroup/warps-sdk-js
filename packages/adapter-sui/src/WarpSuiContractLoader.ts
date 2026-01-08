import { WarpChainInfo, WarpClientConfig } from '@joai/warps'
import { WarpSuiAbiBuilder } from './WarpSuiAbiBuilder'

export class WarpSuiContractLoader {
  private readonly abi: WarpSuiAbiBuilder

  constructor(config: WarpClientConfig, chain: WarpChainInfo) {
    this.abi = new WarpSuiAbiBuilder(config, chain)
  }

  async loadModuleAbi(packageId: string, moduleName: string) {
    return this.abi.getModuleAbi(packageId, moduleName)
  }

  async loadFunctionAbi(packageId: string, moduleName: string, functionName: string) {
    return this.abi.getFunctionAbi(packageId, moduleName, functionName)
  }
}
