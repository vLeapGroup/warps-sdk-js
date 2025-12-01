import { WarpClient } from '@vleap/warps'
import { getAllEvmAdapters } from '@vleap/warps-adapter-evm'
import { getFastsetAdapter } from '@vleap/warps-adapter-fastset'
import { getAllMultiversxAdapters, getMultiversxAdapter } from '@vleap/warps-adapter-multiversx'
import { getSuiAdapter } from '@vleap/warps-adapter-sui'
import { createNodeTransformRunner } from '@vleap/warps-vm-node'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const Chain = 'ethereum'
const WarpToTest = 'omniset-deposit-ethereum.json'
const QueryItems = {
  token: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  amount: '100000',
  receiver: '0x5A92C4763dDAc3119a65f8882a53234C9988Efd9',
}
const WarpInputs: string[] = [
  'asset:ETH|0.002', // Asset input: USDC with amount 1 (will be converted to 1000000 with 6 decimals)
]

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const warpsDir = path.join(__dirname, 'warps')

const runWarp = async (warpFile: string) => {
  const warpPath = path.join(warpsDir, warpFile)
  if (!warpFile.endsWith('.json')) return
  const warpRaw = fs.readFileSync(warpPath, 'utf-8')
  const walletData = await loadWallet(Chain)
  const privateKey = walletData.privateKey || (await loadFile(Chain))

  console.log('🔑 Wallet data loaded:', { address: walletData?.address, privateKey })

  const config: any = {
    env: 'devnet',
    currentUrl: 'https://usewarp.to',
    user: { wallets: { [Chain]: { ...walletData, privateKey } } },
    transform: { runner: createNodeTransformRunner() },
  }

  const client = new WarpClient(config, [
    ...getAllMultiversxAdapters(config),
    ...getAllEvmAdapters(config, getMultiversxAdapter(config)),
    getSuiAdapter(config),
    getSolanaAdapter(config, getMultiversxAdapter(config)),
    getFastsetAdapter(config, getMultiversxAdapter(config)),
  ])

  const address = client.getWallet(Chain).getAddress()
  const dataLoader = client.getDataLoader(Chain)
  const accountAssets = await dataLoader.getAccountAssets(address)

  console.log('Account assets:', accountAssets)

  const warp = await client.createBuilder(Chain).createFromRaw(warpRaw, false)

  const { txs, chain, evaluateOutput, resolvedInputs } = await client.executeWarp(
    warp,
    WarpInputs,
    {
      onActionExecuted: (result) => console.log('Singe action executed:', result),
      onExecuted: (result) => console.log('Warp executed:', result),
      onError: (result) => console.log('Error:', result),
    },
    { queries: QueryItems }
  )

  console.log('Resolved inputs:', resolvedInputs)

  const signedTxs = await client.getWallet(chain.name).signTransactions(txs)
  const hashes = await client.getWallet(chain.name).sendTransactions(signedTxs)
  const remoteTxs = await client.getActions(chain.name, hashes, true)

  await evaluateOutput(remoteTxs)
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

const warps = listWarps()
if (warps.length === 0) {
  console.log('No warps found in playground/warps.')
  process.exit(1)
}

const warpToRun = warps.find((w) => w === WarpToTest) || warps[0]

console.log(`🎯 Testing warp: ${warpToRun}`)

runWarp(warpToRun)
