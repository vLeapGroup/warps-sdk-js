# @vleap/warps-adapter-evm

EVM-compatible blockchain adapter for the Warps SDK. Supports Ethereum, Base, Polygon, Arbitrum, Optimism, and other EVM chains.

## Installation

```bash
npm install @vleap/warps-adapter-evm
```

## Usage

```typescript
import { WarpClient } from '@vleap/warps'
import { getAllEvmAdapters } from '@vleap/warps-adapter-evm'
import { MultiversxAdapter } from '@vleap/warps-adapter-multiversx'

// Use all EVM chains (requires a fallback adapter)
const client = new WarpClient(config, {
  chains: getAllEvmAdapters(MultiversxAdapter),
})
```

## Individual Chain Adapters

You can also import individual chain adapters:

```typescript
import { EthereumAdapter, BaseAdapter, PolygonAdapter } from '@vleap/warps-adapter-evm'
import { withAdapterFallback } from '@vleap/warps'
import { MultiversxAdapter } from '@vleap/warps-adapter-multiversx'

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
