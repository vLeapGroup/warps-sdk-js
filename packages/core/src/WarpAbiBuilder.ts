import { WarpAbi } from './types'

export class WarpAbiBuilder {
  async createFromRaw(encoded: string): Promise<WarpAbi> {
    return JSON.parse(encoded) as WarpAbi
  }
}
