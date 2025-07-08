import { WarpSuiAbi } from './WarpSuiAbi'

export class WarpSuiContractLoader {
  private readonly abi: WarpSuiAbi

  constructor(url: string) {
    this.abi = new WarpSuiAbi(url)
  }

  async loadModuleAbi(packageId: string, moduleName: string) {
    return this.abi.getModuleAbi(packageId, moduleName)
  }

  async loadFunctionAbi(packageId: string, moduleName: string, functionName: string) {
    return this.abi.getFunctionAbi(packageId, moduleName, functionName)
  }
}
