import {
  AbiRegistry,
  Address,
  ArgSerializer,
  SmartContractTransactionsFactory,
  Token,
  TokenComputer,
  TokenTransfer,
  Transaction,
  TransactionsFactoryConfig,
  TransferTransactionsFactory,
  TypedValue,
} from '@multiversx/sdk-core'
import { Config } from './config'
import { WarpConstants } from './constants'
import { getDefaultChainInfo, shiftBigintBy } from './helpers'
import { findKnownTokenById } from './tokens'
import {
  ChainInfo,
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
    const chainInfo = await this.getChainInfoForAction(action)
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

  async executeQuery(action: WarpQueryAction, inputs: string[]): Promise<TypedValue> {
    if (!action.func) throw new Error('WarpActionExecutor: Function not found')
    const chainInfo = await this.getChainInfoForAction(action)
    const abi = await this.getAbiForAction(action)
    const { args } = await this.getTxComponentsFromInputs(action, inputs)
    const typedArgs = args.map((arg) => this.serializer.stringToTyped(arg))
    const entrypoint = WarpUtils.getChainEntrypoint(chainInfo, this.config.env)
    const contractAddress = Address.newFromBech32(action.address)
    const controller = entrypoint.createSmartContractController(abi)
    const query = controller.createQuery({ contract: contractAddress, function: action.func, arguments: typedArgs })
    const response = await controller.runQuery(query)
    const isOk = response.returnCode === 'ok'
    if (!isOk) throw new Error(`WarpActionExecutor: Query failed with return code ${response.returnCode}`)
    const argsSerializer = new ArgSerializer()
    const endpoint = abi.getEndpoint(response.function)
    const parts = response.returnDataParts.map((part) => Buffer.from(part))
    const values = argsSerializer.buffersToValues(parts, endpoint.output)
    return values[0]
  }

  async executeCollect(action: WarpCollectAction, inputs: string[], meta?: Record<string, any>): Promise<void> {
    const resolvedInputs = await this.getResolvedInputs(action, inputs)
    const modifiedInputs = this.getModifiedInputs(resolvedInputs)

    const inputPayload = modifiedInputs.map((i) => ({
      [i.input.as || i.input.name]: i.value ? this.serializer.stringToNative(i.value)[1] : null,
    }))

    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Accept', 'application/json')
    Object.entries(action.destination.headers).forEach(([key, value]) => {
      headers.set(key, value as string)
    })

    await fetch(action.destination.url, {
      method: action.destination.method,
      headers,
      body: JSON.stringify({ inputs: inputPayload, meta }),
    })
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
      if (input.source === 'query') return this.serializer.nativeToString(input.type, this.url.searchParams.get(input.name) || '')
      return preprocessed[index] || null
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

  private async getChainInfoForAction(action: WarpTransferAction | WarpContractAction | WarpQueryAction): Promise<ChainInfo> {
    if (!action.chain) return getDefaultChainInfo(this.config)

    const chainInfo = await this.registry.getChainInfo(action.chain)
    if (!chainInfo) throw new Error(`WarpActionExecutor: Chain info not found for ${action.chain}`)

    return chainInfo
  }

  private async getAbiForAction(action: WarpQueryAction): Promise<AbiRegistry> {
    if (action.abi) {
      return await this.fetchAbi(action)
    }

    const verification = await this.contractLoader.getVerificationInfo(action.address)
    if (!verification) throw new Error('WarpActionExecutor: Verification info not found')

    return AbiRegistry.create(verification.abi)
  }

  private async fetchAbi(action: WarpQueryAction): Promise<AbiRegistry> {
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
