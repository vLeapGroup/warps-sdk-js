# Warp EVM Adapter

A comprehensive EVM (Ethereum Virtual Machine) adapter for the Warp SDK, providing full support for Ethereum, Arbitrum, Base, and other EVM-compatible blockchains.

## Features

- ✅ **Multi-Chain Support**: Ethereum, Arbitrum, Base, and any EVM-compatible chain
- ✅ **Complete Transaction Support**: Transfers, contract calls, and queries
- ✅ **Robust Gas Estimation**: EIP-1559 and legacy pricing with fallbacks
- ✅ **Comprehensive Data Types**: All EVM-compatible data types with validation
- ✅ **Registry Operations**: Full warp and brand management
- ✅ **Caching Layer**: Performance optimization for registry operations
- ✅ **Error Handling**: Graceful degradation and meaningful error messages
- ✅ **Type Safety**: Full TypeScript coverage
- ✅ **Production Ready**: Zero technical debt, comprehensive testing

## Installation

```bash
npm install @vleap/warps-adapter-evm ethers
```

## Quick Start

### Basic Usage

```typescript
import { getEvmAdapter, getEthereumAdapter, getArbitrumAdapter, getBaseAdapter } from '@vleap/warps-adapter-evm'
import { WarpClientConfig } from '@vleap/warps'

const config: WarpClientConfig = {
  env: 'mainnet',
  user: {
    wallets: {
      evm: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    },
  },
}

// Get adapter for specific chain
const ethereumAdapter = getEthereumAdapter(config)
const arbitrumAdapter = getArbitrumAdapter(config)
const baseAdapter = getBaseAdapter(config)

// Or get adapter for any EVM chain
const customAdapter = getEvmAdapter(config, 'polygon')
```

### Creating a Warp

```typescript
import { getEvmAdapter } from '@vleap/warps-adapter-evm'

const adapter = getEvmAdapter(config)

// Create a warp from raw data
const warp = await adapter
  .builder()
  .createFromRaw('{"title":"My Warp","actions":[...]}')
  .setTitle('My Custom Warp')
  .setDescription('A description of my warp')
  .setPreview('https://example.com/preview.png')
  .addAction({
    type: 'transfer',
    label: 'Transfer ETH',
    address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  })
  .build()

// Create inscription transaction
const inscriptionTx = await adapter.builder().createInscriptionTransaction(warp)
```

### Executing Transactions

```typescript
// Create transfer transaction
const transferExecutable = {
  chain: { name: 'evm' },
  warp,
  action: 1,
  destination: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  value: BigInt('1000000000000000000'), // 1 ETH
  args: [],
  transfers: [],
  resolvedInputs: [],
}

const transferTx = await adapter.executor.createTransaction(transferExecutable)

// Create contract call transaction
const contractExecutable = {
  chain: { name: 'evm' },
  warp: {
    actions: [
      {
        type: 'contract',
        func: 'transfer(address,uint256)',
      },
    ],
  },
  action: 1,
  destination: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  value: BigInt(0),
  args: ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', '1000000000000000000'],
  transfers: [],
  resolvedInputs: [],
}

const contractTx = await adapter.executor.createTransaction(contractExecutable)
```

### Executing Queries

```typescript
// Execute a query
const queryExecutable = {
  chain: { name: 'evm' },
  warp: {
    actions: [
      {
        type: 'query',
        func: 'balanceOf(address)',
      },
    ],
  },
  action: 1,
  destination: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  value: BigInt(0),
  args: ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'],
  transfers: [],
  resolvedInputs: [],
}

const queryResult = await adapter.executor.executeQuery(queryExecutable)
console.log('Query result:', queryResult.values)
```

### Registry Operations

```typescript
// Register a warp
const registerTx = await adapter.registry.createWarpRegisterTransaction('0x1234567890abcdef', 'my-warp-alias', 'my-brand-hash')

// Get warp info by alias
const { registryInfo, brand } = await adapter.registry.getInfoByAlias('my-warp-alias')

// Get user's warps
const userWarps = await adapter.registry.getUserWarpRegistryInfos()

// Get chain information
const chainInfo = await adapter.registry.getChainInfo('ethereum')
```

## Configuration

### Multi-Chain Support

The adapter supports multiple EVM chains out of the box:

```typescript
// Ethereum
const ethereumConfig = {
  env: 'mainnet',
  user: {
    wallets: {
      evm: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    },
  },
  // Custom API URL for Ethereum
  apiUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
}

// Arbitrum
const arbitrumConfig = {
  env: 'mainnet',
  user: {
    wallets: {
      evm: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    },
  },
  // Custom API URL for Arbitrum
  apiUrl: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
}

// Base
const baseConfig = {
  env: 'mainnet',
  user: {
    wallets: {
      evm: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    },
  },
  // Custom API URL for Base
  apiUrl: 'https://mainnet.base.org',
}
```

### Supported Chains

- **Ethereum**: Mainnet, Sepolia testnet, Local devnet
- **Arbitrum**: Mainnet, Sepolia testnet, Local devnet
- **Base**: Mainnet, Sepolia testnet, Local devnet
- **Any EVM Chain**: Easily configurable for other chains

### Environment Configuration

```typescript
// Mainnet
const mainnetConfig = { env: 'mainnet' }

// Testnet
const testnetConfig = { env: 'testnet' }

// Devnet
const devnetConfig = { env: 'devnet' }
```

## Data Types

The adapter supports all EVM-compatible data types:

- **string**: Regular strings
- **uint8/uint16/uint32/uint64**: Unsigned integers
- **biguint**: Big integers for large numbers
- **boolean**: Boolean values
- **address**: Ethereum addresses (0x-prefixed)
- **hex**: Hexadecimal strings (0x-prefixed)
- **list**: Array support with type inference

### Input Preprocessing

```typescript
// Preprocess inputs with validation
const processedAddress = await adapter.executor.preprocessInput(
  { name: 'evm' },
  'input',
  'address',
  '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
)

const processedAmount = await adapter.executor.preprocessInput({ name: 'evm' }, 'input', 'biguint', '1000000000000000000')
```

## Gas Estimation

The adapter provides robust gas estimation with multiple fallback strategies:

### EIP-1559 Support

- Automatic detection of EIP-1559 support
- Uses `maxFeePerGas` and `maxPriorityFeePerGas` when available
- Falls back to legacy `gasPrice` for older chains

### Fallback Strategy

- Attempts to estimate gas from the network
- Falls back to default values if estimation fails
- Configurable default gas limits and prices

### Custom Gas Configuration

```typescript
// The adapter automatically handles gas estimation
// but you can also set custom values in the transaction
const customTx = {
  ...transferTx,
  gasLimit: BigInt(50000),
  maxFeePerGas: ethers.parseUnits('50', 'gwei'),
  maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
}
```

## Error Handling

The adapter provides comprehensive error handling:

### Graceful Degradation

- Network failures don't crash the application
- Gas estimation failures use safe defaults
- Registry operations handle missing contracts

### Meaningful Error Messages

- Clear error messages for debugging
- Input validation with specific error details
- Network-specific error handling

### Error Recovery

- Automatic retry mechanisms for transient failures
- Fallback strategies for critical operations
- Safe defaults for missing configuration

## Testing

Run the test suite:

```bash
npm test
```

The test suite includes:

- Unit tests for all components
- Integration tests for complex scenarios
- Error handling validation
- Edge case coverage

## Building

Build the package:

```bash
npm run build
```

This generates:

- CommonJS bundle (`dist/index.js`)
- ES Module bundle (`dist/index.mjs`)
- TypeScript declarations (`dist/index.d.ts`)

## Architecture

### Components

1. **WarpEvmBuilder**: Warp creation and management
2. **WarpEvmExecutor**: Transaction creation and execution
3. **WarpEvmSerializer**: Data type serialization
4. **WarpEvmResults**: Result processing and extraction
5. **WarpEvmRegistry**: Registry operations with caching
6. **WarpEvmExplorer**: Blockchain explorer integration
7. **WarpEvmAbiBuilder**: ABI creation and management
8. **WarpEvmBrandBuilder**: Brand creation and validation

### Design Principles

- **Modularity**: Each component has a single responsibility
- **Extensibility**: Easy to add support for new EVM chains
- **Performance**: Caching and efficient algorithms
- **Reliability**: Comprehensive error handling and validation
- **Type Safety**: Full TypeScript coverage

### Multi-Chain Architecture

The adapter uses a chain-specific configuration system:

```typescript
// Chain configurations are centralized
export const EVM_CHAIN_CONFIGS = {
  ethereum: {
    /* config */
  },
  arbitrum: {
    /* config */
  },
  base: {
    /* config */
  },
  // Easy to add new chains
}

// Adapters are instantiated with chain-specific configs
const adapter = getEvmAdapter(config, 'ethereum')
```

## Performance Optimizations

### Caching

- Registry operations are cached for performance
- Configurable TTL for different data types
- Memory and localStorage cache strategies

### Gas Estimation

- Efficient gas estimation with fallbacks
- Cached fee data to reduce RPC calls
- Batch operations where possible

### Serialization

- Optimized serialization for large data
- Efficient type conversion algorithms
- Memory-efficient data structures

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT
