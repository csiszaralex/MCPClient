import 'dotenv/config';

export interface ServerConfig {
  name: string;
  command: string;
  args: string[];
}

export class ConfigService {
  private _anthropicApiKey: string;
  private _servers: ServerConfig[];
  private _logLevel: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("HIÁNYZÓ KONFIGURÁCIÓ: 'ANTHROPIC_API_KEY' nincs beállítva a .env fájlban.");
    }
    this._anthropicApiKey = apiKey;

    this._logLevel = process.env.LOG_LEVEL || 'info';

    this._servers = [
      // { name: 'TODO', command: 'node', args: ['./path/to/todo/dist/index.js'] },
      // { name: 'USER', command: 'node', args: ['./path/to/user/dist/index.js'] },
      {
        name: 'WEATHER',
        command: 'node',
        args: ['D:\\02_Suli\\Onlab2\\MCP_weather\\build\\index.js'],
      },
    ];
  }

  get anthropicApiKey(): string {
    return this._anthropicApiKey;
  }

  get servers(): ServerConfig[] {
    return this._servers;
  }

  get logLevel(): string {
    return this._logLevel;
  }
}
