import { WarpBrand } from '../types/brand'
import { WarpChainAsset } from '../types/chain'
import { WarpClientConfig } from '../types/config'
import { WarpChainInfo } from '../types/warp'

export const getWarpBrandLogoUrl = (brand: WarpBrand, config?: WarpClientConfig): string => {
  const theme = config?.preferences?.theme ?? 'light'
  if (typeof brand.logo === 'string') return brand.logo
  return brand.logo[theme]
}

export const getWarpChainAssetLogoUrl = (asset: WarpChainAsset, config?: WarpClientConfig): string | null => {
  if (!asset.logoUrl) return null
  if (typeof asset.logoUrl === 'string') return asset.logoUrl
  const theme = config?.preferences?.theme ?? 'light'
  return asset.logoUrl[theme]
}

export const getWarpChainInfoLogoUrl = (chainInfo: WarpChainInfo, config?: WarpClientConfig): string => {
  if (typeof chainInfo.logoUrl === 'string') return chainInfo.logoUrl
  const theme = config?.preferences?.theme ?? 'light'
  return chainInfo.logoUrl[theme]
}
