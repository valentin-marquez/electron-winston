import path from 'node:path'
import util from 'node:util'
import { format, transports, createLogger } from 'winston'
import { app, ipcMain } from 'electron'

import type { Logger as WinstonLogger } from 'winston'

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export type LoggerOptions = {
  filename?: string
  maxsize?: number
  maxFiles?: number
  fileLogLevel?: LogLevel
  consoleLogLevel?: LogLevel
  handleExceptions?: boolean
  handleRejections?: boolean
}

export class Logger {
  private logger!: WinstonLogger
  private renderLogger?: WinstonLogger

  constructor(readonly options?: LoggerOptions) {
    const {
      filename,
      maxsize = 1048576 * 20,
      maxFiles = 2,
      fileLogLevel = 'info',
      consoleLogLevel = 'debug',
      handleExceptions = false,
      handleRejections = false
    } = options || {}

    const printf = format.printf(
      (info) =>
        `[${info.timestamp}] [${info.level}] ${info.pid ? '[renderer] ' : ''}${info.message}`
    )

    this.logger = createLogger({
      exitOnError: false,
      transports: [
        new transports.File({
          filename: filename || path.join(app.getPath('logs'), 'log.log'),
          format: format.combine(
            format.timestamp({
              format: 'MM-DD HH:mm:ss.SSS'
            }),
            format.errors({ stack: true }),
            printf
          ),
          level: fileLogLevel,
          maxFiles,
          maxsize,
          tailable: true,
          handleExceptions,
          handleRejections
        })
      ]
    })

    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(
        new transports.Console({
          format: format.combine(
            format.timestamp({
              format: 'HH:mm:ss.SSS'
            }),
            format.colorize(),
            printf
          ),
          handleExceptions,
          handleRejections,
          level: consoleLogLevel
        })
      )
    }
  }

  /**
   * Register the logger ipc handler for renderer.
   * @param name The name used to define the renderer logger. Default to `log`.
   */
  registerRendererListener(name?: string): void {
    this.renderLogger = this.logger.child({ pid: 'renderer' })
    const channel = `__electron_winston_${name || 'log'}_handler__`
    if (!ipcMain.eventNames().some((e) => e === channel)) {
      ipcMain.on(channel, (_, level: string, ...args: any[]) => {
        const message = util.format(...args)
        this.renderLogger?.log(level, message)
      })
    }
  }

  info(...args: any[]): void {
    this.logger.info(util.format(...args))
  }

  error(...args: any[]): void {
    if (args.length === 1 && args[0] instanceof Error) {
      this.logger.error(`${args[0].stack}`)
    } else {
      this.logger.error(util.format(...args))
    }
  }

  warn(...args: any[]): void {
    this.logger.warn(util.format(...args))
  }
}
