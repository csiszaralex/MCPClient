import { IAgentUi } from './interfaces/IAgentUi.js';
import { AiService } from './services/AiService.js';
import { LoggerService } from './services/LoggerService.js';
import { McpService } from './services/McpService.js';
import { TransactionService } from './services/TransactionService.js';

export class Agent {
  private history: any[] = [];

  constructor(
    private mcp: McpService,
    private ai: AiService,
    private ui: IAgentUi,
    private logger: LoggerService,
    private transactionService: TransactionService
  ) {}

  async start() {
    this.ui.logSystem("Chat elindítva. Kilepeshez írd be: 'exit'");

    while (true) {
      // 1. Új user input bekerese
      const userInput = await this.ui.ask('\n👤 Te: ');

      // 2. Kilepes kezelese
      if (userInput.toLowerCase() === 'exit') {
        this.ui.logSystem('Kliens leallítasa... Viszlat!');
        break;
      }

      // 3. User input hozzaadasa a historyhoz
      this.logger.info('Felhasznaloi bevitel', { textLength: userInput.length });
      await this.transactionService.record('USER_INPUT', 'user', 'agent', { content: userInput });
      this.history.push({ role: 'user', content: userInput });

      // 4. A valaszgeneralas es tool hasznalat (Belső Loop) elindítasa
      await this.processLoop();
    }
  }

  // Ez a metodus kezeli az EGYETLEN valaszhoz tartozo tool hívasokat (recursively)
  private async processLoop() {
    const toolsDef = await this.mcp.getAllToolsDefinition();
    this.logger.debug('Tool definíciok betoltve', { toolCount: toolsDef.length });

    // Belső ciklus: addig fut, amíg az AI toolokat akar hasznalni
    while (true) {
      this.ui.logSystem('AI gondolkodik...');
      this.logger.info('AI kor indul');

      try {
        const response = await this.ai.generateResponse(this.history, toolsDef);

        // Fontos: Az AI valaszat elmentjük a kozos historyba
        this.history.push({ role: 'assistant', content: response.content });
        const types = response.content?.map((b: any) => b.type) ?? [];
        this.logger.info('AI tartalom', { contentTypes: types });

        // Megnezzük, van-e tool_use
        const toolBlocks = response.content.filter((b) => b.type === 'tool_use');

        // HA NINCS TOOL HÍVaS -> Vegeztünk ezzel a korrel, visszaterünk a külső loopba
        if (toolBlocks.length === 0) {
          const textBlock = response.content.find((b) => b.type === 'text');
          if (textBlock) this.ui.logResponse(textBlock.text);
          if (textBlock) this.logger.info('AI valasz szoveggel', { length: textBlock.text.length });
          break; // Kilep a processLoop-bol, de a start() loopja folytatodik
        }

        // HA VAN TOOL HÍVaS -> Vegrehajtjuk őket
        const toolResults = [];

        for (const block of toolBlocks) {
          if (block.type !== 'tool_use') continue;

          const serverName = this.mcp.getServerNameForTool(block.name);
          const allowed = await this.ui.requestApproval(serverName, block.name, block.input);
          this.logger.info('Tool engedelykeres', {
            server: serverName,
            tool: block.name,
            approved: allowed,
          });

          let contentStr = '';
          let isError = false;

          if (allowed) {
            try {
              this.ui.logSystem('Tool futtatasa...');
              const start = Date.now();
              await this.transactionService.record('TOOL_EXECUTION', 'agent', serverName, { tool: block.name, input: block.input });
              const result: any = await this.mcp.executeTool(block.name, block.input);

              // MCP eredmeny konvertalasa stringge
              contentStr = (result as any).content
                .map((c: any) => (c.type === 'text' ? c.text : JSON.stringify(c)))
                .join('\n');

              this.ui.logSystem('Tool sikeresen lefutott.');
              this.logger.info('Tool futas sikeres', {
                tool: block.name,
                durationMs: Date.now() - start,
              });
              await this.transactionService.record('TOOL_RESULT', serverName, 'agent', { tool: block.name, result: contentStr, durationMs: Date.now() - start });

            } catch (err: any) {
              contentStr = `Error executing tool: ${err.message}`;
              isError = true;
              this.logger.error('Tool futas hiba', err);
              await this.transactionService.record('TOOL_RESULT', serverName, 'agent', { tool: block.name, error: err.message, isError: true });
            }
          } else {
            contentStr = 'User denied this action.';
            isError = true;
            this.ui.logSystem('Tool futtatasa elutasítva.');
            this.logger.warn('Tool futtatas elutasítva', { tool: block.name });
            await this.transactionService.record('TOOL_RESULT', serverName, 'agent', { tool: block.name, error: 'User denied', isError: true });
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: contentStr,
            is_error: isError,
          });
        }

        // Az eredmenyeket visszaküldjük a historyba, es a while(true) újraindul
        // hogy az AI reagalhasson az eredmenyekre
        this.history.push({ role: 'user', content: toolResults });
        this.logger.debug('Tool eredmenyek visszaküldve az AI-nak', { count: toolResults.length });
      } catch (error: any) {
        this.logger.error('AI Error', error);
        this.ui.logSystem('Hiba tortent az AI kommunikacioban. Probald újra.');
        break; // Hiba eseten megszakítjuk a jelenlegi feldolgozast
      }
    }
  }
}
