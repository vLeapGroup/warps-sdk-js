import Ajv from 'ajv'
import { Config } from './config'
import { Warp, WarpConfig } from './types'

export class WarpValidator {
  constructor(private config: WarpConfig) {
    this.config = config
  }

  async validate(warp: Warp): Promise<void> {
    await this.ensureValidSchema(warp)
  }

  private async ensureValidSchema(warp: Warp): Promise<void> {
    const schemaUrl = this.config.warpSchemaUrl || Config.LatestWarpSchemaUrl
    const schemaResponse = await fetch(schemaUrl)
    const schema = await schemaResponse.json()
    const ajv = new Ajv()
    const validate = ajv.compile(schema)

    if (!validate(warp)) {
      throw new Error(`WarpBuilder: schema validation failed: ${ajv.errorsText(validate.errors)}`)
    }
  }
}
