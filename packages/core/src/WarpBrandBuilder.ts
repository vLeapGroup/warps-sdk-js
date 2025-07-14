import Ajv from 'ajv'
import { WarpConfig } from './config'
import { getLatestProtocolIdentifier } from './helpers'
import { WarpBrand, WarpBrandColors, WarpBrandCta, WarpBrandUrls, WarpClientConfig } from './types'

export class WarpBrandBuilder {
  private config: WarpClientConfig

  private pendingBrand: WarpBrand = {
    protocol: getLatestProtocolIdentifier('brand'),
    name: '',
    description: '',
    logo: '',
  }

  constructor(config: WarpClientConfig) {
    this.config = config
  }

  async createFromRaw(encoded: string, validateSchema = true): Promise<WarpBrand> {
    const brand = JSON.parse(encoded) as WarpBrand

    if (validateSchema) {
      await this.ensureValidSchema(brand)
    }

    return brand
  }

  setName(name: string): WarpBrandBuilder {
    this.pendingBrand.name = name
    return this
  }

  setDescription(description: string): WarpBrandBuilder {
    this.pendingBrand.description = description
    return this
  }

  setLogo(logo: string): WarpBrandBuilder {
    this.pendingBrand.logo = logo
    return this
  }

  setUrls(urls: WarpBrandUrls): WarpBrandBuilder {
    this.pendingBrand.urls = urls
    return this
  }

  setColors(colors: WarpBrandColors): WarpBrandBuilder {
    this.pendingBrand.colors = colors
    return this
  }

  setCta(cta: WarpBrandCta): WarpBrandBuilder {
    this.pendingBrand.cta = cta
    return this
  }

  async build(): Promise<WarpBrand> {
    this.ensure(this.pendingBrand.name, 'name is required')
    this.ensure(this.pendingBrand.description, 'description is required')
    this.ensure(this.pendingBrand.logo, 'logo is required')

    await this.ensureValidSchema(this.pendingBrand)

    return this.pendingBrand
  }

  private ensure(value: string | null | boolean, errorMessage: string): void {
    if (!value) {
      throw new Error(`Warp: ${errorMessage}`)
    }
  }

  private async ensureValidSchema(brand: WarpBrand): Promise<void> {
    const schemaUrl = this.config.schema?.brand || WarpConfig.LatestBrandSchemaUrl
    const schemaResponse = await fetch(schemaUrl)
    const schema = await schemaResponse.json()
    const ajv = new Ajv()
    const validate = ajv.compile(schema)

    if (!validate(brand)) {
      throw new Error(`BrandBuilder: schema validation failed: ${ajv.errorsText(validate.errors)}`)
    }
  }
}
