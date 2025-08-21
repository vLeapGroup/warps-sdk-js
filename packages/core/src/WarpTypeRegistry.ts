import { WarpTypeHandler, WarpTypeRegistry } from './types'

export class WarpTypeRegistryImpl implements WarpTypeRegistry {
  private typeHandlers = new Map<string, WarpTypeHandler>()

  registerType(typeName: string, handler: WarpTypeHandler): void {
    if (this.typeHandlers.has(typeName)) {
      throw new Error(`Type '${typeName}' is already registered`)
    }
    this.typeHandlers.set(typeName, handler)
  }

  hasType(typeName: string): boolean {
    return this.typeHandlers.has(typeName)
  }

  getHandler(typeName: string): WarpTypeHandler | undefined {
    return this.typeHandlers.get(typeName)
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.typeHandlers.keys())
  }
}
