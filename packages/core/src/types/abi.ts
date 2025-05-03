import { WarpMeta } from './warp'

export type WarpAbi = {
  protocol: string
  content: AbiContents
  meta?: WarpMeta
}

export type AbiContents = {
  name?: string
  constructor?: any
  upgradeConstructor?: any
  endpoints?: any[]
  types?: Record<string, any>
  events?: any[]
}
