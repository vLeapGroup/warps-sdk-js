import { Warp, WarpAction } from './types'

export class WarpBuilder {
  public name: string | null = null
  public description: string | null = null
  public actions: WarpAction[] = []

  private constructor(name: string, description?: string | null) {
    this.name = name || null
    this.description = description || null
  }

  static create(name: string, description?: string | null): WarpBuilder {
    return new WarpBuilder(name, description)
  }

  addAction(action: WarpAction): WarpBuilder {
    this.actions.push(action)
    return this
  }

  build(): Warp {
    if (!this.name) {
      throw new Error('Warp name is required')
    }

    return {
      name: this.name,
      description: this.description,
      actions: this.actions,
    }
  }
}
