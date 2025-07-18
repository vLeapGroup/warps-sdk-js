import { getLatestProtocolIdentifier, toPreviewText } from './helpers'
import { BaseWarpBuilder, Warp, WarpAction, WarpClientConfig } from './types'
import { WarpValidator } from './WarpValidator'

export class WarpBuilder implements BaseWarpBuilder {
  private pendingWarp: Warp = {
    protocol: getLatestProtocolIdentifier('warp'),
    name: '',
    title: '',
    description: null,
    preview: '',
    actions: [],
  }

  constructor(protected readonly config: WarpClientConfig) {}

  async createFromRaw(encoded: string, validate = true): Promise<Warp> {
    const warp = JSON.parse(encoded) as Warp

    if (validate) {
      await this.validate(warp)
    }

    return warp
  }

  setName(name: string): WarpBuilder {
    this.pendingWarp.name = name
    return this
  }

  setTitle(title: string): WarpBuilder {
    this.pendingWarp.title = title
    return this
  }

  setDescription(description: string): WarpBuilder {
    this.pendingWarp.description = description
    return this
  }

  setPreview(preview: string): WarpBuilder {
    this.pendingWarp.preview = preview
    return this
  }

  setActions(actions: WarpAction[]): WarpBuilder {
    this.pendingWarp.actions = actions
    return this
  }

  addAction(action: WarpAction): WarpBuilder {
    this.pendingWarp.actions.push(action)
    return this
  }

  async build(): Promise<Warp> {
    this.ensure(this.pendingWarp.protocol, 'protocol is required')
    this.ensure(this.pendingWarp.name, 'name is required')
    this.ensure(this.pendingWarp.title, 'title is required')
    this.ensure(this.pendingWarp.actions.length > 0, 'actions are required')

    await this.validate(this.pendingWarp)

    return this.pendingWarp
  }

  getDescriptionPreview(description: string, maxChars = 100): string {
    return toPreviewText(description, maxChars)
  }

  private ensure(value: string | null | boolean, errorMessage: string): void {
    if (!value) {
      throw new Error(errorMessage)
    }
  }

  private async validate(warp: Warp): Promise<void> {
    const validator = new WarpValidator(this.config)
    const validationResult = await validator.validate(warp)

    if (!validationResult.valid) {
      throw new Error(validationResult.errors.join('\n'))
    }
  }
}
