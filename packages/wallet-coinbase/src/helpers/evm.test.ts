import { formatTransactionForCoinbase } from './evm'

describe('formatTransactionForCoinbase', () => {
  it('should format BigInt values to hex strings', () => {
    const tx = {
      value: 1000000000000000000n,
      maxFeePerGas: 20000000000n,
      maxPriorityFeePerGas: 1000000000n,
      gasLimit: 21000n,
      nonce: 5n,
      chainId: 1,
    }

    const result = formatTransactionForCoinbase(tx, 1)

    expect(result.value).toBe('0xde0b6b3a7640000')
    expect(result.maxFeePerGas).toBe('0x4a817c800')
    expect(result.maxPriorityFeePerGas).toBe('0x3b9aca00')
    expect(result.gas).toBe('0x5208')
    expect(result.nonce).toBe('0x5')
  })

  it('should format number values to hex strings', () => {
    const tx = {
      value: 1000000000000000000,
      maxFeePerGas: 20000000000,
      maxPriorityFeePerGas: 1000000000,
      gasLimit: 21000,
      nonce: 5,
      chainId: 1,
    }

    const result = formatTransactionForCoinbase(tx, 1)

    expect(result.value).toBe('0xde0b6b3a7640000')
    expect(result.maxFeePerGas).toBe('0x4a817c800')
    expect(result.maxPriorityFeePerGas).toBe('0x3b9aca00')
    expect(result.gas).toBe('0x5208')
    expect(result.nonce).toBe('0x5')
  })

  it('should keep existing hex strings as-is', () => {
    const tx = {
      value: '0xde0b6b3a7640000',
      maxFeePerGas: '0x4a817c800',
      maxPriorityFeePerGas: '0x3b9aca00',
      data: '0x1234',
      chainId: 1,
    }

    const result = formatTransactionForCoinbase(tx, 1)

    expect(result.value).toBe('0xde0b6b3a7640000')
    expect(result.maxFeePerGas).toBe('0x4a817c800')
    expect(result.maxPriorityFeePerGas).toBe('0x3b9aca00')
    expect(result.data).toBe('0x1234')
  })

  it('should set default value to 0x0 when value is undefined', () => {
    const tx = {
      to: '0x1234567890123456789012345678901234567890',
      chainId: 1,
    }

    const result = formatTransactionForCoinbase(tx, 1)

    expect(result.value).toBe('0x0')
    expect(result.data).toBe('0x')
  })

  it('should use chainId from parameter when tx.chainId is undefined', () => {
    const tx = {
      to: '0x1234567890123456789012345678901234567890',
    }

    const result = formatTransactionForCoinbase(tx, 11155111)

    expect(result.chainId).toBe(11155111)
  })

  it('should use tx.chainId when provided', () => {
    const tx = {
      to: '0x1234567890123456789012345678901234567890',
      chainId: 8453,
    }

    const result = formatTransactionForCoinbase(tx, 1)

    expect(result.chainId).toBe(8453)
  })

  it('should handle string chainId', () => {
    const tx = {
      to: '0x1234567890123456789012345678901234567890',
      chainId: '8453',
    }

    const result = formatTransactionForCoinbase(tx, 1)

    expect(result.chainId).toBe(8453)
  })

  it('should preserve all transaction fields', () => {
    const tx = {
      to: '0x9876543210987654321098765432109876543210',
      from: '0x1234567890123456789012345678901234567890',
      value: 1000000000000000000n,
      data: '0x1234',
      chainId: 1,
    }

    const result = formatTransactionForCoinbase(tx, 1)

    expect(result.to).toBe(tx.to)
    expect(result.from).toBe(tx.from)
    expect(result.data).toBe(tx.data)
  })

  it('should handle undefined optional fields', () => {
    const tx = {
      to: '0x1234567890123456789012345678901234567890',
      chainId: 1,
    }

    const result = formatTransactionForCoinbase(tx, 1)

    expect(result.value).toBe('0x0')
    expect(result.data).toBe('0x')
    expect(result.gas).toBeUndefined()
    expect(result.nonce).toBeUndefined()
    expect(result.maxFeePerGas).toBeDefined()
    expect(result.maxPriorityFeePerGas).toBeDefined()
    expect(BigInt(result.maxFeePerGas!)).toBeGreaterThan(0n)
    expect(BigInt(result.maxPriorityFeePerGas!)).toBeGreaterThan(0n)
  })

  it('should normalize priority fee when it exceeds max fee', () => {
    const tx = {
      to: '0x1234567890123456789012345678901234567890',
      maxFeePerGas: '0x155cc',
      maxPriorityFeePerGas: '0xf424',
      chainId: 1,
    }

    const result = formatTransactionForCoinbase(tx, 1)

    const maxFee = BigInt(result.maxFeePerGas!)
    const maxPriorityFee = BigInt(result.maxPriorityFeePerGas!)
    expect(maxPriorityFee <= maxFee).toBe(true)
  })

  it('should normalize priority fee from BigInt values', () => {
    const tx = {
      to: '0x1234567890123456789012345678901234567890',
      maxFeePerGas: 1000000n,
      maxPriorityFeePerGas: 2000000n,
      chainId: 1,
    }

    const result = formatTransactionForCoinbase(tx, 1)

    const maxFee = BigInt(result.maxFeePerGas!)
    const maxPriorityFee = BigInt(result.maxPriorityFeePerGas!)
    expect(maxPriorityFee <= maxFee).toBe(true)
  })
})
