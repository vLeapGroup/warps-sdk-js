import { SuiClient } from '@mysten/sui/client'

export class WarpSuiAbi {
  private readonly client: SuiClient

  constructor(url: string) {
    this.client = new SuiClient({ url })
  }

  async getModuleAbi(packageId: string, moduleName: string) {
    // Fetch the normalized Move module ABI from SUI
    return this.client.getNormalizedMoveModule({ package: packageId, module: moduleName })
  }

  async getFunctionAbi(packageId: string, moduleName: string, functionName: string) {
    // Fetch the normalized Move function ABI from SUI
    return this.client.getNormalizedMoveFunction({ package: packageId, module: moduleName, function: functionName })
  }
}
