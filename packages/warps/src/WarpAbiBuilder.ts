import { WarpAbi } from '@vleap/warps-core'

export class WarpAbiBuilder {
  async createFromRaw(encoded: string): Promise<WarpAbi> {
    return JSON.parse(encoded) as WarpAbi
  }
}
