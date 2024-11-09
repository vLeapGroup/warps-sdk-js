import { Transaction } from '@multiversx/sdk-core/out'
import { WarpAction, WarpConfig } from './types'

export class WarpActionExecutor {
  constructor(private config: WarpConfig) {
    this.config = config
  }

  execute(action: WarpAction): Transaction {
    throw new Error('not implemented')
  }
}
