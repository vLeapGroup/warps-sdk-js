import { TxComponents, WarpActionExecutor } from '../WarpActionExecutor'
import { WarpExecutionResults } from './results'
import { ResolvedInput, Warp, WarpContractAction, WarpInitConfig } from './warp'

export interface IChainSerializer<T> {
  stringToTyped(arg: string): T
}

export interface IChainFactory<T> {
  createTransfer(components: TxComponents): Promise<T>
  createContractCall(components: TxComponents, action: WarpContractAction): Promise<T>
  executeQuery(components: TxComponents): Promise<T>
}

export interface IChainAdapter {
  config: WarpInitConfig
  serializer(): IChainSerializer<any>
  factory(): IChainFactory<any>
  results(): IChainResults<any>
}

export interface IChainResults<T> {
  extractContractResults(
    executor: WarpActionExecutor,
    warp: Warp,
    action: WarpContractAction,
    tx: T,
    actionIndex: number,
    inputs: ResolvedInput[]
  ): Promise<{ values: any[]; results: WarpExecutionResults; success: boolean; txHash: string }>

  extractQueryResults(
    executor: WarpActionExecutor,
    warp: Warp,
    tx: T,
    actionIndex: number,
    inputs: ResolvedInput[]
  ): Promise<{ values: any[]; results: WarpExecutionResults; success: boolean; txHash: string }>

  extractCollectResults(
    executor: WarpActionExecutor,
    warp: Warp,
    tx: T,
    actionIndex: number,
    inputs: ResolvedInput[]
  ): Promise<{ values: any[]; results: WarpExecutionResults; success: boolean; txHash: string }>
}
