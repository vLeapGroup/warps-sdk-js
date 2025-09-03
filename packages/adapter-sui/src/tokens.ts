import { WarpChain, WarpChainAsset, WarpChainName } from '@vleap/warps'

const SuiChain: WarpChain = WarpChainName.Sui

export const KnownTokens: WarpChainAsset[] = [
  {
    chain: SuiChain,
    identifier: '0x2::sui::SUI',
    name: 'Sui',
    symbol: 'SUI',
    decimals: 9,
    logoUrl: 'https://assets.coingecko.com/coins/images/26375/small/sui-logo.png',
  },
  {
    chain: SuiChain,
    identifier: '0xa198f3be41cda8c07c3bf1c4e0bb88b8e9827b7c063f36b1e6c3d6da1c4e8753::usdc::USDC',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
  {
    chain: SuiChain,
    identifier: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48ace0cdd97::usdt::USDT',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  },
  {
    chain: SuiChain,
    identifier: '0xaf8cd5edc19c4512f4259f0bee101a7c94d8a5c0e7c90c7a7c8c8c8c8c8c8c8c8::wbtc::WBTC',
    name: 'Wrapped Bitcoin',
    symbol: 'WBTC',
    decimals: 8,
    logoUrl: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
  },
  {
    chain: SuiChain,
    identifier: '0xb8a6a9b7c7a6f4a3e2d1c0b9a8f7e6d5c4b3a2b1c0d9e8f7a6b5c4d3e2f1a0b::weth::WETH',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 8,
    logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  {
    chain: SuiChain,
    identifier: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a15e0e9::ocean::OCEAN',
    name: 'Ocean Protocol',
    symbol: 'OCEAN',
    decimals: 9,
    logoUrl: 'https://assets.coingecko.com/coins/images/3687/small/ocean-protocol-logo.png',
  },
  {
    chain: SuiChain,
    identifier: '0x5d1f47ea69bb0de31c313d7acf89b890dbb8991ea8e03c6c35569693fd50fb8b7::deep::DEEP',
    name: 'DeepBook',
    symbol: 'DEEP',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/30169/small/deepbook.png',
  },
  {
    chain: SuiChain,
    identifier: '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47ba3::hasui::HASUI',
    name: 'Haedal Staked SUI',
    symbol: 'HASUI',
    decimals: 9,
    logoUrl: 'https://assets.coingecko.com/coins/images/30027/small/haSUI.png',
  },
  {
    chain: SuiChain,
    identifier: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e935::usdc::USDC',
    name: 'USD Coin (Wormhole)',
    symbol: 'USDC',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
]

export const findKnownTokenById = (id: string): WarpChainAsset | null => KnownTokens.find((token) => token.identifier === id) || null
