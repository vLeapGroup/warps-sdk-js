import { SuiClient } from '@mysten/sui/client'

// TODO: Implement WarpSuiRegistry for SUI registry logic

export class WarpSuiRegistry {
  private readonly client: SuiClient

  constructor(url: string) {
    this.client = new SuiClient({ url })
  }

  async getRegistryObject(objectId: string) {
    // Fetch the registry object from SUI
    return this.client.getObject({ id: objectId, options: { showContent: true } })
  }
}
