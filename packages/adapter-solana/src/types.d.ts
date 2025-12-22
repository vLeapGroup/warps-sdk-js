declare module '@solana/kit' {
  export function createKeyPairSignerFromBytes(bytes: Uint8Array): Promise<{
    signMessage: (message: Uint8Array) => Promise<Uint8Array>
    signTransaction: (transaction: unknown) => Promise<unknown>
  }>
}

declare module '@x402/svm/exact/client' {
  export function registerExactSvmScheme(client: unknown, options: { signer: unknown }): void
}
