# @joai/warps-adapter-evm

EVM-compatible blockchain adapter for the Warps SDK. Supports Ethereum, Base, Polygon, Arbitrum, Optimism, and other EVM chains.

## Installation

```bash
npm install @joai/warps-adapter-evm
```

## Usage

```typescript
import { WarpClient } from '@joai/warps'
import { getAllEvmAdapters } from '@joai/warps-adapter-evm'
import { MultiversxAdapter } from '@joai/warps-adapter-multiversx'

// Use all EVM chains (requires a fallback adapter)
const client = new WarpClient(config, {
  chains: getAllEvmAdapters(MultiversxAdapter),
})
```

## Individual Chain Adapters

You can also import individual chain adapters:

```typescript
import { EthereumAdapter, BaseAdapter, PolygonAdapter } from '@joai/warps-adapter-evm'
import { withAdapterFallback } from '@joai/warps'
import { MultiversxAdapter } from '@joai/warps-adapter-multiversx'

const client = new WarpClient(config, {
  chains: [
    withAdapterFallback(EthereumAdapter, MultiversxAdapter),
    withAdapterFallback(BaseAdapter, MultiversxAdapter),
  ],
})
```

## Supported Chains

- **Ethereum** (mainnet, sepolia)
- **Base** (mainnet, sepolia)
- **Polygon** (mainnet, amoy)
- **Arbitrum** (mainnet, sepolia)
- **Optimism** (mainnet, sepolia)
- And other EVM-compatible networks

## Features

- Transaction creation and execution
- Smart contract interaction
- Token transfers
- Query contract state
- Transaction signing and broadcasting
- Explorer integration

## Wallet Providers

Supports multiple wallet providers:
- Private key
- Mnemonic
- Read-only (for queries)
