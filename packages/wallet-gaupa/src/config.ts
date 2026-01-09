import { WarpChainEnv } from '@joai/warps'

export const getGaupaApiUrl = (env: WarpChainEnv): string => {
  if (env === 'devnet') return 'https://devnet-login.gaupa.xyz'
  if (env === 'testnet') return 'https://testnet-login.gaupa.xyz'
  return 'https://login.gaupa.xyz'
}
