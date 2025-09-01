// Native tokens have identifiers that do not follow the ESDT token format, e.g. EGLD, VIBE
export const isNativeToken = (identifier: string): boolean => !identifier.includes('-')
