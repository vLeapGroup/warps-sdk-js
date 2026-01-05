import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { ComputeBudgetProgram, Connection, MessageV0, PublicKey, SystemProgram, TransactionInstruction, VersionedTransaction } from '@solana/web3.js'
import {
  AdapterWarpExecutor,
  applyOutputToMessages,
  extractResolvedInputValues,
  getNextInfo,
  getProviderConfig,
  getWarpActionByIndex,
  getWarpWalletAddressFromConfig,
  WarpActionExecutionResult,
  WarpChainAssetValue,
  WarpChainInfo,
  WarpClientConfig,
  WarpExecutable,
  WarpQueryAction,
} from '@vleap/warps'
import { WarpSolanaConstants } from './constants'
import { WarpSolanaOutput } from './WarpSolanaOutput'
import { WarpSolanaSerializer } from './WarpSolanaSerializer'

export class WarpSolanaExecutor implements AdapterWarpExecutor {
  private readonly serializer: WarpSolanaSerializer
  private readonly connection: Connection
  private readonly output: WarpSolanaOutput

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.serializer = new WarpSolanaSerializer()
    const providerConfig = getProviderConfig(this.config, chain.name, this.config.env, this.chain.defaultApiUrl)
    this.connection = new Connection(providerConfig.url, 'confirmed')
    this.output = new WarpSolanaOutput(config, this.chain)
  }

  async createTransaction(executable: WarpExecutable): Promise<VersionedTransaction> {
    const action = getWarpActionByIndex(executable.warp, executable.action)

    let tx: VersionedTransaction | null = null
    if (action.type === 'transfer') {
      tx = await this.createTransferTransaction(executable)
    } else if (action.type === 'contract') {
      tx = await this.createContractCallTransaction(executable)
    } else if (action.type === 'query') {
      throw new Error('WarpSolanaExecutor: Invalid action type for createTransaction; Use executeQuery instead')
    } else if (action.type === 'collect') {
      throw new Error('WarpSolanaExecutor: Invalid action type for createTransaction; Use executeCollect instead')
    }

    if (!tx) throw new Error(`WarpSolanaExecutor: Invalid action type (${action.type})`)

    return tx
  }

  async createTransferTransaction(executable: WarpExecutable): Promise<VersionedTransaction> {
    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpSolanaExecutor: createTransfer - user address not set')
    if (!executable.destination) throw new Error('WarpSolanaExecutor: Destination address is required')

    const destinationPubkey = this.toPublicKey(executable.destination, 'Invalid destination address')
    const fromPubkey = this.toPublicKey(userWallet, 'Invalid user wallet address')

    if (executable.transfers && executable.transfers.length > 0) {
      return this.createTokenTransferTransaction(executable, userWallet, destinationPubkey)
    }

    const instructions: TransactionInstruction[] = []

    if (executable.value > 0n) {
      instructions.push(SystemProgram.transfer({ fromPubkey, toPubkey: destinationPubkey, lamports: Number(executable.value) }))
    }

    if (executable.data) {
      const data = this.serializer.stringToTyped(executable.data)
      if (data && typeof data === 'string') {
        const dataBuffer = Buffer.from(data, 'base64')
        instructions.push(
          new TransactionInstruction({
            keys: [
              { pubkey: fromPubkey, isSigner: true, isWritable: true },
              { pubkey: destinationPubkey, isSigner: false, isWritable: true },
            ],
            programId: destinationPubkey,
            data: dataBuffer,
          })
        )
      }
    }

    return this.setTransactionDefaults(instructions, fromPubkey)
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<VersionedTransaction> {
    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpSolanaExecutor: createContractCall - user address not set')

    const action = getWarpActionByIndex(executable.warp, executable.action)
    if (!action || !('func' in action) || !action.func) throw new Error('WarpSolanaExecutor: Contract action must have a function name')
    if (!executable.destination) throw new Error('WarpSolanaExecutor: Contract address is required')

    const programId = this.toPublicKey(executable.destination, 'Invalid contract address')
    const fromPubkey = this.toPublicKey(userWallet, 'Invalid user wallet address')
    const instructions: TransactionInstruction[] = []

    const argsToUse = this.extractContractArgs(executable)
    const nativeArgs = argsToUse.map((arg) => this.serializer.coreSerializer.stringToNative(arg)[1])
    const instructionData = this.buildInstructionData(action, nativeArgs)

    const accounts = await this.buildInstructionAccounts(action, executable, fromPubkey, programId)
    await this.ensureATAs(action, accounts, fromPubkey, instructions)
    instructions.push(new TransactionInstruction({ keys: accounts, programId, data: instructionData }))

    if (executable.value > 0n) {
      instructions.push(SystemProgram.transfer({ fromPubkey, toPubkey: programId, lamports: Number(executable.value) }))
    }

    return this.setTransactionDefaults(instructions, fromPubkey)
  }

  private async ensureATAs(
    action: any,
    accounts: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>,
    fromPubkey: PublicKey,
    instructions: TransactionInstruction[]
  ): Promise<void> {
    if (!action.accounts || !Array.isArray(action.accounts)) return

    const createdATAs = new Set<string>()

    for (let idx = 0; idx < action.accounts.length; idx++) {
      const accountDef = action.accounts[idx]
      const accountStr = typeof accountDef === 'string' ? accountDef : JSON.stringify(accountDef)

      if (accountStr.includes('{{USER_ATA:')) {
        const match = accountStr.match(/USER_ATA[:\s]*([^"}\s]+)/)
        if (match) {
          const mintAddress = match[1]
          try {
            const mintPubkey = new PublicKey(mintAddress)
            const expectedAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey)
            const ataKey = expectedAta.toBase58()

            if (!createdATAs.has(ataKey)) {
              createdATAs.add(ataKey)
              const ataInfo = await this.connection.getAccountInfo(expectedAta)
              if (!ataInfo) {
                instructions.push(createAssociatedTokenAccountInstruction(fromPubkey, expectedAta, fromPubkey, mintPubkey))
              }
            }
          } catch {
            continue
          }
        }
      }

      if (accountStr.includes('{{RECEIVER_ATA:')) {
        const match = accountStr.match(/RECEIVER_ATA[:\s]*([^"}\s:]+)[:\s]*([^"}\s]+)/)
        if (match) {
          const mintAddress = match[1]
          const receiverAddress = match[2]
          try {
            const mintPubkey = new PublicKey(mintAddress)
            const receiverPubkey = new PublicKey(receiverAddress)
            const expectedAta = await getAssociatedTokenAddress(mintPubkey, receiverPubkey)
            const ataKey = expectedAta.toBase58()

            if (!createdATAs.has(ataKey)) {
              createdATAs.add(ataKey)
              const ataInfo = await this.connection.getAccountInfo(expectedAta)
              if (!ataInfo) {
                instructions.push(createAssociatedTokenAccountInstruction(fromPubkey, expectedAta, receiverPubkey, mintPubkey))
              }
            }
          } catch {
            continue
          }
        }
      }
    }
  }

  private encodeInstructionData(instructionDef: any, args: any[], funcName: string): Buffer {
    try {
      let discriminatorBuffer: Buffer
      if (instructionDef.discriminator) {
        if (Buffer.isBuffer(instructionDef.discriminator)) {
          discriminatorBuffer = instructionDef.discriminator
        } else if (Array.isArray(instructionDef.discriminator)) {
          discriminatorBuffer = Buffer.from(instructionDef.discriminator)
        } else {
          discriminatorBuffer = Buffer.from(funcName).slice(0, 8)
        }
      } else {
          discriminatorBuffer = Buffer.from(funcName).slice(0, 8)
      }

      if (args.length > 0 && instructionDef.args && instructionDef.args.length > 0) {
        const encodedArgs = this.encodeArgs(args, instructionDef.args)
        // @ts-expect-error - Buffer.concat works correctly but TypeScript types are strict
        return Buffer.concat([discriminatorBuffer, encodedArgs])
      }

      return discriminatorBuffer
    } catch {
      return this.encodeBasicInstructionData(args, funcName)
    }
  }

  private encodeBasicInstructionData(args: any[], funcName: string): Buffer {
        const funcHash = Buffer.from(funcName).slice(0, 8)
    const data = Buffer.alloc(8)
    data.set(funcHash, 0)

    if (args.length > 0) {
      const encodedArgs = args.map((arg) => {
        if (typeof arg === 'string') {
          return Buffer.from(arg, 'utf8')
        } else if (typeof arg === 'number' || typeof arg === 'bigint') {
          const num = typeof arg === 'bigint' ? Number(arg) : arg
          const buf = Buffer.alloc(8)
          buf.writeBigUInt64LE(BigInt(num), 0)
          return buf
        } else if (Buffer.isBuffer(arg)) {
          return arg
        } else if (arg instanceof Uint8Array) {
          return Buffer.from(arg)
        }
        return Buffer.from(String(arg), 'utf8')
      })
      // @ts-expect-error - Buffer.concat works correctly but TypeScript types are strict
      return Buffer.concat([data, ...encodedArgs])
    }

    return data
  }

  private encodeArgs(args: any[], argDefs: any[]): Buffer {
    const buffers: Buffer[] = []
    for (let i = 0; i < Math.min(args.length, argDefs.length); i++) {
      const arg = args[i]
      const def = argDefs[i]

      if (def.type === 'u64' || def.type === 'u128') {
        const num = typeof arg === 'bigint' ? arg : BigInt(arg)
        const size = def.type === 'u128' ? 16 : 8
        const buf = Buffer.alloc(size)
        if (size === 16) {
          buf.writeBigUInt64LE(num & 0xffffffffffffffffn, 0)
          buf.writeBigUInt64LE(num >> 64n, 8)
        } else {
          buf.writeBigUInt64LE(num, 0)
        }
        buffers.push(buf)
      } else if (def.type === 'string') {
        buffers.push(Buffer.from(String(arg), 'utf8'))
      } else if (def.type === 'publicKey' || def.type === 'pubkey') {
        try {
          const pubkey = new PublicKey(arg)
          buffers.push(Buffer.from(pubkey.toBuffer()))
        } catch {
          buffers.push(Buffer.from(String(arg), 'utf8'))
        }
      } else {
        buffers.push(Buffer.from(String(arg), 'utf8'))
      }
    }
    // @ts-expect-error - Buffer.concat works correctly but TypeScript types are strict
    return Buffer.concat(buffers)
  }

  private async buildInstructionAccounts(
    action: any,
    executable: WarpExecutable,
    fromPubkey: PublicKey,
    programId: PublicKey
  ): Promise<Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>> {
    const accounts: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }> = []

    const accountInputs = this.extractAccountInputs(action, executable)
    if (accountInputs.length > 0) {
      for (const accountInput of accountInputs) {
        while (accounts.length < accountInput.index) {
          accounts.push({ pubkey: fromPubkey, isSigner: true, isWritable: true })
        }
        const address = await this.resolveAccountFromInput(accountInput, executable, fromPubkey)
        const { isSigner, isWritable } = this.determineAccountFlags(accountInput.input, address, fromPubkey)
        accounts.push({ pubkey: address, isSigner, isWritable })
      }
      return accounts
    }

    if (!action.accounts || !Array.isArray(action.accounts)) return accounts

    for (let idx = 0; idx < action.accounts.length; idx++) {
      const accountDef = action.accounts[idx]
      let address = this.extractAccountAddress(accountDef)

      if (address === '[object Object]' || (typeof accountDef === 'string' && accountDef === '[object Object]')) {
        address = fromPubkey.toBase58()
      } else if (!address || address.length === 0) {
        throw new Error(`Invalid account definition at index ${idx}: ${JSON.stringify(accountDef)}`)
      }

      if (address === '{{USER_WALLET}}' || (typeof address === 'string' && address.includes('{{USER_WALLET}}'))) {
        address = fromPubkey.toBase58()
      } else if (typeof address === 'string' && address.includes('{{')) {
        const originalAddress = address
        let maxIterations = 10
        while (address.includes('{{') && maxIterations-- > 0) {
          const beforeInterpolation: string = address
          address = this.interpolateAccountAddress(address, executable.resolvedInputs)
          if (address === beforeInterpolation) break
        }
        if (!address || (address.includes('{{') && !address.startsWith('{{USER_ATA:') && !address.startsWith('{{RECEIVER_ATA:'))) {
          throw new Error(`Failed to interpolate account address at index ${idx}: ${originalAddress} -> ${address}. ResolvedInputs: ${JSON.stringify(executable.resolvedInputs.map(r => ({ as: r.input?.as, value: r.value })))}`)
        }
      }

      const pubkey = await this.resolveAccountPubkey(address, fromPubkey)
      const { isSigner, isWritable } = this.determineAccountFlags(accountDef, pubkey, fromPubkey)
      accounts.push({ pubkey, isSigner, isWritable })
    }

    return accounts
  }

  private extractAccountInputs(action: any, executable: WarpExecutable): Array<{ input: any; index: number }> {
    if (!action.inputs || !Array.isArray(action.inputs)) return []

    const accountInputs: Array<{ input: any; index: number }> = []
    for (const input of action.inputs) {
      if (input.position && typeof input.position === 'string' && input.position.startsWith('account:')) {
        const index = parseInt(input.position.split(':')[1] || '0', 10)
        accountInputs.push({ input, index })
      }
    }
    return accountInputs.sort((a, b) => a.index - b.index)
  }

  private async resolveAccountFromInput(
    accountInput: { input: any; index: number },
    executable: WarpExecutable,
    fromPubkey: PublicKey
  ): Promise<PublicKey> {
    const resolved = executable.resolvedInputs.find((r: any) => r.input === accountInput.input || r.input?.as === accountInput.input.as)
    if (!resolved) {
      throw new Error(`Account input at index ${accountInput.index} not resolved: ${accountInput.input.as || accountInput.input.name}`)
    }

    let address = resolved.value
    if (typeof address === 'string' && address.includes(':')) {
      address = address.split(':')[1]
    }

    if (!address || typeof address !== 'string') {
      throw new Error(`Invalid address for account input at index ${accountInput.index}: ${accountInput.input.as || accountInput.input.name}`)
    }

    if (accountInput.input.as === 'USER_WALLET') {
      return fromPubkey
    }

    if (accountInput.input.as?.startsWith('USER_ATA:') || accountInput.input.as?.startsWith('RECEIVER_ATA:')) {
      return await this.resolveAccountPubkey(`{{${accountInput.input.as}}}`, fromPubkey)
    }

    return new PublicKey(address)
  }

  private interpolateAccountAddress(address: string, resolvedInputs: any[]): string {
    if (!address.includes('{{')) return address

    for (const resolved of resolvedInputs) {
      if (!resolved.input?.as) continue
      const placeholder = `{{${resolved.input.as.toUpperCase()}}}`
      if (address === placeholder || address.includes(placeholder)) {
        let value = resolved.value
        if (typeof value === 'string' && value.includes(':')) {
          value = value.split(':')[1]
        }
        if (value) {
          return address.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value))
        }
      }
    }

    for (const resolved of resolvedInputs) {
      if (!resolved.input?.name) continue
      const placeholder = `{{${resolved.input.name.toUpperCase().replace(/\s+/g, '_')}}}`
      if (address === placeholder || address.includes(placeholder)) {
        let value = resolved.value
        if (typeof value === 'string' && value.includes(':')) {
          value = value.split(':')[1]
        }
        if (value) {
          return address.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value))
        }
      }
    }

    return address
  }

  private async createTokenTransferTransaction(
    executable: WarpExecutable,
    userWallet: string,
    destinationPubkey: PublicKey
  ): Promise<VersionedTransaction> {
    if (executable.transfers.length === 0) throw new Error('WarpSolanaExecutor: No transfers provided')
    if (!this.chain.nativeToken?.identifier) throw new Error('WarpSolanaExecutor: No native token defined for this chain')

    const nativeId = this.chain.nativeToken.identifier
    const nativeTokenTransfers = executable.transfers.filter((t) => t.identifier === nativeId || t.identifier === WarpSolanaConstants.NativeToken.Identifier)
    const splTokenTransfers = executable.transfers.filter((t) => t.identifier !== nativeId && t.identifier !== WarpSolanaConstants.NativeToken.Identifier)

    if (nativeTokenTransfers.length === 1 && splTokenTransfers.length === 0) {
      const transfer = nativeTokenTransfers[0]
      if (transfer.amount <= 0n) throw new Error('WarpSolanaExecutor: Native token transfer amount must be positive')
      const fromPubkey = new PublicKey(userWallet)
      return this.setTransactionDefaults([SystemProgram.transfer({ fromPubkey, toPubkey: destinationPubkey, lamports: Number(transfer.amount) })], fromPubkey)
    }

    if (nativeTokenTransfers.length === 0 && splTokenTransfers.length === 1) {
      return this.createSingleTokenTransfer(executable, splTokenTransfers[0], userWallet, destinationPubkey)
    }

    if (executable.transfers.length > 1) throw new Error('WarpSolanaExecutor: Multiple token transfers not yet supported')
    throw new Error('WarpSolanaExecutor: Invalid transfer configuration')
  }

  private async createSingleTokenTransfer(
    executable: WarpExecutable,
    transfer: WarpChainAssetValue,
    userWallet: string,
    destinationPubkey: PublicKey
  ): Promise<VersionedTransaction> {
    const mintAddress = new PublicKey(transfer.identifier)
    const fromPubkey = new PublicKey(userWallet)
    const sourceTokenAccount = await getAssociatedTokenAddress(mintAddress, fromPubkey)
    const destinationTokenAccount = await getAssociatedTokenAddress(mintAddress, destinationPubkey)

    if (!(await this.connection.getAccountInfo(sourceTokenAccount))) {
      throw new Error('WarpSolanaExecutor: Source token account does not exist')
    }

    const instructions: TransactionInstruction[] = []
    if (!(await this.connection.getAccountInfo(destinationTokenAccount))) {
      instructions.push(createAssociatedTokenAccountInstruction(fromPubkey, destinationTokenAccount, destinationPubkey, mintAddress))
    }
    instructions.push(createTransferInstruction(sourceTokenAccount, destinationTokenAccount, fromPubkey, Number(transfer.amount)))

    return this.setTransactionDefaults(instructions, fromPubkey)
  }

  async executeQuery(executable: WarpExecutable): Promise<WarpActionExecutionResult> {
    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpQueryAction
    if (action.type !== 'query') throw new Error(`WarpSolanaExecutor: Invalid action type for executeQuery: ${action.type}`)
    if (!action.func) throw new Error('WarpSolanaExecutor: Query action must have a function name')

    if (!executable.destination) throw new Error('WarpSolanaExecutor: Query address is required')
    const queryAddress = new PublicKey(executable.destination)

    const nativeArgs = executable.args.map((arg) => this.serializer.coreSerializer.stringToNative(arg)[1])

    let decodedResult: any[] = []
    let isSuccess = true

    if (action.func === 'getAccount' || action.func === 'getAccountInfo') {
      const accountInfo = await this.connection.getAccountInfo(queryAddress)
      if (!accountInfo) {
        throw new Error('Account not found')
      }
      decodedResult = [
        accountInfo.lamports,
        accountInfo.owner.toBase58(),
        accountInfo.executable,
        accountInfo.rentEpoch,
        accountInfo.data.toString('base64'),
      ]
    } else if (action.func === 'getBalance') {
      const balance = await this.connection.getBalance(queryAddress)
      decodedResult = [balance.toString()]
    } else if (action.func === 'getProgramAccounts') {
      const accounts = await this.connection.getProgramAccounts(queryAddress)
      decodedResult = accounts.map((acc) => ({
        pubkey: acc.pubkey.toBase58(),
        account: {
          lamports: acc.account.lamports,
          owner: acc.account.owner.toBase58(),
          data: acc.account.data.toString('base64'),
        },
      }))
    } else {
      const accountInfo = await this.connection.getAccountInfo(queryAddress)
      if (!accountInfo) {
        throw new Error('Account not found')
      }
      decodedResult = [accountInfo.data.toString('base64')]
    }

    const { values, output } = await this.output.extractQueryOutput(executable.warp, decodedResult, executable.action, executable.resolvedInputs)

    const next = getNextInfo(this.config, [], executable.warp, executable.action, output)

    const destinationInput = executable.resolvedInputs.find((i) => i.input.position === 'receiver' || i.input.position === 'destination')
    const destination = destinationInput?.value || executable.destination

    const resolvedInputs = extractResolvedInputValues(executable.resolvedInputs)
    return {
      status: isSuccess ? 'success' : 'error',
      warp: executable.warp,
      action: executable.action,
      user: getWarpWalletAddressFromConfig(this.config, executable.chain.name),
      txHash: null,
      tx: null,
      next,
      values,
      output: { ...output, _DATA: decodedResult },
      messages: applyOutputToMessages(executable.warp, output, this.config),
      destination,
      resolvedInputs,
    }
  }

  async verifyMessage(message: string, signature: string): Promise<string> {
    try {
      const messageBytes = new TextEncoder().encode(message)
      const signatureBytes = Buffer.from(signature, 'base64')
      return ''
    } catch (error) {
      throw new Error(`Failed to verify message: ${error}`)
    }
  }

  private async setTransactionDefaults(instructions: TransactionInstruction[], fromPubkey: PublicKey | null): Promise<VersionedTransaction> {
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed')
    const allInstructions = this.addComputeBudgetInstructions(instructions)
    const accountMetaMap = this.buildAccountMetaMap(allInstructions, fromPubkey)
    const { signedAccounts, unsignedAccounts } = this.sortAccounts(accountMetaMap)
    const { staticAccountKeys, accountIndexMap } = this.buildAccountIndexMap(signedAccounts, unsignedAccounts)
    const compiledInstructions = this.compileInstructions(allInstructions, accountIndexMap)
    const messageV0 = this.buildMessageV0(blockhash, signedAccounts, unsignedAccounts, accountMetaMap, staticAccountKeys, compiledInstructions)

    const versionedTx = new VersionedTransaction(messageV0)
    if (versionedTx.version !== 0) {
      throw new Error(`Expected VersionedTransaction v0, got version: ${versionedTx.version}`)
    }

    return versionedTx
  }

  private toPublicKey(address: string, errorMsg: string): PublicKey {
    try {
      return new PublicKey(address)
    } catch {
      throw new Error(`WarpSolanaExecutor: ${errorMsg}`)
    }
  }

  private extractContractArgs(executable: WarpExecutable): string[] {
    if (executable.args.length > 0) return executable.args
    if (executable.resolvedInputs.length === 0) return []

    const argInputs = executable.resolvedInputs
      .filter((ri) => ri.input.position?.toString().startsWith('arg:'))
      .map((ri) => {
        const index = Math.max(0, parseInt(ri.input.position!.toString().split(':')[1] || '0', 10) - 1)
        return { index, value: ri.value }
      })
      .sort((a, b) => a.index - b.index)

    const maxIndex = Math.max(...argInputs.map((a) => a.index), -1)
    if (maxIndex < 0) return []

    const args = new Array(maxIndex + 1).fill(null)
    argInputs.forEach(({ index, value }) => {
      if (value) args[index] = value
    })
    return args.filter((arg): arg is string => arg !== null && arg !== undefined)
  }

  private buildInstructionData(action: any, nativeArgs: any[]): Buffer {
    if (!action.abi || typeof action.abi !== 'string') {
      return this.encodeBasicInstructionData(nativeArgs, action.func)
    }

    try {
      const abi = JSON.parse(action.abi)
      if (abi.instructions && abi.instructions[action.func]) {
        return this.encodeInstructionData(abi.instructions[action.func], nativeArgs, action.func)
      }
    } catch {
      // Fall through to basic encoding
    }

    return this.encodeBasicInstructionData(nativeArgs, action.func)
  }


  private extractAccountAddress(accountDef: any): string | undefined {
    if (typeof accountDef === 'string') return accountDef
    if (!accountDef || typeof accountDef !== 'object') return undefined

    const str = JSON.stringify(accountDef)
    if (str.includes('USER_WALLET') || str.includes('{{USER_WALLET}}')) return '{{USER_WALLET}}'
    if (str.includes('RECEIVER_ADDRESS') || str.includes('{{RECEIVER_ADDRESS}}')) return '{{RECEIVER_ADDRESS}}'
    if (str.includes('USER_ATA')) {
      const match = str.match(/USER_ATA[:\s]*([^"}\s]+)/)
      if (match) return `{{USER_ATA:${match[1]}}}`
    }

    const addrValue = accountDef.address || accountDef.pubkey || accountDef.value
    if (typeof addrValue === 'string') return addrValue
    if (addrValue?.toBase58) return addrValue.toBase58()
    if (addrValue?.identifier) return addrValue.identifier
    if (addrValue?.value) return addrValue.value

    const keys = Object.keys(accountDef)
    if (keys.length === 1 && typeof accountDef[keys[0]] === 'string') return accountDef[keys[0]]
    return undefined
  }

  private async resolveAccountPubkey(address: string, fromPubkey: PublicKey): Promise<PublicKey> {
    if (address.includes('{{USER_WALLET}}') || address === fromPubkey.toBase58()) {
      return fromPubkey
    }

    if (address.startsWith('{{USER_ATA:') && address.endsWith('}}')) {
      const mintAddress = address.slice(11, -2)
      if (!mintAddress || mintAddress.includes('{{')) {
        throw new Error(`Invalid USER_ATA placeholder: ${address}. Mint address must be resolved first.`)
      }
      const mintPubkey = new PublicKey(mintAddress)
      return await getAssociatedTokenAddress(mintPubkey, fromPubkey)
    }

    if (address.startsWith('{{RECEIVER_ATA:') && address.endsWith('}}')) {
      const content = address.slice(15, -2)
      const parts = content.split(':')
      if (parts.length === 2) {
        let mintAddress = parts[0]
        let receiverAddress = parts[1]
        if (mintAddress.includes('{{') || receiverAddress.includes('{{')) {
          throw new Error(`Invalid RECEIVER_ATA placeholder: ${address}. Mint and receiver addresses must be resolved first.`)
        }
        if (mintAddress.includes(':')) mintAddress = mintAddress.split(':')[1]
        if (receiverAddress.includes(':')) receiverAddress = receiverAddress.split(':')[1]
        const mintPubkey = new PublicKey(mintAddress)
        const receiverPubkey = new PublicKey(receiverAddress)
        return await getAssociatedTokenAddress(mintPubkey, receiverPubkey)
      }
    }

    return new PublicKey(address)
  }

  private determineAccountFlags(accountDef: any, pubkey: PublicKey, fromPubkey: PublicKey): { isSigner: boolean; isWritable: boolean } {
    const accountMeta = typeof accountDef === 'object' ? accountDef : {}

    if (pubkey.equals(fromPubkey)) {
      return { isSigner: true, isWritable: true }
    }

    const isSigner = accountMeta.signer === true
    const isWritable = typeof accountDef === 'object' && accountMeta.writable !== undefined ? accountMeta.writable !== false : true

    return { isSigner, isWritable }
  }

  private addComputeBudgetInstructions(instructions: TransactionInstruction[]): TransactionInstruction[] {
    const hasTokenTransfer = instructions.some((ix) => ix.programId.toBase58() === WarpSolanaConstants.Programs.TokenProgram)
    const computeUnits = hasTokenTransfer ? WarpSolanaConstants.ComputeUnitLimit.TokenTransfer : WarpSolanaConstants.ComputeUnitLimit.Default

    const computeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits })
    const computeUnitPriceIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: WarpSolanaConstants.PriorityFee.Default })

    return [computeUnitLimitIx, computeUnitPriceIx, ...instructions]
  }

  private buildAccountMetaMap(
    instructions: TransactionInstruction[],
    fromPubkey: PublicKey | null
  ): Map<string, { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }> {
    const accountMetaMap = new Map<string, { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>()

    if (fromPubkey) {
      accountMetaMap.set(fromPubkey.toBase58(), { pubkey: fromPubkey, isSigner: true, isWritable: true })
    }

    for (const ix of instructions) {
      const programIdStr = ix.programId.toBase58()
      if (!accountMetaMap.has(programIdStr)) {
        accountMetaMap.set(programIdStr, { pubkey: ix.programId, isSigner: false, isWritable: false })
      }

      for (const key of ix.keys) {
        const keyStr = key.pubkey.toBase58()
        const existing = accountMetaMap.get(keyStr)
        if (existing) {
          accountMetaMap.set(keyStr, {
            pubkey: key.pubkey,
            isSigner: existing.isSigner || key.isSigner,
            isWritable: existing.isWritable || key.isWritable,
          })
        } else {
          accountMetaMap.set(keyStr, {
            pubkey: key.pubkey,
            isSigner: key.isSigner,
            isWritable: key.isWritable,
          })
        }
      }
    }

    return accountMetaMap
  }

  private sortAccounts(accountMetaMap: Map<string, { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>): {
    signedAccounts: PublicKey[]
    unsignedAccounts: PublicKey[]
  } {
    const signedAccounts: PublicKey[] = []
    const unsignedAccounts: PublicKey[] = []

    for (const meta of accountMetaMap.values()) {
      ;(meta.isSigner ? signedAccounts : unsignedAccounts).push(meta.pubkey)
    }

    const sortByWritable = (a: PublicKey, b: PublicKey) =>
      (accountMetaMap.get(a.toBase58())!.isWritable ? 0 : 1) - (accountMetaMap.get(b.toBase58())!.isWritable ? 0 : 1)

    signedAccounts.sort(sortByWritable)
    unsignedAccounts.sort(sortByWritable)
    return { signedAccounts, unsignedAccounts }
  }

  private buildAccountIndexMap(
    signedAccounts: PublicKey[],
    unsignedAccounts: PublicKey[]
  ): { staticAccountKeys: PublicKey[]; accountIndexMap: Map<string, number> } {
    const staticAccountKeys = [...signedAccounts, ...unsignedAccounts]
    const accountIndexMap = new Map<string, number>()

    staticAccountKeys.forEach((key, index) => {
      accountIndexMap.set(key.toBase58(), index)
    })

    return { staticAccountKeys, accountIndexMap }
  }

  private compileInstructions(
    instructions: TransactionInstruction[],
    accountIndexMap: Map<string, number>
  ): Array<{ programIdIndex: number; accountKeyIndexes: number[]; data: Uint8Array }> {
    return instructions.map((ix) => {
      const programIdIndex = accountIndexMap.get(ix.programId.toBase58())!
      const accountKeyIndexes = ix.keys.map((key) => accountIndexMap.get(key.pubkey.toBase58())!)
      return {
        programIdIndex,
        accountKeyIndexes,
        data: Uint8Array.from(ix.data),
      }
    })
  }

  private buildMessageV0(
    blockhash: string,
    signedAccounts: PublicKey[],
    unsignedAccounts: PublicKey[],
    accountMetaMap: Map<string, { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>,
    staticAccountKeys: PublicKey[],
    compiledInstructions: Array<{ programIdIndex: number; accountKeyIndexes: number[]; data: Uint8Array }>
  ): MessageV0 {
    const getWritable = (key: PublicKey) => accountMetaMap.get(key.toBase58())!.isWritable
    return new MessageV0({
      header: {
        numRequiredSignatures: signedAccounts.length,
        numReadonlySignedAccounts: signedAccounts.filter((k) => !getWritable(k)).length,
        numReadonlyUnsignedAccounts: unsignedAccounts.filter((k) => !getWritable(k)).length,
      },
      staticAccountKeys,
      recentBlockhash: blockhash,
      compiledInstructions,
      addressTableLookups: [],
    })
  }
}
