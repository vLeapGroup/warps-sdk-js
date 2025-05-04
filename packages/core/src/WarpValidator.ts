import Ajv from 'ajv'
import { Config } from './config'
import { Warp, WarpConfig } from './types'

export class WarpValidator {
  constructor(private config: WarpConfig) {
    this.config = config
  }

  async validate(warp: Warp): Promise<void> {
    this.ensureMaxOneValuePosition(warp)

    this.ensureVariableNamesAndResultNamesUppercase(warp)

    this.ensureAbiIsSetIfApplicable(warp)

    await this.ensureValidSchema(warp)
  }

  private ensureMaxOneValuePosition(warp: Warp): void {
    const position = warp.actions.filter((action) => {
      if (!action.inputs) return false
      return action.inputs.some((input) => input.position === 'value')
    })

    if (position.length > 1) {
      throw new Error('WarpBuilder: only one value position action is allowed')
    }
  }

  private ensureVariableNamesAndResultNamesUppercase(warp: Warp): void {
    const validateUppercase = (obj: Record<string, any> | undefined) => {
      if (!obj) return
      Object.keys(obj).forEach((key) => {
        if (key !== key.toUpperCase()) {
          throw new Error(`WarpValidator: variable/result name '${key}' must be uppercase`)
        }
      })
    }

    validateUppercase(warp.vars)
    validateUppercase(warp.results)
  }

  private ensureAbiIsSetIfApplicable(warp: Warp): void {
    const hasContractAction = warp.actions.some((action) => action.type === 'contract')
    const hasQueryAction = warp.actions.some((action) => action.type === 'query')

    if (!hasContractAction && !hasQueryAction) {
      return
    }

    this.throwUnless(!!warp.results, 'results are required if there are contract or query actions')
  }

  private async ensureValidSchema(warp: Warp): Promise<void> {
    const schemaUrl = this.config.warpSchemaUrl || Config.LatestWarpSchemaUrl
    const schemaResponse = await fetch(schemaUrl)
    const schema = await schemaResponse.json()
    const ajv = new Ajv()
    const validate = ajv.compile(schema)

    this.throwUnless(validate(warp), `WarpValidator: schema validation failed: ${ajv.errorsText(validate.errors)}`)
  }

  private throwUnless(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`WarpValidator: ${message}`)
    }
  }
}
