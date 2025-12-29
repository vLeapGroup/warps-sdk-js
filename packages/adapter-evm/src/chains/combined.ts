import { WarpChainName } from '@vleap/warps'

export const getAllEvmChainNames = (): WarpChainName[] => [
  WarpChainName.Ethereum,
  WarpChainName.Base,
  WarpChainName.Arbitrum,
  WarpChainName.Somnia,
]
