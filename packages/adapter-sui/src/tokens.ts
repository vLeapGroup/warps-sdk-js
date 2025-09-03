export type KnownToken = {
  id: string
  name: string
  decimals: number
  logoUrl: string
}

export const KnownTokens: KnownToken[] = [
  { id: '0x2::sui::SUI', name: 'Sui', decimals: 9, logoUrl: 'https://assets.coingecko.com/coins/images/26375/small/sui-logo.png' },
  { id: '0xa198f3be41cda8c07c3bf1c4e0bb88b8e9827b7c063f36b1e6c3d6da1c4e8753::usdc::USDC', name: 'USD Coin', decimals: 6, logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png' },
  { id: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48ace0cdd97::usdt::USDT', name: 'Tether USD', decimals: 6, logoUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
  { id: '0xaf8cd5edc19c4512f4259f0bee101a7c94d8a5c0e7c90c7a7c8c8c8c8c8c8c8c8::wbtc::WBTC', name: 'Wrapped Bitcoin', decimals: 8, logoUrl: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png' },
  { id: '0xb8a6a9b7c7a6f4a3e2d1c0b9a8f7e6d5c4b3a2b1c0d9e8f7a6b5c4d3e2f1a0b::weth::WETH', name: 'Wrapped Ether', decimals: 8, logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png' },
  { id: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a15e0e9::ocean::OCEAN', name: 'Ocean Protocol', decimals: 9, logoUrl: 'https://assets.coingecko.com/coins/images/3687/small/ocean-protocol-logo.png' },
  { id: '0x5d1f47ea69bb0de31c313d7acf89b890dbb8991ea8e03c6c35569693fd50fb8b7::deep::DEEP', name: 'DeepBook', decimals: 6, logoUrl: 'https://assets.coingecko.com/coins/images/30169/small/deepbook.png' },
  { id: '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47ba3::hasui::HASUI', name: 'Haedal Staked SUI', decimals: 9, logoUrl: 'https://assets.coingecko.com/coins/images/30027/small/haSUI.png' },
  { id: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e935::usdc::USDC', name: 'USD Coin (Wormhole)', decimals: 6, logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png' },
]

export const findKnownTokenById = (id: string): KnownToken | null => KnownTokens.find((token) => token.id === id) || null
