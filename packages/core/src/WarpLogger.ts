export class WarpLogger {
  private static isTestEnv = typeof process !== 'undefined' && process.env.JEST_WORKER_ID !== undefined

  static info(...args: any[]): void {
    if (!WarpLogger.isTestEnv) {
      // eslint-disable-next-line no-console
      console.info(...args)
    }
  }

  static warn(...args: any[]): void {
    if (!WarpLogger.isTestEnv) {
      // eslint-disable-next-line no-console
      console.warn(...args)
    }
  }

  static error(...args: any[]): void {
    if (!WarpLogger.isTestEnv) {
      // eslint-disable-next-line no-console
      console.error(...args)
    }
  }
}
