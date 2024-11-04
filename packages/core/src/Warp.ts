import { transformWarp } from './helpers'
import {
    NetworkId,
    WarpAction
} from './types'

type Options = {
  network?: NetworkId
}

const ArgBigIntPrefix = 'big:'

const QueryParams = {
  Title: 'title',
  Description: 'description',
  Actions: 'actions',
  AccessToken: 'accessToken',
}

export class Warp {
  public name: string | null = null
  public description: string | null = null
  public actions: WarpAction[] = []

  constructor(name: string, description?: string | null) {
    this.name = name
    this.description = description
  }

  addAction(action: WarpAction): Warp {
    this.actions.push(action)
    return this
  }

  toObject(): object {
    return transformWarp(this)
  }
}
