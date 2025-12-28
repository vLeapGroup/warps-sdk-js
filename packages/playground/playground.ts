import { ChainAdapter, WarpClient, WarpClientConfig, WarpWalletDetails, withAdapterFallback } from '@vleap/warps'
import { getAllEvmAdapters } from '@vleap/warps-adapter-evm'
import { FastsetAdapter } from '@vleap/warps-adapter-fastset'
import { getAllMultiversxAdapters, MultiversxAdapter } from '@vleap/warps-adapter-multiversx'
import { NearAdapter } from '@vleap/warps-adapter-near'
import { SuiAdapter } from '@vleap/warps-adapter-sui'
import { createNodeTransformRunner } from '@vleap/warps-vm-node'
import { createCoinbaseWalletProvider } from '@vleap/warps-wallet-coinbase'
import { createGaupaWalletProvider } from '@vleap/warps-wallet-gaupa'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dotenv = await import('dotenv')
dotenv.config({ path: path.join(__dirname, '.env') })

const Chain = 'base'
const WarpToTest = 'transfer.json'
const TransferReceiver = '0xF752D09aA6b5E525bFbFb14c0FECec444EE82306'
const WarpInputs: string[] = [Chain, TransferReceiver, 'ETH|0.001']
const warpsDir = path.join(__dirname, 'warps')

const ensureCoinbaseWallet = async (
  config: WarpClientConfig,
  chain: string,
  chainInfo: ChainAdapter['chainInfo']
): Promise<WarpWalletDetails> => {
  const walletPath = path.join(__dirname, 'wallets', `${chain}.json`)

  if (fs.existsSync(walletPath)) {
    const existingWallet = JSON.parse(fs.readFileSync(walletPath, 'utf-8'))
    if (existingWallet.provider === 'coinbase' && existingWallet.address) {
      console.log(`✅ Reusing existing Coinbase wallet: ${existingWallet.address}`)
      return existingWallet
    }
  }

  console.log('🔄 Creating new Coinbase wallet...')
  const walletProviderFactory = config.walletProviders?.[chain as string]?.coinbase
  if (!walletProviderFactory) {
    throw new Error(`Coinbase wallet provider not configured for chain: ${chain}`)
  }

  const walletProvider = walletProviderFactory(config, chainInfo)
  if (!walletProvider) {
    throw new Error(`Failed to create Coinbase wallet provider for chain: ${chain}`)
  }

  const walletDetails = await walletProvider.generate()

  fs.writeFileSync(walletPath, JSON.stringify(walletDetails, null, 2))
  console.log(`✅ Created and saved Coinbase wallet: ${walletDetails.address}`)

  return walletDetails
}

const runWarp = async (warpFile: string) => {
  const warpPath = path.join(warpsDir, warpFile)
  if (!warpFile.endsWith('.json')) return
  const warpRaw = fs.readFileSync(warpPath, 'utf-8')

  const allWallets = await loadAllWallets()
  const filteredWallets: Record<string, any> = {}
  for (const [chain, wallet] of Object.entries(allWallets)) {
    if (wallet && wallet.provider) {
      filteredWallets[chain] = wallet
    }
  }
  console.log('🔑 All wallets loaded:', Object.keys(filteredWallets))

  const config: WarpClientConfig = {
    env: 'devnet',
    currentUrl: 'https://usewarp.to',
    user: {
      wallets: {
        ...filteredWallets,
      },
    },
    walletProviders: {
      multiversx: {
        gaupa: createGaupaWalletProvider({ apiKey: 'demo-api-key' }),
      },
      ethereum: {
        coinbase: createCoinbaseWalletProvider({
          apiKeyId: process.env.COINBASE_API_KEY_ID,
          apiKeySecret: process.env.COINBASE_API_KEY_SECRET,
          walletSecret: process.env.COINBASE_WALLET_SECRET,
        }),
      },
      base: {
        coinbase: createCoinbaseWalletProvider({
          apiKeyId: process.env.COINBASE_API_KEY_ID,
          apiKeySecret: process.env.COINBASE_API_KEY_SECRET,
          walletSecret: process.env.COINBASE_WALLET_SECRET,
        }),
      },
    },
    transform: { runner: createNodeTransformRunner() },
  }

  const client = new WarpClient(config, {
    chains: [
      ...getAllMultiversxAdapters(),
      ...getAllEvmAdapters(MultiversxAdapter),
      withAdapterFallback(SuiAdapter, MultiversxAdapter),
      withAdapterFallback(NearAdapter, MultiversxAdapter),
      withAdapterFallback(FastsetAdapter, MultiversxAdapter),
    ],
  })

  const chainAdapter = client.chains.find((a) => a.chainInfo.name.toLowerCase() === Chain.toLowerCase())
  if (!chainAdapter) {
    throw new Error(`Chain adapter not found for: ${Chain}`)
  }

  const coinbaseWallet = await ensureCoinbaseWallet(config, Chain, chainAdapter.chainInfo)
  config.user!.wallets![Chain as string] = coinbaseWallet

  console.log(`💰 Wallet address: ${coinbaseWallet.address}`)
  console.log(`📝 Please fund this wallet on Base Sepolia before continuing...`)
  console.log(`   You can use a faucet or send ETH to: ${coinbaseWallet.address}`)
  console.log(`   Waiting 10 seconds before proceeding...`)
  await new Promise((resolve) => setTimeout(resolve, 10000))

  const address = client.getWallet(Chain).getAddress()
  const dataLoader = client.getDataLoader(Chain)
  const accountAssets = await dataLoader.getAccountAssets(address)

  console.log('📊 Account assets:', accountAssets)

  const warp = await client.createBuilder(Chain).createFromRaw(warpRaw, false)
  warp.chain = Chain

  const {
    txs,
    chain: executedChain,
    evaluateOutput,
    resolvedInputs,
  } = await client.executeWarp(warp, WarpInputs, {
    onActionExecuted: (result) => console.log('✅ Single action executed:', result),
    onExecuted: (result) => console.log('✅ Warp executed:', result),
    onError: (result) => console.log('❌ Error:', result),
  })

  console.log('📋 Resolved inputs:', resolvedInputs)

  const signedTxs = await client.getWallet(executedChain.name).signTransactions(txs)
  const hashes = await client.getWallet(executedChain.name).sendTransactions(signedTxs)

  console.log('📤 Transaction hashes:', hashes)

  const explorer = client.getExplorer(executedChain.name)
  const explorerUrl = explorer.getTransactionUrl(hashes[0])

  console.log('🔍 Transaction explorer URL:', explorerUrl)

  const remoteTxs = await client.getActions(executedChain.name, hashes, true)
  await evaluateOutput(remoteTxs)

  console.log('✅ Remote transactions:', remoteTxs)
  console.log(`\n🎉 Transfer completed! View on explorer: ${explorerUrl}`)
}

const listWarps = () => fs.readdirSync(warpsDir).filter((f) => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.json'))

const loadWallet = async (chain: string): Promise<any> => {
  const walletPath = path.join(__dirname, 'wallets', `${chain}.json`)
  const wallet = await fs.promises.readFile(walletPath, { encoding: 'utf8' })
  return JSON.parse(wallet)
}

const loadFile = async (chain: string): Promise<string | null> => {
  const filePath = path.join(__dirname, 'wallets', `${chain}.txt`)
  if (!fs.existsSync(filePath)) return null
  const file = await fs.promises.readFile(filePath, { encoding: 'utf8' })
  return file || null
}

const loadAllWallets = async (): Promise<Record<string, any>> => {
  const walletsDir = path.join(__dirname, 'wallets')
  const walletFiles = fs.readdirSync(walletsDir).filter((f) => f.endsWith('.json'))
  const wallets: Record<string, any> = {}

  for (const walletFile of walletFiles) {
    const chainName = walletFile.replace('.json', '')
    try {
      const walletData = await loadWallet(chainName)
      const privateKey = walletData.privateKey || (await loadFile(chainName))
      wallets[chainName] = { ...walletData, privateKey }
    } catch (error) {
      console.warn(`⚠️  Failed to load wallet for ${chainName}:`, error)
    }
  }

  return wallets
}

const warps = listWarps()
if (warps.length === 0) {
  console.log('No warps found in playground/warps.')
  process.exit(1)
}

const warpToRun = warps.find((w) => w === WarpToTest) || warps[0]

console.log(`🎯 Testing warp: ${warpToRun}`)

runWarp(warpToRun)
