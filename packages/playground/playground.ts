// Playground for testing warps in isolation
import {
  Address,
  DevnetEntrypoint,
  Transaction as MultiversxTransaction,
  TransactionComputer,
  TransactionOnNetwork,
  UserSigner,
} from '@multiversx/sdk-core'
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client'
import { Keypair } from '@mysten/sui/dist/cjs/cryptography'
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { SerialTransactionExecutor, Transaction as SuiTransaction } from '@mysten/sui/transactions'
import { WarpClient, WarpClientConfig } from '@vleap/warps'
import { getArbitrumAdapter, getBaseAdapter, getEthereumAdapter } from '@vleap/warps-adapter-evm'
import { getMultiversxAdapter } from '@vleap/warps-adapter-multiversx'
import { getSuiAdapter } from '@vleap/warps-adapter-sui'
import { ethers } from 'ethers'
import * as fs from 'fs'
import * as path from 'path'

const walletMultiversxFileName = 'mvx.pem'
const walletSuiFileName = 'sui.mnemonic'
const walletEvmFileName = 'evm.mnemonic'
const warpInputs: string[] = []

const suiNetwork = 'testnet'

const warpsDir = path.join(__dirname, 'warps')

const Chain = 'multiversx'

const runWarp = async (warpFile: string) => {
  const warpPath = path.join(warpsDir, warpFile)
  if (!warpFile.endsWith('.json')) {
    return
  }

  const warpRaw = fs.readFileSync(warpPath, 'utf-8')

  const config: WarpClientConfig = {
    env: 'devnet',
    currentUrl: 'https://usewarp.to',
    user: {},
  }

  const multiversxAdapter = getMultiversxAdapter(config)
  const client = new WarpClient(config, [
    multiversxAdapter,
    getSuiAdapter(config),
    getEthereumAdapter(config, multiversxAdapter),
    getArbitrumAdapter(config, multiversxAdapter),
    getBaseAdapter(config, multiversxAdapter),
  ])

  const warp = await client.createBuilder(Chain).createFromRaw(warpRaw)

  const registry = await client.getRegistry(Chain)
  const chain = await registry.getChainInfo(Chain)

  config.user.wallets = {
    multiversx: (await getMultiversxWallet()).address,
    sui: (await getSuiWallet()).address,
    ethereum: (await getEvmWallet()).address,
    arbitrum: (await getEvmWallet()).address,
    base: (await getEvmWallet()).address,
  }

  const executor = client.createExecutor({
    onExecuted: (result) => {
      console.log('--------------------------------')
      console.log('Executed:', result)
      console.log('--------------------------------')
    },
  })
  const { tx } = await executor.execute(warp, warpInputs)

  if (chain.name === 'multiversx') {
    const txOnNetwork = await signAndSendWithMultiversX(tx)
    executor.evaluateResults(warp, chain, txOnNetwork)
  } else if (chain.name === 'sui') {
    const txOnNetwork = await signAndSendWithSui(tx)
    executor.evaluateResults(warp, chain, txOnNetwork)
  } else if (chain.name === 'ethereum' || chain.name === 'arbitrum' || chain.name === 'base') {
    const txOnNetwork = await signAndSendWithEvm(tx, chain)
    executor.evaluateResults(warp, chain, txOnNetwork)
  } else {
    throw new Error(`Unsupported chain: ${chain}`)
  }
}

const listWarps = () => fs.readdirSync(warpsDir).filter((f) => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.json'))

const warps = listWarps()
if (warps.length === 0) {
  console.log('No warps found in playground/warps.')
  process.exit(1)
}

const warpToRun = warps[0] // Run the first warp we find
runWarp(warpToRun)

const getMultiversxWallet = async (): Promise<{ address: string; signer: UserSigner }> => {
  const pemPath = path.join(__dirname, 'wallets', walletMultiversxFileName)
  const pemText = await fs.promises.readFile(pemPath, { encoding: 'utf8' })
  const signer = UserSigner.fromPem(pemText)
  return { address: signer.getAddress().toBech32(), signer }
}

const signAndSendWithMultiversX = async (tx: MultiversxTransaction): Promise<TransactionOnNetwork> => {
  const { address, signer } = await getMultiversxWallet()
  const entrypoint = new DevnetEntrypoint({ kind: 'api', clientName: 'warp-test-playground' })
  const provider = entrypoint.createNetworkProvider()
  const account = await provider.getAccount(Address.newFromBech32(address))
  tx.nonce = account.nonce
  const serializedTx = new TransactionComputer().computeBytesForSigning(tx)
  tx.signature = await signer.sign(serializedTx)
  const txHash = await provider.sendTransaction(tx)
  await provider.awaitTransactionCompleted(txHash)
  console.log('--------------------------------')
  console.log('Sent transaction on MultiversX:', txHash)
  console.log('--------------------------------')
  const txOnNetwork = await provider.getTransaction(txHash)
  return txOnNetwork
}

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
