import { WarpChainName } from '../constants'
import { WarpClientConfig } from './config'
import { WarpChainInfo } from './warp'

export type InterpolationBag = {
  config: WarpClientConfig
  chain: WarpChainName
  chainInfo: WarpChainInfo
}
