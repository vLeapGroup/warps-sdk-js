import {
  Address,
  ArgSerializer,
  DevnetEntrypoint,
  MainnetEntrypoint,
  NetworkEntrypoint,
  SmartContractTransactionsFactory,
  TestnetEntrypoint,
  Token,
  TokenComputer,
  TokenTransfer,
  Transaction,
  TransactionsFactoryConfig,
  TransferTransactionsFactory,
  UserSecretKey,
  UserSigner,
} from '@multiversx/sdk-core'
import {
  AdapterWarpExecutor,
  applyResultsToMessages,
  findKnownTokenById,
  getNextInfo,
  getWarpActionByIndex,
  shiftBigintBy,
  WarpActionInputType,
  WarpChainEnv,
  WarpChainInfo,
  WarpClientConfig,
  WarpConstants,
  WarpExecutable,
  WarpExecution,
  WarpQueryAction,
} from '@vleap/warps'
import { WarpMultiversxAbiBuilder } from './WarpMultiversxAbiBuilder'
import { WarpMultiversxResults } from './WarpMultiversxResults'
import { WarpMultiversxSerializer } from './WarpMultiversxSerializer'
import { esdt_value } from './utils.codec'

export class WarpMultiversxExecutor implements AdapterWarpExecutor {
  private readonly serializer: WarpMultiversxSerializer
  private readonly abi: WarpMultiversxAbiBuilder
  private readonly results: WarpMultiversxResults

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.serializer = new WarpMultiversxSerializer()
    this.abi = new WarpMultiversxAbiBuilder(this.config, this.chain)
    this.results = new WarpMultiversxResults(this.config, this.chain)
  }

  async createTransaction(executable: WarpExecutable): Promise<Transaction> {
    const action = getWarpActionByIndex(executable.warp, executable.action)

    let tx: Transaction | null = null
    if (action.type === 'transfer') {
      tx = await this.createTransferTransaction(executable)
    } else if (action.type === 'contract') {
      tx = await this.createContractCallTransaction(executable)
    } else if (action.type === 'query') {
      throw new Error('WarpMultiversxExecutor: Invalid action type for createTransactionForExecute; Use executeQuery instead')
    } else if (action.type === 'collect') {
      throw new Error('WarpMultiversxExecutor: Invalid action type for createTransactionForExecute; Use executeCollect instead')
    }

    if (!tx) throw new Error(`WarpMultiversxExecutor: Invalid action type (${action.type})`)

    return tx
  }

  async createTransferTransaction(executable: WarpExecutable): Promise<Transaction> {
    const userWallet = this.config.user?.wallets?.[executable.chain.name]
    if (!userWallet) throw new Error('WarpMultiversxExecutor: createTransfer - user address not set')
    const sender = Address.newFromBech32(userWallet)
    const config = new TransactionsFactoryConfig({ chainID: executable.chain.chainId })
    const data = executable.data ? Buffer.from(this.serializer.stringToTyped(executable.data).valueOf()) : null
    return new TransferTransactionsFactory({ config }).createTransactionForTransfer(sender, {
      receiver: Address.newFromBech32(executable.destination),
      nativeAmount: executable.value,
      //   tokenTransfers: executable.transfers, // TODO
      data: data ? new Uint8Array(data) : undefined,
    })
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<Transaction> {
    const userWallet = this.config.user?.wallets?.[executable.chain.name]
    if (!userWallet) throw new Error('WarpMultiversxExecutor: createContractCall - user address not set')
    const action = getWarpActionByIndex(executable.warp, executable.action)
    const sender = Address.newFromBech32(userWallet)
    const typedArgs = executable.args.map((arg) => this.serializer.stringToTyped(arg))
    const config = new TransactionsFactoryConfig({ chainID: executable.chain.chainId })
    return new SmartContractTransactionsFactory({ config }).createTransactionForExecute(sender, {
      contract: Address.newFromBech32(executable.destination),
      function: 'func' in action ? action.func || '' : '',
      gasLimit: 'gasLimit' in action ? BigInt(action.gasLimit || 0) : 0n,
      arguments: typedArgs,
      //   tokenTransfers: executable.transfers, // TODO
      nativeTransferAmount: executable.value,
    })
  }

  async executeQuery(executable: WarpExecutable): Promise<WarpExecution> {
    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpQueryAction
    if (action.type !== 'query') throw new Error(`WarpMultiversxExecutor: Invalid action type for executeQuery: ${action.type}`)
    const abi = await this.abi.getAbiForAction(action)
    const typedArgs = executable.args.map((arg) => this.serializer.stringToTyped(arg))
    const entrypoint = WarpMultiversxExecutor.getChainEntrypoint(executable.chain, this.config.env)
    const contractAddress = Address.newFromBech32(executable.destination)
    const controller = entrypoint.createSmartContractController(abi)
    const query = controller.createQuery({ contract: contractAddress, function: action.func || '', arguments: typedArgs })
    const response = await controller.runQuery(query)
    const isSuccess = response.returnCode === 'ok'
    const argsSerializer = new ArgSerializer()
    const endpoint = abi.getEndpoint(response.function || action.func || '')
    const parts = (response.returnDataParts || []).map((part: any) => (typeof part === 'string' ? Buffer.from(part) : Buffer.from(part)))
    const typedValues = argsSerializer.buffersToValues(parts, endpoint.output)
    const { values, results } = await this.results.extractQueryResults(
      executable.warp,
      typedValues,
      executable.action,
      executable.resolvedInputs
    )
    const next = getNextInfo(this.config, [], executable.warp, executable.action, results)

    return {
      success: isSuccess,
      warp: executable.warp,
      action: executable.action,
      user: this.config.user?.wallets?.[executable.chain.name] || null,
      txHash: null,
      next,
      values,
      results,
      messages: applyResultsToMessages(executable.warp, results),
    }
  }

  async preprocessInput(chain: WarpChainInfo, input: string, type: WarpActionInputType, value: string): Promise<string> {
    if (type === 'esdt') {
      const [tokenId, nonce, amount, existingDecimals] = value.split(WarpConstants.ArgCompositeSeparator)
      if (existingDecimals) return input
      const token = new Token({ identifier: tokenId, nonce: BigInt(nonce) })
      const isFungible = new TokenComputer().isFungible(token)
      if (!isFungible) return input // TODO: handle non-fungible tokens like meta-esdts
      const knownToken = findKnownTokenById(tokenId)
      let decimals = knownToken?.decimals
      if (!decimals) {
        const definitionRes = await fetch(`${chain.apiUrl}/tokens/${tokenId}`) // TODO: use chainApi directly; currently causes circular reference for whatever reason
        const definition = await definitionRes.json()
        decimals = definition.decimals
      }
      if (!decimals) throw new Error(`WarpActionExecutor: Decimals not found for token ${tokenId}`)
      const processed = esdt_value(new TokenTransfer({ token, amount: shiftBigintBy(amount, decimals) }))
      return this.serializer.typedToString(processed) + WarpConstants.ArgCompositeSeparator + decimals
    }
    return input
  }

  static getChainEntrypoint(chainInfo: WarpChainInfo, env: WarpChainEnv): NetworkEntrypoint {
    const clientName = 'warp-sdk'
    const kind = 'api'
    if (env === 'devnet') return new DevnetEntrypoint({ url: chainInfo.apiUrl, kind, clientName })
    if (env === 'testnet') return new TestnetEntrypoint({ url: chainInfo.apiUrl, kind, clientName })
    return new MainnetEntrypoint({ url: chainInfo.apiUrl, kind, clientName })
  }

  async signMessage(message: string, privateKey: string): Promise<string> {
    const secretKey = UserSecretKey.fromString(privateKey)
    const signer = new UserSigner(secretKey)
    const signature = await signer.sign(new Uint8Array(Buffer.from(message, 'utf-8')))
    return signature.toString()
  }
}
