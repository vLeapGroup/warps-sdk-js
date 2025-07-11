import { WarpMeta } from './warp'

export type WarpAbi = {
  protocol: string
  content: WarpAbiContents
  meta?: WarpMeta
}

export type WarpAbiContents = {
  name?: string
  constructor?: any
  upgradeConstructor?: any
  endpoints?: any[]
  types?: Record<string, any>
  events?: any[]
}
