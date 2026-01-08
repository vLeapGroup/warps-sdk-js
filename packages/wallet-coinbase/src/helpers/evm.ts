import { WarpAdapterGenericTransaction } from '@joai/warps'

const formatBigInt = (value: bigint | string | number | undefined): string | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'bigint') {
    const hex = value.toString(16)
    return `0x${hex}`
  }
  if (typeof value === 'string' && value.startsWith('0x')) {
    const parsed = BigInt(value)
    return `0x${parsed.toString(16)}`
  }
  const parsed = BigInt(value)
  return `0x${parsed.toString(16)}`
}

const parseBigInt = (value: bigint | string | number | undefined): bigint | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'bigint') return value
  return BigInt(value)
}

const normalizePriorityFee = (maxFee: bigint, maxPriorityFee: bigint): bigint => {
  if (maxFee <= 0n) return 1n
  if (maxPriorityFee <= maxFee) return maxPriorityFee
  const safeFee = maxFee / 10n
  return safeFee < 1n ? 1n : safeFee
}

export const formatTransactionForCoinbase = (tx: WarpAdapterGenericTransaction, chainId: number | string): WarpAdapterGenericTransaction => {
  const MIN_FEE = 1000000000n

  let maxFee: bigint
  let maxPriorityFee: bigint

  if (tx.maxFeePerGas !== undefined && tx.maxPriorityFeePerGas !== undefined) {
    maxFee = parseBigInt(tx.maxFeePerGas)!
    maxPriorityFee = parseBigInt(tx.maxPriorityFeePerGas)!
    if (maxFee < MIN_FEE) maxFee = MIN_FEE
    maxPriorityFee = normalizePriorityFee(maxFee, maxPriorityFee)
  } else if (tx.gasPrice !== undefined) {
    const gasPrice = parseBigInt(tx.gasPrice)!
    maxFee = gasPrice < MIN_FEE ? MIN_FEE : gasPrice
    maxPriorityFee = normalizePriorityFee(maxFee, (maxFee * 9n) / 10n)
  } else {
    maxFee = MIN_FEE
    maxPriorityFee = MIN_FEE / 10n
  }

  if (maxPriorityFee >= maxFee) maxPriorityFee = maxFee / 10n
  if (maxPriorityFee < 1n) maxPriorityFee = 1n

  const finalMaxFee = maxFee
  let finalMaxPriorityFee = maxPriorityFee

  const MIN_PRIORITY_FEE = 100000000n
  if (finalMaxFee >= MIN_PRIORITY_FEE * 10n && finalMaxPriorityFee < MIN_PRIORITY_FEE) {
    finalMaxPriorityFee = MIN_PRIORITY_FEE
  }

  if (finalMaxPriorityFee >= finalMaxFee) {
    finalMaxPriorityFee = finalMaxFee / 10n
  }

  if (finalMaxPriorityFee < 1n) {
    finalMaxPriorityFee = 1n
  }

  const formatted: any = {
    to: tx.to,
    value: formatBigInt(tx.value) || '0x0',
    data: tx.data || '0x',
    chainId: typeof tx.chainId === 'number' ? tx.chainId : parseInt(String(tx.chainId || chainId)),
    maxFeePerGas: formatBigInt(finalMaxFee)!,
    maxPriorityFeePerGas: formatBigInt(finalMaxPriorityFee)!,
  }

  if (tx.from) formatted.from = tx.from
  if (tx.gasLimit) formatted.gas = formatBigInt(tx.gasLimit)
  if (tx.nonce !== undefined) formatted.nonce = typeof tx.nonce === 'number' ? `0x${tx.nonce.toString(16)}` : formatBigInt(tx.nonce)
  if (tx.type) formatted.type = tx.type
  if (tx.accessList) formatted.accessList = tx.accessList

  delete formatted.gasPrice

  return formatted
}
