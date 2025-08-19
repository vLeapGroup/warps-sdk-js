# Warps Playground

A playground for testing and exploring the Warps SDK data loader functionality across different blockchains.

## Quick Start

### Available Commands

```bash
# Get complete account data (balance + tokens)
npm run fetchdata <chain> <address>

# Get account balance only
npm run fetchaccount <chain> <address>

# Get token assets only
npm run fetchtokens <chain> <address>
```

### Supported Chains

- `ethereum` - Ethereum Mainnet
- `arbitrum` - Arbitrum One
- `base` - Base Network
- `multiversx` - MultiversX (Elrond)
- `sui` - Sui Network
- `fastset` - Fastset Network

## Working Examples

### Get Complete Account Data

```bash
# Base Network (works great, shows tokens)
npm run fetchdata base 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

# MultiversX (works perfectly)
npm run fetchdata multiversx erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36

# Sui (works perfectly)
npm run fetchdata sui 0x0000000000000000000000000000000000000000000000000000000000000006

# Fastset (works perfectly)
npm run fetchdata fastset 0x0000000000000000000000000000000000000000

# Ethereum (rate limited, but works when available)
npm run fetchdata ethereum 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

# Arbitrum (rate limited, but works when available)
npm run fetchdata arbitrum 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

### Get Account Balance Only

```bash
# Base Network (shows formatted balance)
npm run fetchaccount base 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

# MultiversX
npm run fetchaccount multiversx erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36

# Sui
npm run fetchaccount sui 0x0000000000000000000000000000000000000000000000000000000000000006
```

### Get Token Assets Only

```bash
# Base Network (shows tokens with formatted amounts)
npm run fetchtokens base 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

# MultiversX
npm run fetchtokens multiversx erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36

# Sui
npm run fetchtokens sui 0x0000000000000000000000000000000000000000000000000000000000000006
```

## Output Examples

### Account Data Output

```
🔍 Fetching data for ethereum address: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
============================================================
✅ Using adapter: Ethereum Mainnet

📊 Account Information:
------------------------------
Address: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
Balance: 4788681392650745692 ETH
Formatted: 4.788681 ETH

🪙 Token Assets:
------------------------------
Found 3 token(s):

1. USD Coin
   Amount: 21294407780
   Decimals: 6
   Identifier: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
   Formatted: 21294.407780
   Logo: https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png

2. Tether USD
   Amount: 259696962
   Decimals: 6
   Identifier: 0xdAC17F958D2ee523a2206206994597C13D831ec7
   Formatted: 259.696962
   Logo: https://assets.coingecko.com/coins/images/325/small/Tether.png

✅ Data fetch completed successfully!
```

## Features

- **Unified Interface**: All chains use the same API regardless of underlying implementation
- **Human-Readable Output**: Balances are formatted for easy reading
- **Token Detection**: Automatically detects and fetches token metadata
- **Error Handling**: Clear error messages for invalid addresses or network issues
- **Help System**: Built-in help with `--help` or `-h` flags

## Testing

The scripts are ready to use! Here are some working examples you can copy-paste:

### Quick Test Commands

```bash
# Test Base Network (best results with tokens)
npm run fetchdata base 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

# Test MultiversX
npm run fetchdata multiversx erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36

# Test Sui
npm run fetchdata sui 0x0000000000000000000000000000000000000000000000000000000000000006

# Test Fastset
npm run fetchdata fastset 0x0000000000000000000000000000000000000000
```

## Notes

- **Rate Limiting**: Ethereum and Arbitrum APIs are rate limited. Base, MultiversX, Sui, and Fastset work reliably.
- **Address Format**: Make sure to use the correct address format for each chain:
  - EVM chains: `0x...` (checksummed addresses recommended)
  - MultiversX: `erd1...` (bech32 format)
  - Sui: `0x...` (64-character hex)
- **Best Results**: Base Network provides the best token detection results with the example address.
- **Token Detection**: Token detection works best with addresses that have recent activity.

## Development

The playground scripts demonstrate how to use the Warps SDK data loader functionality. Each script shows:

1. How to initialize adapters
2. How to configure the WarpClient
3. How to fetch account and token data
4. How to handle errors and display results

This makes it easy to understand how to integrate the SDK into your own applications.
