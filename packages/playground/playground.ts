import { WarpClient, WarpClientConfig } from '@vleap/warps'
import { getAllEvmAdapters } from '@vleap/warps-adapter-evm'
import { getFastsetAdapter } from '@vleap/warps-adapter-fastset'
import { getAllMultiversxAdapters, getMultiversxAdapter } from '@vleap/warps-adapter-multiversx'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const Chain = 'multiversx'
const WarpToTest = 'test.json'
const WarpInputs: string[] = ['address:erd1l5n8fd7hqezn0u8602h7euxmjnx32uulgxr3d5ruu72pp0qhnjgqgsvhde', 'asset:EGLD|0.5']

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const warpsDir = path.join(__dirname, 'warps')

const runWarp = async (warpFile: string) => {
  const warpPath = path.join(warpsDir, warpFile)
  if (!warpFile.endsWith('.json')) return
  const warpRaw = fs.readFileSync(warpPath, 'utf-8')
  const walletData = await loadWallet(Chain)
  const privateKey = await loadFile(Chain)

  console.log('🔑 Wallet data loaded:', { address: walletData?.address, hasPrivateKey: !!privateKey })

  if (!privateKey) {
    throw new Error('Private key not found in wallet file')
  }

  const config: WarpClientConfig = {
    env: 'devnet',
    currentUrl: 'https://usewarp.to',
    user: { wallets: { [Chain]: { ...walletData, privateKey } } },
  }

  const client = new WarpClient(config, [
    getSuiAdapter(config),
    ...getAllMultiversxAdapters(config),
    ...getAllEvmAdapters(config, getMultiversxAdapter(config)),
    getFastsetAdapter(config, getMultiversxAdapter(config)),
  ])

  const warp = await client.createBuilder(Chain).createFromRaw(warpRaw)

  const executor = client.createExecutor({
    onExecuted: (result) => {
      console.log('--------------------------------')
      console.log('Executed:', result)
      console.log('--------------------------------')
    },
    onError: (result) => {
      console.log('--------------------------------')
      console.log('Error:', result)
      console.log('--------------------------------')
    },
  })

  const { tx } = await executor.execute(warp, WarpInputs)
  const signedTx = await client.getWallet(Chain).signTransaction(tx)
  console.log('--------------------------------')
  console.log('Signed transaction:', signedTx)
  console.log('--------------------------------')
  const sentTxHash = await client.getWallet(Chain).sendTransaction(signedTx)
  console.log('--------------------------------')
  console.log('Sent transaction:', sentTxHash)
  console.log('--------------------------------')
  const remoteTx = await client.getDataLoader(Chain).getAction(sentTxHash, true)
  console.log('--------------------------------')
  console.log('Remote transaction:', remoteTx)
  console.log('--------------------------------')

  executor.evaluateResults(warp, Chain, remoteTx)
}

const listWarps = () => fs.readdirSync(warpsDir).filter((f) => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.json'))

const loadWallet = async (chain: string): Promise<any> => {
  const walletPath = path.join(__dirname, 'wallets', `${chain}.json`)
  const wallet = await fs.promises.readFile(walletPath, { encoding: 'utf8' })
  return JSON.parse(wallet)
}

const loadFile = async (chain: string): Promise<string | null> => {
  const filePath = path.join(__dirname, 'wallets', `${chain}.txt`)
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

/*const signAndSendWithMultiversX = async (tx: MultiversxTransaction): Promise<TransactionOnNetwork> => {

const getSuiWallet = async (): Promise<{ address: string; keypair: Keypair }> => {
  const mnemonicPath = path.join(__dirname, 'wallets', walletSuiFileName)
  const mnemonic = await fs.promises.readFile(mnemonicPath, { encoding: 'utf8' })
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic.trim())
  return { address: keypair.getPublicKey().toSuiAddress(), keypair }
}

const signAndSendWithSui = async (tx: SuiTransaction): Promise<any> => {
  const { address, keypair } = await getSuiWallet()
  const client = new SuiClient({ url: getFullnodeUrl(suiNetwork) })
  const balance = await client.getBalance({ owner: address })
  if (!balance.totalBalance || BigInt(balance.totalBalance) === 0n) {
    await requestSuiFromFaucetV2({ host: getFaucetHost(suiNetwork), recipient: address })
  }
  const executor = new SerialTransactionExecutor({ client, signer: keypair })
  const result = await executor.executeTransaction(tx)
  console.log('--------------------------------')
  console.log('Sent transaction on Sui:', result.digest)
  console.log('--------------------------------')
  return result
}

const getEvmWallet = async (): Promise<{ address: string; wallet: ethers.HDNodeWallet }> => {
  const mnemonicPath = path.join(__dirname, 'wallets', walletEvmFileName)
  const mnemonic = await fs.promises.readFile(mnemonicPath, { encoding: 'utf8' })
  const wallet = ethers.Wallet.fromPhrase(mnemonic.trim())
  return { address: wallet.address, wallet }
}

const signAndSendWithEvm = async (tx: any, chain: any): Promise<any> => {
  const { address, wallet } = await getEvmWallet()
  let rpcUrl: string
  switch (chain.name) {
    case 'ethereum':
      rpcUrl = 'https://rpc.sepolia.org' // Sepolia testnet
      break
    case 'arbitrum':
      rpcUrl = 'https://sepolia-rollup.arbitrum.io/rpc' // Arbitrum Sepolia testnet
      break
    case 'base':
      rpcUrl = 'https://sepolia.base.org' // Base Sepolia testnet
      break
    default:
      rpcUrl = 'https://eth-sepolia.g.alchemy.com/v2/demo'
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const connectedWallet = wallet.connect(provider)
  const nonce = await provider.getTransactionCount(address)
  const feeData = await provider.getFeeData()

  const gasLimit =
    tx.gasLimit ||
    (await provider.estimateGas({
      to: tx.to,
      data: tx.data,
      value: tx.value || 0,
      from: address,
    }))

  // Get the correct chain ID for each network
  let chainId: number
  switch (chain.name) {
    case 'ethereum':
      chainId = 11155111 // Sepolia
      break
    case 'arbitrum':
      chainId = 421614 // Arbitrum Sepolia
      break
    case 'base':
      chainId = 84532 // Base Sepolia
      break
    default:
      chainId = 11155111 // Sepolia
  }

  const txRequest = {
    to: tx.to,
    data: tx.data,
    value: tx.value || 0,
    gasLimit: gasLimit,
    maxFeePerGas: tx.maxFeePerGas || feeData.maxFeePerGas,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas,
    nonce: nonce,
    chainId: chainId,
  }

  const signedTx = await connectedWallet.signTransaction(txRequest)
  const txResponse = await provider.broadcastTransaction(signedTx)
  const receipt = await txResponse.wait()

  console.log('--------------------------------')
  console.log(`Sent transaction on ${chain.name}:`, receipt.hash)
  console.log('--------------------------------')

  return receipt
}
  */
