# @vleap/warps-wallet-coinbase

Coinbase Server Wallet v2 provider for Warps SDK. This package enables you to use Coinbase Server Wallet v2 with the Warps SDK for EVM and Solana blockchains.

## Installation

```bash
npm install @vleap/warps-wallet-coinbase
```

## Prerequisites

- `@vleap/warps` core package installed
- Coinbase Developer Platform account with Server Wallet v2 access
- Wallet Secret from Coinbase CDP Portal

## Features

- **Secure Key Management**: Private keys are secured in Coinbase's Trusted Execution Environment (TEE)
- **Multi-Network Support**: Supports multiple EVM networks (Ethereum, Base, Polygon, Arbitrum, Optimism) and Solana
- **Account Management**: Create and manage accounts via Coinbase API
- **Transaction Signing**: Sign transactions securely using Coinbase Server Wallet API
- **Message Signing**: Sign messages for authentication and verification

## Usage

### Basic Setup

```typescript
import { WarpClient } from '@vleap/warps'
import { getAllEvmAdapters } from '@vleap/warps-adapter-evm'
import { createCoinbaseWalletProvider } from '@vleap/warps-wallet-coinbase'

const config = {
  env: 'testnet',
  user: {
    wallets: {
      ethereum: {
        provider: 'coinbase',
        address: '0x...', // Your Coinbase account address
      },
    },
  },
  walletProviders: {
    ethereum: {
      coinbase: createCoinbaseWalletProvider({
        walletSecret: process.env.COINBASE_WALLET_SECRET,
      }),
    },
    base: {
      coinbase: createCoinbaseWalletProvider({
        walletSecret: process.env.COINBASE_WALLET_SECRET,
      }),
    },
  },
}

const client = new WarpClient(config, {
  chains: getAllEvmAdapters(),
})
```

### Creating a Coinbase Account

Accounts must be created via the Coinbase API first. You can use the Coinbase CDP SDK or REST API:

```typescript
// Example using Coinbase API (outside of this package)
const account = await coinbaseApi.createAccount({
  networkId: 'ethereum-sepolia',
})
// Then use account.id as externalId in wallet config
```

### Configuration Options

```typescript
type CoinbaseProviderConfig = {
  walletSecret: string // Required: Your Coinbase Wallet Secret
  apiUrl?: string // Optional: Custom API URL (default: https://api.cdp.coinbase.com)
  networkId?: string // Optional: Override network ID mapping
}
```

### Supported Networks

The provider automatically maps chain names and environments to Coinbase network IDs:

- **Ethereum**: `ethereum-mainnet`, `ethereum-sepolia`
- **Base**: `base-mainnet`, `base-sepolia`
- **Polygon**: `polygon-mainnet`, `polygon-amoy`
- **Arbitrum**: `arbitrum-mainnet`, `arbitrum-sepolia`
- **Optimism**: `optimism-mainnet`, `optimism-sepolia`
- **Solana**: `solana-mainnet`, `solana-devnet`

You can override the network ID by providing it in the config.

## API

### `CoinbaseWalletProvider`

Implements the `WalletProvider` interface from `@vleap/warps`.

**Methods:**

- `getAddress(): Promise<string | null>` - Get the wallet address from Coinbase account
- `getPublicKey(): Promise<string | null>` - Get the public key from Coinbase account
- `signTransaction(tx: any): Promise<any>` - Sign a transaction using Coinbase API
- `signMessage(message: string): Promise<string>` - Sign a message using Coinbase API
- `create(mnemonic: string): Promise<WarpWalletDetails>` - Not supported (throws error)
- `generate(): Promise<WarpWalletDetails>` - Create a new Coinbase account asynchronously

### `createCoinbaseWalletProvider`

Factory function to create a Coinbase wallet provider factory.

```typescript
const providerFactory = createCoinbaseWalletProvider({
  walletSecret: 'your-wallet-secret',
})
```

## Security

- **Wallet Secret**: Never commit your Wallet Secret to version control. Use environment variables or secure secret management.
- **Private Keys**: Private keys are never exposed - they remain secure in Coinbase's TEE.
- **API Authentication**: All API calls are authenticated using the Wallet Secret in the Authorization header.

## Error Handling

The provider includes comprehensive error handling:

- Missing Wallet Secret
- Invalid account IDs
- API request failures
- Network errors
- Transaction signing failures

All errors include descriptive messages to help with debugging.

## Limitations

- `create()` and `generate()` methods are not supported as account creation must be done via Coinbase API first
- Accounts must be created before use - the account ID (externalId) must be provided in wallet config
- Network ID mapping may not cover all chains - use explicit `networkId` in config for unsupported chains

## Examples

### Signing a Transaction

```typescript
const wallet = client.getWallet('ethereum')
const tx = {
  to: '0x...',
  value: '1000000000000000000',
  data: '0x',
  gasLimit: 21000,
  maxFeePerGas: 20000000000n,
  maxPriorityFeePerGas: 1000000000n,
  nonce: 0,
  chainId: 11155111,
}

const signedTx = await wallet.signTransaction(tx)
```

### Signing a Message

```typescript
const wallet = client.getWallet('ethereum')
const message = 'Hello, World!'
const signature = await wallet.signMessage(message)
```

## Resources

- [Coinbase Server Wallet v2 Documentation](https://docs.cdp.coinbase.com/server-wallets/v2/introduction/welcome)
- [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
