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
import { Config } from './config'
import { WarpConstants } from './constants'
import { getWarpActionByIndex, shiftBigintBy } from './helpers'
import { extractCollectResults, extractContractResults, extractQueryResults } from './helpers/results'
import { findKnownTokenById } from './tokens'
import {
  Warp,
  WarpAction,
  WarpActionInput,
  WarpActionInputType,
  WarpCollectAction,
  WarpConfig,
  WarpContractAction,
  WarpContractActionTransfer,
  WarpQueryAction,
  WarpTransferAction,
} from './types'
import { WarpExecutionResult } from './types/results'
import { WarpAbiBuilder } from './WarpAbiBuilder'
import { WarpArgSerializer } from './WarpArgSerializer'
import { WarpContractLoader } from './WarpContractLoader'
import { WarpRegistry } from './WarpRegistry'
import { WarpUtils } from './WarpUtils'

type ResolvedInput = {
  input: WarpActionInput
  value: string | null
}

export class WarpActionExecutor {
  private config: WarpConfig
  private url: URL
  private serializer: WarpArgSerializer
  private contractLoader: WarpContractLoader
  private registry: WarpRegistry

  constructor(config: WarpConfig) {
    if (!config.currentUrl) throw new Error('WarpActionExecutor: currentUrl config not set')
    this.config = config
    this.url = new URL(config.currentUrl)
    this.serializer = new WarpArgSerializer()
    this.contractLoader = new WarpContractLoader(config)
    this.registry = new WarpRegistry(config)
  }

  async createTransactionForExecute(action: WarpTransferAction | WarpContractAction, inputs: string[]): Promise<Transaction> {
    if (!this.config.userAddress) throw new Error('WarpActionExecutor: user address not set')
    const sender = Address.newFromBech32(this.config.userAddress)
    const chainInfo = await WarpUtils.getChainInfoForAction(action, this.config)
    const config = new TransactionsFactoryConfig({ chainID: chainInfo.chainId })

    const { destination, args, value, transfers, data } = await this.getTxComponentsFromInputs(action, inputs, sender)
    const typedArgs = args.map((arg) => this.serializer.stringToTyped(arg))

    if (action.type === 'transfer') {
      return new TransferTransactionsFactory({ config }).createTransactionForTransfer(sender, {
        receiver: destination,
        nativeAmount: value,
        tokenTransfers: transfers,
        data: data ? new Uint8Array(data) : undefined,
      })
    } else if (action.type === 'contract' && destination.isSmartContract()) {
      return new SmartContractTransactionsFactory({ config }).createTransactionForExecute(sender, {
        contract: destination,
        function: 'func' in action ? action.func || '' : '',
        gasLimit: 'gasLimit' in action ? BigInt(action.gasLimit || 0) : 0n,
        arguments: typedArgs,
        tokenTransfers: transfers,
        nativeTransferAmount: value,
      })
    } else if (action.type === 'query') {
      throw new Error('WarpActionExecutor: Invalid action type for createTransactionForExecute; Use executeQuery instead')
    } else if (action.type === 'collect') {
      throw new Error('WarpActionExecutor: Invalid action type for createTransactionForExecute; Use executeCollect instead')
    }

    throw new Error(`WarpActionExecutor: Invalid action type (${action.type})`)
  }

  async getTransactionExecutionResults(warp: Warp, actionIndex: number, tx: TransactionOnNetwork): Promise<WarpExecutionResult> {
    const action = getWarpActionByIndex(warp, actionIndex) as WarpContractAction
    const redirectUrl = WarpUtils.getNextStepUrl(warp, actionIndex, this.config)

    const { values, results } = await extractContractResults(this, warp, action, tx)
    const messages = this.getPreparedMessages(warp, results)

    return {
      success: tx.status.isSuccessful(),
      warp,
      action: actionIndex,
      user: this.config.userAddress || null,
      txHash: tx.hash,
      redirectUrl,
      values,
      results,
      messages,
    }
  }

  async executeQuery(warp: Warp, actionIndex: number, inputs: string[]): Promise<WarpExecutionResult> {
    const action = getWarpActionByIndex(warp, actionIndex) as WarpQueryAction | null
    if (!action) throw new Error('WarpActionExecutor: Action not found')
    if (!action.func) throw new Error('WarpActionExecutor: Function not found')
    const chainInfo = await WarpUtils.getChainInfoForAction(action, this.config)
    const abi = await this.getAbiForAction(action)
    const { args } = await this.getTxComponentsFromInputs(action, inputs)
    const typedArgs = args.map((arg) => this.serializer.stringToTyped(arg))
    const entrypoint = WarpUtils.getChainEntrypoint(chainInfo, this.config.env)
    const contractAddress = Address.newFromBech32(action.address)
    const controller = entrypoint.createSmartContractController(abi)
    const query = controller.createQuery({ contract: contractAddress, function: action.func, arguments: typedArgs })
    const response = await controller.runQuery(query)
    const isSuccess = response.returnCode === 'ok'
    const argsSerializer = new ArgSerializer()
    const endpoint = abi.getEndpoint(response.function)
    const parts = response.returnDataParts.map((part) => Buffer.from(part))
    const typedValues = argsSerializer.buffersToValues(parts, endpoint.output)
    const { values, results } = await extractQueryResults(warp, typedValues)

    return {
      success: isSuccess,
      warp,
      action: actionIndex,
      user: this.config.userAddress || null,
      txHash: null,
      redirectUrl: action.next || null,
      values,
      results,
      messages: this.getPreparedMessages(warp, results),
    }
  }

  async executeCollect(warp: Warp, actionIndex: number, inputs: string[], meta?: Record<string, any>): Promise<WarpExecutionResult> {
    const action = getWarpActionByIndex(warp, actionIndex) as WarpCollectAction | null
    if (!action) throw new Error('WarpActionExecutor: Action not found')
    const resolvedInputs = await this.getResolvedInputs(action, inputs)
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

    const inputPayload = Object.fromEntries(modifiedInputs.map((i) => [i.input.as || i.input.name, toInputPayloadValue(i)]))

    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Accept', 'application/json')
    Object.entries(action.destination.headers).forEach(([key, value]) => {
      headers.set(key, value as string)
    })

    try {
      const response = await fetch(action.destination.url, {
        method: action.destination.method,
        headers,
        body: JSON.stringify({ inputs: inputPayload, meta }),
      })
      const content = await response.json()
      const { values, results } = await extractCollectResults(warp, content)

      return {
        success: response.ok,
        warp,
        action: actionIndex,
        user: this.config.userAddress || null,
        txHash: null,
        redirectUrl: action.next || null,
        values,
        results,
        messages: this.getPreparedMessages(warp, results),
      }
    } catch (error) {
      console.error(error)
      return {
        success: false,
        warp,
        action: actionIndex,
        user: this.config.userAddress || null,
        txHash: null,
        redirectUrl: null,
        values: [],
        results: {},
        messages: {},
      }
    }
  }

  async getTxComponentsFromInputs(
    action: WarpTransferAction | WarpContractAction | WarpQueryAction,
    inputs: string[],
    sender?: Address
  ): Promise<{ destination: Address; args: string[]; value: bigint; transfers: TokenTransfer[]; data: Buffer | null }> {
    const resolvedInputs = await this.getResolvedInputs(action, inputs)
    const modifiedInputs = this.getModifiedInputs(resolvedInputs)

    const destinationInput = modifiedInputs.find((i) => i.input.position === 'receiver')?.value
    const detinationInAction = 'address' in action ? action.address : null
    const destinationRaw = destinationInput?.split(':')[1] || detinationInAction || sender?.toBech32()
    if (!destinationRaw) throw new Error('WarpActionExecutor: Destination/Receiver not provided')
    const destination = Address.newFromBech32(destinationRaw)

    const args = this.getPreparedArgs(action, modifiedInputs)

    const valueInput = modifiedInputs.find((i) => i.input.position === 'value')?.value || null
    const valueInAction = 'value' in action ? action.value : null
    const value = BigInt(valueInput?.split(':')[1] || valueInAction || 0)

    const transferInputs = modifiedInputs.filter((i) => i.input.position === 'transfer' && i.value).map((i) => i.value) as string[]
    const transfersInAction = 'transfers' in action ? action.transfers : []
    const transfers = [
      ...(transfersInAction?.map(this.toTypedTransfer) || []),
      ...(transferInputs?.map((t) => this.serializer.stringToNative(t)[1] as TokenTransfer) || []),
    ]

    const dataInput = modifiedInputs.find((i) => i.input.position === 'data')?.value
    const dataInAction = 'data' in action ? action.data || '' : null
    const dataCombined = dataInput || dataInAction || null
    const dataValue = dataCombined ? this.serializer.stringToTyped(dataCombined).valueOf() : null
    const data = dataValue ? Buffer.from(dataValue) : null

    return { destination, args, value, transfers, data }
  }

  public async getResolvedInputs(action: WarpAction, inputArgs: string[]): Promise<ResolvedInput[]> {
    const argInputs = action.inputs || []
    const preprocessed = await Promise.all(inputArgs.map((arg) => this.preprocessInput(arg)))

    const toValueByType = (input: WarpActionInput, index: number) => {
      if (input.source === 'query') {
        const value = this.url.searchParams.get(input.name)
        if (!value) return null
        return this.serializer.nativeToString(input.type, value)
      } else if (input.source === 'user_wallet') {
        if (!this.config.userAddress) return null
        return this.serializer.nativeToString('address', this.config.userAddress)
      } else {
        return preprocessed[index] || null
      }
    }

    return argInputs.map((input, index) => ({
      input,
      value: toValueByType(input, index),
    }))
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

  public async preprocessInput(input: string): Promise<string> {
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
          const apiUrl = this.config.chainApiUrl || Config.Chain.ApiUrl(this.config.env)
          const definitionRes = await fetch(`${apiUrl}/tokens/${tokenId}`) // TODO: use chainApi directly; currently causes circular reference for whatever reason
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

    const verification = await this.contractLoader.getVerificationInfo(action.address)
    if (!verification) throw new Error('WarpActionExecutor: Verification info not found')

    return AbiRegistry.create(verification.abi)
  }

  private getPreparedArgs(action: WarpAction, resolvedInputs: ResolvedInput[]): string[] {
    let args = 'args' in action ? action.args || [] : []
    resolvedInputs.forEach(({ input, value }) => {
      if (!value) return
      if (!input.position.startsWith('arg:')) return
      const argIndex = Number(input.position.split(':')[1]) - 1
      args.splice(argIndex, 0, value)
    })

    return args
  }

  private getPreparedMessages(warp: Warp, results: Record<string, any>): Record<string, string> {
    const parts = Object.entries(warp.messages || {}).map(([key, value]) => [
      key,
      value.replace(/\{\{([^}]+)\}\}/g, (match, p1) => results[p1] || ''),
    ])

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
