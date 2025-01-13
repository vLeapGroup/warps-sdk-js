import {
  Address,
  AddressValue,
  BigUIntType,
  BigUIntValue,
  BooleanValue,
  BytesValue,
  CodeMetadata,
  CodeMetadataValue,
  CompositeType,
  CompositeValue,
  Field,
  FieldDefinition,
  List,
  NothingValue,
  OptionalValue,
  OptionValue,
  StringValue,
  Struct,
  StructType,
  TokenIdentifierType,
  TokenIdentifierValue,
  TokenTransfer,
  TypedValue,
  U16Value,
  U32Value,
  U64Type,
  U64Value,
  U8Value,
  VariadicValue,
} from '@multiversx/sdk-core/out'

export const option = (value: TypedValue | null): OptionValue => (value ? OptionValue.newProvided(value) : OptionValue.newMissing())

export const optional = (value: TypedValue | null): OptionalValue =>
  value ? new OptionalValue(value.getType(), value) : OptionalValue.newMissing()

export const list = (values: TypedValue[]): List => {
  if (values.length === 0) {
    throw new Error('Cannot create a list from an empty array')
  }
  const type = values[0].getType()
  return new List(type, values)
}

export const variadic = (values: TypedValue[]): VariadicValue => VariadicValue.fromItems(...values)

export const composite = (values: TypedValue[]): CompositeValue => {
  const types = values.map((value) => value.getType())
  return new CompositeValue(new CompositeType(...types), values)
}

export const string = (value: string): StringValue => StringValue.fromUTF8(value)

export const u8 = (value: number): U8Value => new U8Value(value)

export const u16 = (value: number): U16Value => new U16Value(value)

export const u32 = (value: number): U32Value => new U32Value(value)

export const u64 = (value: bigint): U64Value => new U64Value(value)

export const biguint = (value: bigint | string | number): BigUIntValue => new BigUIntValue(BigInt(value))

export const boolean = (value: boolean): BooleanValue => new BooleanValue(value)

export const address = (value: string): AddressValue => new AddressValue(Address.newFromBech32(value))

export const token = (value: string): TokenIdentifierValue => new TokenIdentifierValue(value)

export const hex = (value: string): BytesValue => BytesValue.fromHex(value)

export const esdt = (value: TokenTransfer): Struct =>
  new Struct(
    new StructType('EsdtTokenPayment', [
      new FieldDefinition('token_identifier', '', new TokenIdentifierType()),
      new FieldDefinition('token_nonce', '', new U64Type()),
      new FieldDefinition('amount', '', new BigUIntType()),
    ]),
    [
      new Field(new TokenIdentifierValue(value.token.identifier), 'token_identifier'),
      new Field(new U64Value(BigInt(value.token.nonce)), 'token_nonce'),
      new Field(new BigUIntValue(BigInt(value.amount)), 'amount'),
    ]
  )

export const codemeta = (hexString: string): CodeMetadataValue =>
  new CodeMetadataValue(CodeMetadata.fromBuffer(Buffer.from(hexString, 'hex')))

export const nothing = (): NothingValue => new NothingValue()
