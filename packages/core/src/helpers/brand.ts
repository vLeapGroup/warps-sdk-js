import { WarpBrand } from '../types'

export const getWarpBrandLogoUrl = (brand: WarpBrand, preferences?: { scheme: 'light' | 'dark' }): string => {
  if (typeof brand.logo === 'string') return brand.logo
  return brand.logo[preferences?.scheme ?? 'light']
}
