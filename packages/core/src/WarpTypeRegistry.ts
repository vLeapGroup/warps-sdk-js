import { WarpTypeHandler, WarpTypeRegistry } from './types'

export class WarpTypeRegistryImpl implements WarpTypeRegistry {
  private typeHandlers = new Map<string, WarpTypeHandler>()

  registerType(typeName: string, handler: WarpTypeHandler): void {
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
