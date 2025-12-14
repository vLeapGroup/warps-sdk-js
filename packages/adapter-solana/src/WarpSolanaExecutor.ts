import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token'
import { ComputeBudgetProgram, Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
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

  async createTransaction(executable: WarpExecutable): Promise<Transaction> {
    const action = getWarpActionByIndex(executable.warp, executable.action)

    let tx: Transaction | null = null
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

  async createTransferTransaction(executable: WarpExecutable): Promise<Transaction> {
    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpSolanaExecutor: createTransfer - user address not set')
    if (!executable.destination) throw new Error('WarpSolanaExecutor: Destination address is required')
    let destinationPubkey: PublicKey
    try {
      destinationPubkey = new PublicKey(executable.destination)
    } catch (error) {
      throw new Error('WarpSolanaExecutor: Invalid destination address')
    }

    if (executable.transfers && executable.transfers.length > 0) {
      return this.createTokenTransferTransaction(executable, userWallet, destinationPubkey)
    }

    const fromPubkey = new PublicKey(userWallet as string)
    const transaction = new Transaction()

    if (executable.value > 0n) {
      transaction.add(SystemProgram.transfer({ fromPubkey, toPubkey: destinationPubkey, lamports: Number(executable.value) }))
    }

    if (executable.data) {
      const data = this.serializer.stringToTyped(executable.data)
      if (data && typeof data === 'string') {
        const dataBuffer = Buffer.from(data, 'base64')
        const instruction = new TransactionInstruction({
          keys: [
            { pubkey: fromPubkey, isSigner: true, isWritable: true },
            { pubkey: destinationPubkey, isSigner: false, isWritable: true },
          ],
          programId: destinationPubkey,
          data: dataBuffer,
        })
        transaction.add(instruction)
      }
    }

    return this.setTransactionDefaults(transaction, fromPubkey)
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<Transaction> {
    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpSolanaExecutor: createContractCall - user address not set')

    const action = getWarpActionByIndex(executable.warp, executable.action)
    if (!action || !('func' in action) || !action.func) throw new Error('WarpSolanaExecutor: Contract action must have a function name')
    if (!executable.destination) throw new Error('WarpSolanaExecutor: Contract address is required')
    const programId = new PublicKey(executable.destination)

    const fromPubkey = new PublicKey(userWallet)
    const transaction = new Transaction()

    try {
      const nativeArgs = executable.args.map((arg) => this.serializer.coreSerializer.stringToNative(arg)[1])

      let instructionData: Buffer = Buffer.alloc(0)

      if (action.abi && typeof action.abi === 'string') {
        try {
          const abi = JSON.parse(action.abi)
          if (abi.instructions && abi.instructions[action.func]) {
            const instructionDef = abi.instructions[action.func]
            instructionData = this.encodeInstructionData(instructionDef, nativeArgs, action.func)
          } else if (abi.accounts || abi.types) {
            instructionData = this.encodeBasicInstructionData(nativeArgs, action.func)
          }
        } catch {
          instructionData = this.encodeBasicInstructionData(nativeArgs, action.func)
        }
      } else {
        instructionData = this.encodeBasicInstructionData(nativeArgs, action.func)
      }

      const accounts = this.buildInstructionAccounts(action, executable, fromPubkey, programId)

      const instruction = new TransactionInstruction({
        keys: accounts,
        programId,
        data: instructionData,
      })

      transaction.add(instruction)

      if (executable.value > 0n) {
        transaction.add(SystemProgram.transfer({ fromPubkey, toPubkey: programId, lamports: Number(executable.value) }))
      }

      return this.setTransactionDefaults(transaction, fromPubkey)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`WarpSolanaExecutor: Failed to create contract call: ${errorMessage}`)
    }
  }

  private encodeInstructionData(instructionDef: any, args: any[], funcName: string): Buffer {
    try {
      const data = Buffer.alloc(8)
      if (instructionDef.discriminator && Buffer.isBuffer(instructionDef.discriminator)) {
        data.set(instructionDef.discriminator.subarray(0, Math.min(8, instructionDef.discriminator.length)), 0)
      } else {
        const hash = Buffer.from(funcName).subarray(0, 8)
        data.set(hash, 0)
      }

      if (args.length > 0 && instructionDef.args) {
        const encodedArgs = this.encodeArgs(args, instructionDef.args)
        // @ts-expect-error - Buffer.concat accepts Buffer[] which extends Uint8Array[]
        return Buffer.concat([data, encodedArgs])
      }

      return data
    } catch {
      return this.encodeBasicInstructionData(args, funcName)
    }
  }

  private encodeBasicInstructionData(args: any[], funcName: string): Buffer {
    const funcHash = Buffer.from(funcName).subarray(0, 8)
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
      // @ts-expect-error - Buffer.concat accepts Buffer[] which extends Uint8Array[]
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
          buffers.push(pubkey.toBuffer())
        } catch {
          buffers.push(Buffer.from(String(arg), 'utf8'))
        }
      } else {
        buffers.push(Buffer.from(String(arg), 'utf8'))
      }
    }
    // @ts-expect-error - Buffer.concat accepts Buffer[] which extends Uint8Array[]
    return Buffer.concat(buffers)
  }

  private buildInstructionAccounts(
    action: any,
    executable: WarpExecutable,
    fromPubkey: PublicKey,
    programId: PublicKey
  ): Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }> {
    const accounts: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }> = [
      { pubkey: fromPubkey, isSigner: true, isWritable: true },
    ]

    if (action.accounts && Array.isArray(action.accounts)) {
      for (const accountDef of action.accounts) {
        try {
          const pubkey = new PublicKey(accountDef.address || accountDef.pubkey || executable.destination)
          accounts.push({
            pubkey,
            isSigner: accountDef.signer === true,
            isWritable: accountDef.writable !== false,
          })
        } catch {
          continue
        }
      }
    }

    if (!accounts.some((acc) => acc.pubkey.equals(programId))) {
      accounts.push({ pubkey: programId, isSigner: false, isWritable: false })
    }

    return accounts
  }

  private async createTokenTransferTransaction(
    executable: WarpExecutable,
    userWallet: string,
    destinationPubkey: PublicKey
  ): Promise<Transaction> {
    if (executable.transfers.length === 0) throw new Error('WarpSolanaExecutor: No transfers provided')
    if (!this.chain.nativeToken?.identifier) throw new Error('WarpSolanaExecutor: No native token defined for this chain')

    const nativeTokenTransfers = executable.transfers.filter(
      (transfer) =>
        transfer.identifier === this.chain.nativeToken!.identifier || transfer.identifier === WarpSolanaConstants.NativeToken.Identifier
    )
    const splTokenTransfers = executable.transfers.filter(
      (transfer) =>
        transfer.identifier !== this.chain.nativeToken!.identifier && transfer.identifier !== WarpSolanaConstants.NativeToken.Identifier
    )

    if (nativeTokenTransfers.length === 1 && splTokenTransfers.length === 0) {
      const transfer = nativeTokenTransfers[0]
      if (transfer.amount <= 0n) throw new Error('WarpSolanaExecutor: Native token transfer amount must be positive')

      const fromPubkey = new PublicKey(userWallet)
      const transaction = new Transaction()
      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey: destinationPubkey,
          lamports: Number(transfer.amount),
        })
      )

      return this.setTransactionDefaults(transaction, fromPubkey)
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
  ): Promise<Transaction> {
    let mintAddress: PublicKey
    try {
      mintAddress = new PublicKey(transfer.identifier)
    } catch {
      throw new Error(`WarpSolanaExecutor: Invalid token address: ${transfer.identifier}`)
    }

    const fromPubkey = new PublicKey(userWallet)
    const transaction = new Transaction()

    const sourceTokenAccount = await getAssociatedTokenAddress(mintAddress, fromPubkey)
    const destinationTokenAccount = await getAssociatedTokenAddress(mintAddress, destinationPubkey)

    const sourceAccountInfo = await this.connection.getAccountInfo(sourceTokenAccount)
    if (!sourceAccountInfo) {
      throw new Error('WarpSolanaExecutor: Source token account does not exist')
    }

    const destinationAccountInfo = await this.connection.getAccountInfo(destinationTokenAccount)
    if (!destinationAccountInfo) {
      transaction.add(createAssociatedTokenAccountInstruction(fromPubkey, destinationTokenAccount, destinationPubkey, mintAddress))
    }

    transaction.add(createTransferInstruction(sourceTokenAccount, destinationTokenAccount, fromPubkey, Number(transfer.amount)))

    return this.setTransactionDefaults(transaction, fromPubkey as PublicKey)
  }

  async executeQuery(executable: WarpExecutable): Promise<WarpActionExecutionResult> {
    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpQueryAction
    if (action.type !== 'query') throw new Error(`WarpSolanaExecutor: Invalid action type for executeQuery: ${action.type}`)
    if (!action.func) throw new Error('WarpSolanaExecutor: Query action must have a function name')

    let queryAddress: PublicKey
    try {
      if (!executable.destination) throw new Error('WarpSolanaExecutor: Query address is required')
      queryAddress = new PublicKey(executable.destination)
    } catch {
      throw new Error(`WarpSolanaExecutor: Invalid address for query: ${executable.destination}`)
    }

    try {
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

      const { values, output } = await this.output.extractQueryOutput(
        executable.warp,
        decodedResult,
        executable.action,
        executable.resolvedInputs
      )

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const destinationInput = executable.resolvedInputs.find((i) => i.input.position === 'receiver' || i.input.position === 'destination')
      const destination = destinationInput?.value || executable.destination

      const resolvedInputs = extractResolvedInputValues(executable.resolvedInputs)
      return {
        status: 'error',
        warp: executable.warp,
        action: executable.action,
        user: getWarpWalletAddressFromConfig(this.config, executable.chain.name),
        txHash: null,
        tx: null,
        next: null,
        values: { string: [], native: [], mapped: {} },
        output: { _DATA: errorMessage, _ERROR: errorMessage },
        messages: {},
        destination,
        resolvedInputs,
      }
    }
  }

  async verifyMessage(message: string, signature: string): Promise<string> {
    try {
      const messageBytes = new TextEncoder().encode(message)
      const signatureBytes = Buffer.from(signature, 'base64')
      // Solana message verification would require the public key
      // This is a simplified version
      return ''
    } catch (error) {
      throw new Error(`Failed to verify message: ${error}`)
    }
  }

  private async setTransactionDefaults(transaction: Transaction, fromPubkey: PublicKey | null): Promise<Transaction> {
    try {
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      if (fromPubkey) {
        transaction.feePayer = fromPubkey
      }

      const instructions = transaction.instructions
      const hasTransfer = instructions.some((ix) => ix.programId.equals(SystemProgram.programId) && ix.data.length === 4)
      const hasTokenTransfer = instructions.some((ix) => ix.programId.toBase58() === WarpSolanaConstants.Programs.TokenProgram)

      let computeUnits = WarpSolanaConstants.ComputeUnitLimit.Default
      if (hasTransfer && !hasTokenTransfer) {
        computeUnits = WarpSolanaConstants.ComputeUnitLimit.Transfer
      } else if (hasTokenTransfer) {
        computeUnits = WarpSolanaConstants.ComputeUnitLimit.TokenTransfer
      } else {
        computeUnits = WarpSolanaConstants.ComputeUnitLimit.ContractCall
      }

      const computeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
        units: computeUnits,
      })

      const computeUnitPriceIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: WarpSolanaConstants.PriorityFee.Default,
      })

      transaction.instructions = [computeUnitLimitIx, computeUnitPriceIx, ...transaction.instructions]

      return transaction
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`WarpSolanaExecutor: Failed to set transaction defaults: ${errorMessage}`)
    }
  }
}
