import { WarpChain, WarpChainName } from '@vleap/warps'

export const getAllEvmChainNames = (): WarpChain[] => [
  WarpChainName.Ethereum,
  WarpChainName.Base,
  WarpChainName.Arbitrum,
  WarpChainName.Somnia,
]
