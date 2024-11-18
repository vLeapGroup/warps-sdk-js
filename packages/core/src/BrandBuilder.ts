import {
  Address,
  ApiNetworkProvider,
  Transaction,
  TransactionOnNetwork,
  TransactionsFactoryConfig,
  TransferTransactionsFactory,
} from '@multiversx/sdk-core'
import Ajv from 'ajv'
import { Config } from './config'
import { getChainId, getLatestProtocolIdentifier } from './helpers'
import { Brand, BrandColors, BrandCta, BrandUrls, WarpConfig } from './types'

export class BrandBuilder {
  private config: WarpConfig

  private pendingBrand: Brand = {
    protocol: getLatestProtocolIdentifier(Config.ProtocolNameBrand),
    name: '',
    description: '',
    logo: '',
  }

  constructor(config: WarpConfig) {
    this.config = config
  }

  createInscriptionTransaction(brand: Brand): Transaction {
    if (!this.config.userAddress) throw new Error('BrandBuilder: user address not set')
    const factoryConfig = new TransactionsFactoryConfig({ chainID: getChainId(this.config.env) })
    const factory = new TransferTransactionsFactory({ config: factoryConfig })

    const serialized = JSON.stringify(brand)

    return factory.createTransactionForNativeTokenTransfer({
      sender: Address.newFromBech32(this.config.userAddress),
      receiver: Address.newFromBech32(this.config.userAddress),
      nativeAmount: BigInt(0),
      data: Buffer.from(serialized).valueOf(),
    })
  }

  async createFromRaw(encoded: string, validateSchema = true): Promise<Brand> {
    const brand = JSON.parse(encoded) as Brand

    if (validateSchema) {
      await this.ensureValidSchema(brand)
    }

    return brand
  }

  async createFromTransaction(tx: TransactionOnNetwork, validateSchema = false): Promise<Brand> {
    return await this.createFromRaw(tx.data.toString(), validateSchema)
  }

  async createFromTransactionHash(hash: string): Promise<Brand | null> {
    const networkProvider = new ApiNetworkProvider(this.config.chainApiUrl || Config.Chain.ApiUrl(this.config.env))

    try {
      const tx = await networkProvider.getTransaction(hash)
      return this.createFromTransaction(tx)
    } catch (error) {
      console.error('BrandBuilder: Error creating from transaction hash', error)
      return null
    }
  }

  setName(name: string): BrandBuilder {
    this.pendingBrand.name = name
    return this
  }

  setDescription(description: string): BrandBuilder {
    this.pendingBrand.description = description
    return this
  }

  setLogo(logo: string): BrandBuilder {
    this.pendingBrand.logo = logo
    return this
  }

  setUrls(urls: BrandUrls): BrandBuilder {
    this.pendingBrand.urls = urls
    return this
  }

  setColors(colors: BrandColors): BrandBuilder {
    this.pendingBrand.colors = colors
    return this
  }

  setCta(cta: BrandCta): BrandBuilder {
    this.pendingBrand.cta = cta
    return this
  }

  async build(): Promise<Brand> {
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

  private async ensureValidSchema(brand: Brand): Promise<void> {
    const schemaUrl = this.config.brandSchemaUrl || Config.LatestBrandSchemaUrl
    const schemaResponse = await fetch(schemaUrl)
    const schema = await schemaResponse.json()
    const ajv = new Ajv()
    const validate = ajv.compile(schema)

    if (!validate(brand)) {
      throw new Error(`BrandBuilder: schema validation failed: ${ajv.errorsText(validate.errors)}`)
    }
  }
}
