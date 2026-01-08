import { WarpChainEnv } from '@joai/warps'

export const getGaupaApiUrl = (env: WarpChainEnv): string => {
  if (env === 'devnet') return 'https://devnet-login.gaupa.xyz/api'
  return 'https://login.gaupa.xyz/api'
}
