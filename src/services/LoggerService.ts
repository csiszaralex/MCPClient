import pino from 'pino';
import { ConfigService } from './ConfigService.js';

export class LoggerService {
  private logger: pino.Logger;

  constructor(config: ConfigService) {
    const fileTransport = pino.destination({
      dest: './app.log',
      sync: false,
      minLength: 4096,
    });

    this.logger = pino(
      {
        level: config.logLevel,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      },
      fileTransport
    );
    process.on('exit', () => fileTransport.flushSync());
  }

  info(msg: string, data?: object) {
    this.logger.info(data, msg);
  }

  error(msg: string, error?: unknown) {
    this.logger.error({ err: error }, msg);
  }

  warn(msg: string, data?: object) {
    this.logger.warn(data, msg);
  }

  debug(msg: string, data?: object) {
    this.logger.debug(data, msg);
  }

  // Optional: create contextual child logger for components
  withContext(context: object) {
    const child = this.logger.child(context);
    return {
      info: (msg: string, data?: object) => child.info(data, msg),
      error: (msg: string, error?: unknown) => child.error({ err: error }, msg),
      warn: (msg: string, data?: object) => child.warn(data, msg),
      debug: (msg: string, data?: object) => child.debug(data, msg),
    };
  }
}
