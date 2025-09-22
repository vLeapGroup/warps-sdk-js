import { AdapterTypeRegistry, WarpTypeHandler } from './types'

export class WarpTypeRegistry implements AdapterTypeRegistry {
  private typeHandlers = new Map<string, WarpTypeHandler>()
  private typeAliases = new Map<string, string>()

  registerType(typeName: string, handler: WarpTypeHandler): void {
    this.typeHandlers.set(typeName, handler)
  }

  registerTypeAlias(typeName: string, alias: string): void {
    this.typeAliases.set(typeName, alias)
  }

  hasType(typeName: string): boolean {
    return this.typeHandlers.has(typeName) || this.typeAliases.has(typeName)
  }

  getHandler(typeName: string): WarpTypeHandler | undefined {
    // Check if this is an alias first
    const alias = this.typeAliases.get(typeName)
    if (alias) {
      return this.getHandler(alias) // Recursive call to resolve the alias
    }
    return this.typeHandlers.get(typeName)
  }

  getAlias(typeName: string): string | undefined {
    return this.typeAliases.get(typeName)
  }

  // Resolve the final type name (handles aliases recursively)
  resolveType(typeName: string): string {
    const alias = this.typeAliases.get(typeName)
    return alias ? this.resolveType(alias) : typeName
  }

  getRegisteredTypes(): string[] {
    return Array.from(new Set([...this.typeHandlers.keys(), ...this.typeAliases.keys()]))
  }
}
