# @vleap/warps-wallet-gaupa

Gaupa wallet provider for Warps SDK. This package enables you to use Gaupa wallets with the Warps SDK, primarily for MultiversX blockchain.

**Note: This package is currently a placeholder. Gaupa is in private beta and the implementation is pending.**

## Installation

```bash
npm install @vleap/warps-wallet-gaupa
```

## Prerequisites

- `@vleap/warps` core package installed
- `@multiversx/sdk-core` (for MultiversX transaction types)
- Gaupa SDK (when available)

## Status

⚠️ **Implementation Pending**: Gaupa is currently in private beta. This package provides the interface structure but methods will throw errors until the actual Gaupa SDK is integrated.

## Usage

Once the Gaupa SDK is available, usage will be:

```typescript
import { GaupaWalletProvider } from '@vleap/warps-wallet-gaupa'
import { WarpClient } from '@vleap/warps'
import { getAllMultiversxAdapters } from '@vleap/warps-adapter-multiversx'

const config = {
  env: 'mainnet',
  walletProviders: {
    multiversx: {
      gaupa: () => {
        return new GaupaWalletProvider({
          config: {
            // TODO: Gaupa SDK configuration
            // Will be defined once SDK is available
          },
        })
      },
    },
  },
}

const client = new WarpClient(config, {
  chains: getAllMultiversxAdapters(),
})
```

## API

### `GaupaWalletProvider`

Implements the `WalletProvider` interface from `@vleap/warps`.

**Constructor:**

```typescript
new GaupaWalletProvider(config: GaupaWalletProviderConfig)
```

**Parameters:**

- `config.config`: Optional configuration object passed to the Gaupa SDK initialization

**Methods:**

- `getAddress(): Promise<string | null>` - Get the wallet address from Gaupa
- `getPublicKey(): Promise<string | null>` - Get the public key from Gaupa
- `signTransaction(tx: Transaction): Promise<Transaction>` - Sign a MultiversX transaction
- `signMessage(message: string): Promise<string>` - Sign a message

## Supported Chains

Currently optimized for:

- **MultiversX**

The provider uses MultiversX `Transaction` types from `@multiversx/sdk-core` for type safety.

## Implementation Status

All methods currently throw errors indicating that implementation is pending:

- `getAddress()` - TODO: Implement using Gaupa SDK
- `getPublicKey()` - TODO: Implement using Gaupa SDK
- `signTransaction()` - TODO: Implement using Gaupa SDK
- `signMessage()` - TODO: Implement using Gaupa SDK

## TODO

Once Gaupa SDK is available, implement:

1. **SDK Initialization**: Initialize Gaupa client with configuration
2. **getAddress()**: Retrieve wallet address from Gaupa
3. **getPublicKey()**: Retrieve public key from Gaupa
4. **signTransaction()**: Sign MultiversX transactions using Gaupa
   - Handle signature format conversion (hex string to Uint8Array)
   - Apply signature to transaction object
5. **signMessage()**: Sign messages using Gaupa

The implementation should follow the actual Gaupa SDK API once it becomes available.
