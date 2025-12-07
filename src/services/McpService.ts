import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ServerConfig } from './ConfigService.js';
import { LoggerService } from './LoggerService.js';

type ToolReference = { client: Client; serverName: string };

export class McpService {
  private clients: Map<string, Client> = new Map();
  private toolMap: Map<string, ToolReference> = new Map();

  // Konstruktorban kapjuk meg a Loggert
  constructor(private logger: LoggerService) {}

  async connectServers(configs: ServerConfig[]) {
    for (const config of configs) {
      try {
        const start = Date.now();
        const transport = new StdioClientTransport({
          command: config.command,
          args: config.args,
        });
        const client = new Client({ name: 'McpClient', version: '1.0' }, { capabilities: {} });
        await client.connect(transport);

        this.clients.set(config.name, client);
        await this.registerTools(client, config.name);

        const durationMs = Date.now() - start;
        this.logger.info('Szerver csatlakoztatva', { server: config.name, durationMs });
      } catch (error) {
        this.logger.error(`Nem sikerült csatlakozni: ${config.name}`, error);
      }
    }
  }

  private async registerTools(client: Client, serverName: string) {
    const start = Date.now();
    const result = await client.listTools();
    for (const tool of result.tools) {
      this.toolMap.set(tool.name, { client, serverName });
      this.logger.debug('Tool regisztralva', {
        server: serverName,
        tool: tool.name,
        description: tool.description,
      });
    }
    const durationMs = Date.now() - start;
    this.logger.info('Toolok regisztralasa kesz', {
      server: serverName,
      toolCount: result.tools.length,
      durationMs,
    });
  }

  // Visszaadja a toolokat Anthropic altal fogyaszthato formatumban
  getToolsForAi() {
    // Megjegyzes: Itt idealis esetben cache-ből dolgozunk
    // A pelda kedveert most egyszerűsítve:
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

  // Segedfüggveny, mert a fenti async map Promise-okat ad vissza
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

    const start = Date.now();
    this.logger.info('Tool hívas indul', {
      server: ref.serverName,
      tool: name,
      args,
    });

    const result = await ref.client.callTool({
      name,
      arguments: args,
    });

    const durationMs = Date.now() - start;
    const contentSummary = Array.isArray(result.content)
      ? result.content.map((c) => c.type).join(',')
      : 'unknown';

    this.logger.info('Tool hívas befejeződott', {
      server: ref.serverName,
      tool: name,
      durationMs,
      contentTypes: contentSummary,
    });

    return result;
  }

  async closeAll() {
    // Lezaras implementacio (opcionalis, de ajanlott)
  }
}
