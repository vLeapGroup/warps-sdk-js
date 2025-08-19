export interface TransformRunner {
  run(code: string, context: any): Promise<any>
}

export type ClientTransformConfig = {
  runner?: TransformRunner | null
}
