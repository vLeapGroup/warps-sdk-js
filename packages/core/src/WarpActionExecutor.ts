import {
  AbiRegistry,
  Address,
  ArgSerializer,
  SmartContractTransactionsFactory,
  Token,
  TokenComputer,
  TokenTransfer,
  Transaction,
  TransactionOnNetwork,
  TransactionsFactoryConfig,
  TransferTransactionsFactory,
} from '@multiversx/sdk-core'
import { WarpConstants } from './constants'
import { getMainChainInfo, getWarpActionByIndex, replacePlaceholders, shiftBigintBy } from './helpers/general'
import { extractCollectResults, extractContractResults, extractQueryResults } from './helpers/results'
import { findKnownTokenById } from './tokens'
import {
  ResolvedInput,
  Warp,
  WarpAction,
  WarpActionInput,
  WarpActionInputType,
  WarpChainInfo,
  WarpCollectAction,
  WarpContractAction,
  WarpContractActionTransfer,
  WarpInitConfig,
  WarpQueryAction,
  WarpTransferAction,
} from './types'
import { WarpExecution } from './types/results'
import { WarpAbiBuilder } from './WarpAbiBuilder'
import { WarpArgSerializer } from './WarpArgSerializer'
import { CacheKey, CacheTtl, WarpCache } from './WarpCache'
import { WarpContractLoader } from './WarpContractLoader'
import { WarpInterpolator } from './WarpInterpolator'
import { WarpLogger } from './WarpLogger'
import { WarpRegistry } from './WarpRegistry'
import { WarpUtils } from './WarpUtils'

type TxComponents = {
  chain: WarpChainInfo
  destination: Address
  args: string[]
  value: bigint
  transfers: TokenTransfer[]
  data: Buffer | null
  resolvedInputs: ResolvedInput[]
}

export class WarpActionExecutor {
  private config: WarpInitConfig
  private url: URL
  private serializer: WarpArgSerializer
  private contractLoader: WarpContractLoader
  private cache: WarpCache
  private registry: WarpRegistry

  constructor(config: WarpInitConfig) {
    if (!config.currentUrl) throw new Error('WarpActionExecutor: currentUrl config not set')
    this.config = config
    this.url = new URL(config.currentUrl)
    this.serializer = new WarpArgSerializer()
    this.contractLoader = new WarpContractLoader(config)
    this.cache = new WarpCache(config.cache?.type)
    this.registry = new WarpRegistry(config)
  }

  async createTransactionForExecute(warp: Warp, actionIndex: number, inputs: string[]): Promise<Transaction> {
    const action = getWarpActionByIndex(warp, actionIndex) as WarpTransferAction | WarpContractAction
    if (!this.config.user?.wallet) throw new Error('WarpActionExecutor: user address not set')
    const sender = Address.newFromBech32(this.config.user.wallet)

    const components = await this.getTxComponentsFromInputs(action, inputs, sender)
    const config = new TransactionsFactoryConfig({ chainID: components.chain.chainId })
    const typedArgs = components.args.map((arg) => this.serializer.stringToTyped(arg))

    let tx: Transaction | null = null
    if (action.type === 'transfer') {
      tx = new TransferTransactionsFactory({ config }).createTransactionForTransfer(sender, {
        receiver: components.destination,
        nativeAmount: components.value,
        tokenTransfers: components.transfers,
        data: components.data ? new Uint8Array(components.data) : undefined,
      })
    } else if (action.type === 'contract' && components.destination.isSmartContract()) {
      tx = new SmartContractTransactionsFactory({ config }).createTransactionForExecute(sender, {
        contract: components.destination,
        function: 'func' in action ? action.func || '' : '',
        gasLimit: 'gasLimit' in action ? BigInt(action.gasLimit || 0) : 0n,
        arguments: typedArgs,
        tokenTransfers: components.transfers,
        nativeTransferAmount: components.value,
      })
    } else if (action.type === 'query') {
      throw new Error('WarpActionExecutor: Invalid action type for createTransactionForExecute; Use executeQuery instead')
    } else if (action.type === 'collect') {
      throw new Error('WarpActionExecutor: Invalid action type for createTransactionForExecute; Use executeCollect instead')
    }

    if (!tx) throw new Error(`WarpActionExecutor: Invalid action type (${action.type})`)
    this.cache.set(
      CacheKey.LastWarpExecutionInputs(this.config.env, warp.meta?.hash || '', actionIndex),
      components.resolvedInputs,
      CacheTtl.OneWeek
    )

    return tx
  }

  async getTransactionExecutionResults(warp: Warp, actionIndex: number, tx: TransactionOnNetwork): Promise<WarpExecution> {
    const preparedWarp = await WarpInterpolator.apply(this.config, warp)
    const action = getWarpActionByIndex(preparedWarp, actionIndex) as WarpContractAction

    // Restore inputs via cache as transactions are broadcasted and processed asynchronously
    const inputs: ResolvedInput[] =
      this.cache.get(CacheKey.LastWarpExecutionInputs(this.config.env, warp.meta?.hash || '', actionIndex)) ?? []

    const { values, results } = await extractContractResults(this, preparedWarp, action, tx, actionIndex, inputs)
    const next = WarpUtils.getNextInfo(this.config, preparedWarp, actionIndex, results)
    const messages = this.getPreparedMessages(preparedWarp, results)

    return {
      success: tx.status.isSuccessful(),
      warp: preparedWarp,
      action: actionIndex,
      user: this.config.user?.wallet || null,
      txHash: tx.hash,
      next,
      values,
      results,
      messages,
    }
  }

  async executeQuery(warp: Warp, actionIndex: number, inputs: string[]): Promise<WarpExecution> {
    const action = getWarpActionByIndex(warp, actionIndex) as WarpQueryAction | null
    if (!action) throw new Error('WarpActionExecutor: Action not found')
    if (!action.func) throw new Error('WarpActionExecutor: Function not found')

    const preparedWarp = await WarpInterpolator.apply(this.config, warp)
    const abi = await this.getAbiForAction(action)
    const { chain, args, resolvedInputs } = await this.getTxComponentsFromInputs(action, inputs)
    const typedArgs = args.map((arg) => this.serializer.stringToTyped(arg))
    const entrypoint = WarpUtils.getChainEntrypoint(chain, this.config.env)
    const contractAddress = Address.newFromBech32(action.address)
    const controller = entrypoint.createSmartContractController(abi)
    const query = controller.createQuery({ contract: contractAddress, function: action.func, arguments: typedArgs })
    const response = await controller.runQuery(query)
    const isSuccess = response.returnCode === 'ok'
    const argsSerializer = new ArgSerializer()
    const endpoint = abi.getEndpoint(response.function)
    const parts = response.returnDataParts.map((part) => Buffer.from(part))
    const typedValues = argsSerializer.buffersToValues(parts, endpoint.output)
    const { values, results } = await extractQueryResults(preparedWarp, typedValues, actionIndex, resolvedInputs)
    const next = WarpUtils.getNextInfo(this.config, preparedWarp, actionIndex, results)

    return {
      success: isSuccess,
      warp: preparedWarp,
      action: actionIndex,
      user: this.config.user?.wallet || null,
      txHash: null,
      next,
      values,
      results,
      messages: this.getPreparedMessages(preparedWarp, results),
    }
  }

  async executeCollect(warp: Warp, actionIndex: number, inputs: string[], extra?: Record<string, any>): Promise<WarpExecution> {
    const action = getWarpActionByIndex(warp, actionIndex) as WarpCollectAction | null
    if (!action) throw new Error('WarpActionExecutor: Action not found')

    const chain = await WarpUtils.getChainInfoForAction(this.config, action)
    const preparedWarp = await WarpInterpolator.apply(this.config, warp)
    const resolvedInputs = await this.getResolvedInputs(chain, action, inputs)
    const modifiedInputs = this.getModifiedInputs(resolvedInputs)

    const toInputPayloadValue = (resolvedInput: ResolvedInput) => {
      if (!resolvedInput.value) return null
      const value = this.serializer.stringToNative(resolvedInput.value)[1]
      if (resolvedInput.input.type === 'biguint') {
        const casted = value as bigint
        return casted.toString() // json-stringify doesn't support bigint
      } else if (resolvedInput.input.type === 'esdt') {
        const casted = value as TokenTransfer
        return { token: casted.token.identifier, nonce: casted.token.nonce.toString(), amount: casted.amount.toString() }
      } else {
        return value
      }
    }

    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Accept', 'application/json')
    Object.entries(action.destination.headers || {}).forEach(([key, value]) => {
      headers.set(key, value as string)
    })

    const payload = Object.fromEntries(modifiedInputs.map((i) => [i.input.as || i.input.name, toInputPayloadValue(i)]))
    const httpMethod = action.destination.method || 'GET'
    const body = httpMethod === 'GET' ? undefined : JSON.stringify({ ...payload, ...extra })

    WarpLogger.info('Executing collect', {
      url: action.destination.url,
      method: httpMethod,
      headers,
      body,
    })

    try {
      const response = await fetch(action.destination.url, { method: httpMethod, headers, body })
      const content = await response.json()
      const { values, results } = await extractCollectResults(preparedWarp, content, actionIndex, modifiedInputs)
      const next = WarpUtils.getNextInfo(this.config, preparedWarp, actionIndex, results)

      return {
        success: response.ok,
        warp: preparedWarp,
        action: actionIndex,
        user: this.config.user?.wallet || null,
        txHash: null,
        next,
        values,
        results: { ...results, _DATA: content },
        messages: this.getPreparedMessages(preparedWarp, results),
      }
    } catch (error) {
      WarpLogger.error('WarpActionExecutor: Error executing collect', error)
      return {
        success: false,
        warp: preparedWarp,
        action: actionIndex,
        user: this.config.user?.wallet || null,
        txHash: null,
        next: null,
        values: [],
        results: { _DATA: error },
        messages: {},
      }
    }
  }

  async getTxComponentsFromInputs(
    action: WarpTransferAction | WarpContractAction | WarpQueryAction,
    inputs: string[],
    sender?: Address
  ): Promise<TxComponents> {
    const chain = await WarpUtils.getChainInfoForAction(this.config, action, inputs)
    const resolvedInputs = await this.getResolvedInputs(chain, action, inputs)
    const modifiedInputs = this.getModifiedInputs(resolvedInputs)

    const destinationInput = modifiedInputs.find((i) => i.input.position === 'receiver')?.value
    const detinationInAction = 'address' in action ? action.address : null
    const destinationRaw = destinationInput?.split(':')[1] || detinationInAction || sender?.toBech32()
    if (!destinationRaw) throw new Error('WarpActionExecutor: Destination/Receiver not provided')
    const destination = Address.newFromBech32(destinationRaw)

    const args = this.getPreparedArgs(action, modifiedInputs)

    const valueInput = modifiedInputs.find((i) => i.input.position === 'value')?.value || null
    const valueInAction = 'value' in action ? action.value : null
    let value = BigInt(valueInput?.split(':')[1] || valueInAction || 0)

    const transferInputs = modifiedInputs.filter((i) => i.input.position === 'transfer' && i.value).map((i) => i.value) as string[]
    const transfersInAction = 'transfers' in action ? action.transfers : []
    let transfers = [
      ...(transfersInAction?.map(this.toTypedTransfer) || []),
      ...(transferInputs?.map((t) => this.serializer.stringToNative(t)[1] as TokenTransfer) || []),
    ]

    const isSingleTransfer = transfers.length === 1 && transferInputs.length === 1 && !transfersInAction?.length
    const isNativeEsdt = transfers[0]?.token.identifier === `${chain.nativeToken}-000000`
    const hasNoOtherEsdtInputs = !modifiedInputs.some((i) => i.value && i.input.position !== 'transfer' && i.input.type === 'esdt')
    if (isSingleTransfer && isNativeEsdt && hasNoOtherEsdtInputs) {
      value += transfers[0].amount
      transfers = []
    }

    const dataInput = modifiedInputs.find((i) => i.input.position === 'data')?.value
    const dataInAction = 'data' in action ? action.data || '' : null
    const dataCombined = dataInput || dataInAction || null
    const dataValue = dataCombined ? this.serializer.stringToTyped(dataCombined).valueOf() : null
    const data = dataValue ? Buffer.from(dataValue) : null

    return { chain, destination, args, value, transfers, data, resolvedInputs: modifiedInputs }
  }

  public async getResolvedInputs(chain: WarpChainInfo, action: WarpAction, inputArgs: string[]): Promise<ResolvedInput[]> {
    const argInputs = action.inputs || []
    const preprocessed = await Promise.all(inputArgs.map((arg) => this.preprocessInput(chain, arg)))

    const toValueByType = (input: WarpActionInput, index: number) => {
      if (input.source === 'query') {
        const value = this.url.searchParams.get(input.name)
        if (!value) return null
        return this.serializer.nativeToString(input.type, value)
      } else if (input.source === WarpConstants.Source.UserWallet) {
        if (!this.config.user?.wallet) return null
        return this.serializer.nativeToString('address', this.config.user.wallet)
      } else {
        return preprocessed[index] || null
      }
    }

    return argInputs.map((input, index) => {
      const value = toValueByType(input, index)
      return {
        input,
        value: value || (input.default !== undefined ? this.serializer.nativeToString(input.type, input.default) : null),
      }
    })
  }

  public getModifiedInputs(inputs: ResolvedInput[]): ResolvedInput[] {
    // Note: 'scale' modifier means that the value is multiplied by 10^modifier; the modifier can also be the name of another input field
    // Example: 'scale:10' means that the value is multiplied by 10^10
    // Example 2: 'scale:{amount}' means that the value is multiplied by the value of the 'amount' input field

    // TODO: refactor once more modifiers are added

    return inputs.map((resolved, index) => {
      if (resolved.input.modifier?.startsWith('scale:')) {
        const [, exponent] = resolved.input.modifier.split(':')
        if (isNaN(Number(exponent))) {
          // Scale by another input field
          const exponentVal = Number(inputs.find((i) => i.input.name === exponent)?.value?.split(':')[1])
          if (!exponentVal) throw new Error(`WarpActionExecutor: Exponent value not found for input ${exponent}`)
          const scalableVal = resolved.value?.split(':')[1]
          if (!scalableVal) throw new Error('WarpActionExecutor: Scalable value not found')
          const scaledVal = shiftBigintBy(scalableVal, +exponentVal)
          return { ...resolved, value: `${resolved.input.type}:${scaledVal}` }
        } else {
          // Scale by fixed amount
          const scalableVal = resolved.value?.split(':')[1]
          if (!scalableVal) throw new Error('WarpActionExecutor: Scalable value not found')
          const scaledVal = shiftBigintBy(scalableVal, +exponent)
          return { ...resolved, value: `${resolved.input.type}:${scaledVal}` }
        }
      } else {
        return resolved
      }
    })
  }

  public async preprocessInput(chain: WarpChainInfo, input: string): Promise<string> {
    try {
      const [type, value] = input.split(WarpConstants.ArgParamsSeparator, 2) as [WarpActionInputType, string]
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
        const processed = new TokenTransfer({ token, amount: shiftBigintBy(amount, decimals) })
        return this.serializer.nativeToString(type, processed) + WarpConstants.ArgCompositeSeparator + decimals
      }
      return input
    } catch (e) {
      return input
    }
  }

  public async getAbiForAction(action: WarpContractAction | WarpQueryAction): Promise<AbiRegistry> {
    if (action.abi) {
      return await this.fetchAbi(action)
    }

    const chainInfo = getMainChainInfo(this.config)
    const verification = await this.contractLoader.getVerificationInfo(action.address, chainInfo)
    if (!verification) throw new Error('WarpActionExecutor: Verification info not found')

    return AbiRegistry.create(verification.abi)
  }

  private getPreparedArgs(action: WarpAction, resolvedInputs: ResolvedInput[]): string[] {
    let args = 'args' in action ? action.args || [] : []
    resolvedInputs.forEach(({ input, value }) => {
      if (!value) return
      if (!input.position?.startsWith('arg:')) return
      const argIndex = Number(input.position.split(':')[1]) - 1
      args.splice(argIndex, 0, value)
    })

    return args
  }

  private getPreparedMessages(warp: Warp, results: Record<string, any>): Record<string, string> {
    const parts = Object.entries(warp.messages || {}).map(([key, value]) => [key, replacePlaceholders(value, results)])

    return Object.fromEntries(parts)
  }

  private async fetchAbi(action: WarpContractAction | WarpQueryAction): Promise<AbiRegistry> {
    if (!action.abi) throw new Error('WarpActionExecutor: ABI not found')
    if (action.abi.startsWith(WarpConstants.IdentifierType.Hash)) {
      const abiBuilder = new WarpAbiBuilder(this.config)
      const hashValue = action.abi.split(WarpConstants.IdentifierParamSeparator)[1]
      const abi = await abiBuilder.createFromTransactionHash(hashValue)
      if (!abi) throw new Error(`WarpActionExecutor: ABI not found for hash: ${action.abi}`)
      return AbiRegistry.create(abi.content)
    } else {
      const abiRes = await fetch(action.abi)
      const abiContents = await abiRes.json()
      return AbiRegistry.create(abiContents)
    }
  }

  private toTypedTransfer(transfer: WarpContractActionTransfer): TokenTransfer {
    return new TokenTransfer({
      token: new Token({ identifier: transfer.token, nonce: BigInt(transfer.nonce || 0) }),
      amount: BigInt(transfer.amount || 0),
    })
  }
}
