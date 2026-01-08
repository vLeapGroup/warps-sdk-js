# @joai/warps-wallet-gaupa

Gaupa wallet provider for Warps SDK. This package enables you to use Gaupa agentic wallets with the Warps SDK.

## Installation

```bash
npm install @joai/warps-wallet-gaupa
```

## Prerequisites

- `@joai/warps` core package installed
- Appropriate chain adapter package(s) for your target blockchain(s)
- Gaupa API credentials (API key and public key)

## Usage

```typescript
import { createGaupaWalletProvider } from '@joai/warps-wallet-gaupa'
import { WarpClient } from '@joai/warps'
import { getAllChainAdapters } from '@joai/warps-adapter-<chain>'

const config = {
  env: 'devnet', // or 'mainnet'
  walletProviders: {
    <chain>: {
      gaupa: createGaupaWalletProvider({
        apiKey: 'your-api-key',
        publicKey: 'your-public-key',
      }),
    },
  },
}

const client = new WarpClient(config, {
  chains: getAllChainAdapters(),
})
```

## API

### `GaupaWalletProvider`

Implements the `WalletProvider` interface from `@joai/warps`.

**Methods:**

- `getAddress(): Promise<string | null>` - Get the wallet address from configuration
- `getPublicKey(): Promise<string | null>` - Derive public key from the wallet address
- `signTransaction(tx: Transaction): Promise<Transaction>` - Sign a transaction using the Gaupa API's `sign-agentic-message` endpoint. The transaction is serialized as JSON and signed as a message.
- `signMessage(message: string): Promise<string>` - Sign a message using the Gaupa API
- `generate(): Promise<WarpWalletDetails>` - Create a new agentic wallet via the Gaupa API

**Unsupported Methods:**

- `importFromMnemonic()` - Not supported. Use `generate()` to create wallets via Gaupa API.
- `importFromPrivateKey()` - Not supported. Use `generate()` to create wallets via Gaupa API.
- `export()` - Not supported. Private keys are managed by Gaupa and cannot be exported.

## How It Works

1. **API Configuration**: The API URL is automatically configured based on the environment:
   - `devnet`: `https://devnet-login.gaupa.xyz/api`
   - `mainnet` or other: `https://login.gaupa.xyz/api`

2. **Wallet Creation**: Use `generate()` to create a new agentic wallet via the Gaupa API. The wallet address is stored in your Warps configuration.

3. **Transaction Signing**: When signing a transaction, the provider:
   - Serializes the transaction data as JSON
   - Calls the Gaupa API's `sign-agentic-message` endpoint with the serialized transaction
   - Converts the returned hex signature to a `Uint8Array` and applies it to the transaction

4. **Message Signing**: Messages are signed directly via the `sign-agentic-message` endpoint.

## Configuration

The wallet configuration is stored in your Warps config under `user.wallets.<chain>`:

```json
{
  "provider": "gaupa",
  "address": "erd1..."
}
```

The address is set automatically when you call `generate()` or can be configured manually.
