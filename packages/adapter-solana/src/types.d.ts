declare module '@solana/kit' {
  export function createKeyPairSignerFromBytes(bytes: Uint8Array): Promise<{
    signMessage: (message: Uint8Array) => Promise<Uint8Array>
    signTransaction: (transaction: unknown) => Promise<unknown>
  }>
  
  export function isDurableNonceTransaction(transaction: any): boolean
}

declare module '@x402/svm/exact/client' {
  export function registerExactSvmScheme(client: unknown, options: { signer: unknown }): void
}
