import { ChainAdapter, ChainAdapterFactory, WarpClientConfig } from '../types'

export const withAdapter = (factory: ChainAdapterFactory, fallbackFactory: ChainAdapterFactory): ChainAdapterFactory => {
  return (config: WarpClientConfig, fallback?: ChainAdapter) => {
    const fallbackAdapter = fallbackFactory(config, fallback)
    return factory(config, fallbackAdapter)
  }
}
