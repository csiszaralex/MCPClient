import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ServerConfig } from './configService.js';
import { LoggerService } from './loggerService.js';

type ToolReference = { client: Client; serverName: string };

export class McpService {
  private clients: Map<string, Client> = new Map();
  private toolMap: Map<string, ToolReference> = new Map();

  // Konstruktorban kapjuk meg a Loggert
  constructor(private logger: LoggerService) {}

  async connectServers(configs: ServerConfig[]) {
    for (const config of configs) {
      try {
        const transport = new StdioClientTransport({
          command: config.command,
          args: config.args,
        });
        const client = new Client({ name: 'McpClient', version: '1.0' }, { capabilities: {} });
        await client.connect(transport);

        this.clients.set(config.name, client);
        await this.registerTools(client, config.name);

        // Console.log helyett:
        this.logger.info(`Szerver csatlakoztatva: ${config.name}`);
      } catch (error) {
        this.logger.error(`Nem sikerült csatlakozni: ${config.name}`, error);
      }
    }
  }

  private async registerTools(client: Client, serverName: string) {
    const result = await client.listTools();
    for (const tool of result.tools) {
      this.toolMap.set(tool.name, { client, serverName });
    }
  }

  // Visszaadja a toolokat Anthropic által fogyasztható formátumban
  getToolsForAi() {
    // Megjegyzés: Itt ideális esetben cache-ből dolgozunk
    // A példa kedvéért most egyszerűsítve:
    return Array.from(this.toolMap.entries()).map(async ([name, ref]) => {
      const tools = await ref.client.listTools();
      const t = tools.tools.find((x) => x.name === name);
      return {
        name: t!.name,
        description: t!.description,
        input_schema: t!.inputSchema as any,
      };
    });
  }

  // Segédfüggvény, mert a fenti async map Promise-okat ad vissza
  async getAllToolsDefinition() {
    const promises = this.getToolsForAi();
    return Promise.all(promises);
  }

  getServerNameForTool(toolName: string): string {
    return this.toolMap.get(toolName)?.serverName || 'Unknown';
  }

  async executeTool(name: string, args: any) {
    const ref = this.toolMap.get(name);
    if (!ref) throw new Error(`Tool not found: ${name}`);

    const result = await ref.client.callTool({
      name,
      arguments: args,
    });
    return result;
  }

  async closeAll() {
    // Lezárás implementáció (opcionális, de ajánlott)
  }
}
