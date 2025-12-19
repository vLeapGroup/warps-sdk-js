# @vleap/warps-wallet-privy

Privy wallet provider for Warps SDK. This package enables you to use Privy wallets with the Warps SDK across multiple blockchain networks. **Designed for Node.js environments** - no React dependencies required.

## Installation

```bash
npm install @vleap/warps-wallet-privy
```

## Prerequisites

- `@vleap/warps` core package installed
- Privy SDK installed and configured (`@privy-io/server-sdk` for Node.js)

## Usage

### Node.js Usage

Use Privy's server SDK to create a client:

```typescript
import { PrivyClient } from '@privy-io/server-sdk'
import { PrivyWalletProvider } from '@vleap/warps-wallet-privy'
import { WarpClient } from '@vleap/warps'
import { getEvmAdapter } from '@vleap/warps-adapter-evm'

const privyServerClient = new PrivyClient(process.env.PRIVY_APP_ID, process.env.PRIVY_APP_SECRET)

const privyClient = {
  getAddress: async () => {
    const user = await privyServerClient.getUser(userId)
    return user.wallet?.address || null
  },
  signTransaction: async (tx: any) => {
    return await privyServerClient.signTransaction(userId, tx)
  },
  signMessage: async (message: string) => {
    return await privyServerClient.signMessage(userId, message)
  },
}

const config = {
  env: 'mainnet',
  walletProviders: {
    ethereum: () => new PrivyWalletProvider({ privyClient }),
  },
}

const client = new WarpClient(config, [getEvmAdapter(config)])

// Use the client as normal
const wallet = client.getWallet('ethereum')
const address = await wallet.getAddress()
```

### Browser/React Usage (Optional)

If you're using Privy in a React application, you can create a client adapter:

```typescript
import { PrivyWalletProvider } from '@vleap/warps-wallet-privy'
import { WarpClient } from '@vleap/warps'
import { getEvmAdapter } from '@vleap/warps-adapter-evm'

// Create a Privy client adapter from your React Privy instance
const privyClient = {
  getAddress: async () => {
    // Get address from your Privy instance
    return privyInstance.user?.wallet?.address || null
  },
  signTransaction: async (tx: any) => {
    // Sign transaction using your Privy instance
    return await privyInstance.user?.wallet?.signTransaction(tx)
  },
  signMessage: async (message: string) => {
    // Sign message using your Privy instance
    return await privyInstance.user?.wallet?.signMessage(message)
  },
}

const config = {
  env: 'mainnet',
  walletProviders: {
    ethereum: () => new PrivyWalletProvider({ privyClient }),
  },
}

const client = new WarpClient(config, [getEvmAdapter(config)])
```

### With Multiple Chains

The Privy wallet provider supports multiple chains. You can configure it for different chains:

```typescript
const privyClient = {
  getAddress: async () => /* ... */,
  signTransaction: async (tx: any) => /* ... */,
  signMessage: async (message: string) => /* ... */,
}

const config = {
  env: 'mainnet',
  walletProviders: {
    ethereum: () => new PrivyWalletProvider({ privyClient }),
    solana: () => new PrivyWalletProvider({ privyClient }),
  },
}

const client = new WarpClient(config, [
  getEvmAdapter(config),
  getSolanaAdapter(config),
])
```

## API

Implements the `WalletProvider` interface from `@vleap/warps`.

**Constructor:**
```typescript
new PrivyWalletProvider(config: PrivyWalletProviderConfig)
```

**Parameters:**
- `config.privyClient`: The Privy client interface
  - `getAddress(): Promise<string | null>` - Get the wallet address
  - `signTransaction(tx: any): Promise<string>` - Sign a transaction
  - `signMessage(message: string): Promise<string>` - Sign a message
- `config.address` (optional): Fallback address if client doesn't provide one

**Methods:**
- `getAddress(): Promise<string | null>` - Get the wallet address
- `getPublicKey(): Promise<string | null>` - Get the public key (returns null for Privy)
- `signTransaction(tx: any): Promise<any>` - Sign a transaction
- `signMessage(message: string): Promise<string>` - Sign a message

## Supported Chains

The Privy wallet provider works with any chain that Privy supports, including:
- Ethereum and EVM-compatible chains
- Solana
- And other chains supported by Privy

## Notes

- **Node.js-first design**: This package has no React dependencies and is designed to work in Node.js environments
- You need to provide a Privy client adapter that implements the `PrivyClient` interface
- Public key is not available through Privy, so `getPublicKey()` always returns `null`
- The client adapter should handle authentication and wallet availability checks
- For React applications, create a client adapter that wraps your Privy React hooks
