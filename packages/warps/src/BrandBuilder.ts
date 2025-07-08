import { Address, Transaction, TransactionOnNetwork, TransactionsFactoryConfig, TransferTransactionsFactory } from '@multiversx/sdk-core'
import { WarpMultiversxExecutor } from '@vleap/warps-adapter-multiversx'
import { getLatestProtocolIdentifier, getMainChainInfo, WarpBrand, WarpConfig, WarpInitConfig, WarpLogger } from '@vleap/warps-core'
import { WarpBrandColors, WarpBrandCta, WarpBrandUrls } from '@vleap/warps-core/src/types'
import Ajv from 'ajv'
import { Buffer } from 'buffer'

export class BrandBuilder {
  private config: WarpInitConfig

  private pendingBrand: WarpBrand = {
    protocol: getLatestProtocolIdentifier('brand'),
    name: '',
    description: '',
    logo: '',
  }

  constructor(config: WarpInitConfig) {
    this.config = config
  }

  createInscriptionTransaction(brand: WarpBrand): Transaction {
    if (!this.config.user?.wallet) throw new Error('BrandBuilder: user address not set')
    const chain = getMainChainInfo(this.config)
    const factoryConfig = new TransactionsFactoryConfig({ chainID: chain.chainId })
    const factory = new TransferTransactionsFactory({ config: factoryConfig })
    const sender = Address.newFromBech32(this.config.user.wallet)
    const serialized = JSON.stringify(brand)

    return factory.createTransactionForNativeTokenTransfer(sender, {
      receiver: Address.newFromBech32(this.config.user.wallet),
      nativeAmount: BigInt(0),
      data: Uint8Array.from(Buffer.from(serialized)),
    })
  }

  async createFromRaw(encoded: string, validateSchema = true): Promise<WarpBrand> {
    const brand = JSON.parse(encoded) as WarpBrand

    if (validateSchema) {
      await this.ensureValidSchema(brand)
    }

    return brand
  }

  async createFromTransaction(tx: TransactionOnNetwork, validateSchema = false): Promise<WarpBrand> {
    return await this.createFromRaw(tx.data.toString(), validateSchema)
  }

  async createFromTransactionHash(hash: string): Promise<WarpBrand | null> {
    const chainInfo = getMainChainInfo(this.config)
    const chainEntry = WarpMultiversxExecutor.getChainEntrypoint(chainInfo, this.config.env)
    const chainProvider = chainEntry.createNetworkProvider()

    try {
      const tx = await chainProvider.getTransaction(hash)
      return this.createFromTransaction(tx)
    } catch (error) {
      WarpLogger.error('BrandBuilder: Error creating from transaction hash', error)
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

  setUrls(urls: WarpBrandUrls): BrandBuilder {
    this.pendingBrand.urls = urls
    return this
  }

  setColors(colors: WarpBrandColors): BrandBuilder {
    this.pendingBrand.colors = colors
    return this
  }

  setCta(cta: WarpBrandCta): BrandBuilder {
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
