import type { API } from './types'

class Logger {
  private api: API
  private channel: string

  constructor(name: string = 'log') {
    this.channel = `__electron_winston_${name}_handler__`

    this.api =
      (globalThis || window).__ELECTRON_WINSTON__ ||
      (globalThis || window).electron
  }

  info(...args: any[]): void {
    this.api.ipcRenderer.send(this.channel, 'info', ...args)
  }

  error(...args: any[]): void {
    if (args.length === 1 && args[0] instanceof Error) {
      this.api.ipcRenderer.send(this.channel, 'error', `${args[0].stack}`)
    } else {
      this.api.ipcRenderer.send(this.channel, 'error', ...args)
    }
  }

  warn(...args: any[]): void {
    this.api.ipcRenderer.send(this.channel, 'warn', ...args)
  }
}

export default new Logger()
