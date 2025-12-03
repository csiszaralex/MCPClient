import { IAgentUi } from './interfaces/IAgentUi.js';
import { AiService } from './services/AiService.js';
import { McpService } from './services/McpService.js';
import { LoggerService } from './services/loggerService.js';

export class Agent {
  private history: any[] = [];

  constructor(
    private mcp: McpService,
    private ai: AiService,
    private ui: IAgentUi,
    private logger: LoggerService
  ) {}

  async start() {
    this.ui.logSystem("Chat elindítva. Kilépéshez írd be: 'exit'");

    while (true) {
      // 1. Új user input bekérése
      const userInput = await this.ui.ask('\n👤 Te: ');

      // 2. Kilépés kezelése
      if (userInput.toLowerCase() === 'exit') {
        this.ui.logSystem('Kliens leállítása... Viszlát!');
        break;
      }

      // 3. User input hozzáadása a historyhoz
      this.history.push({ role: 'user', content: userInput });

      // 4. A válaszgenerálás és tool használat (Belső Loop) elindítása
      await this.processLoop();
    }
  }

  // Ez a metódus kezeli az EGYETLEN válaszhoz tartozó tool hívásokat (recursively)
  private async processLoop() {
    const toolsDef = await this.mcp.getAllToolsDefinition();

    // Belső ciklus: addig fut, amíg az AI toolokat akar használni
    while (true) {
      this.ui.logSystem('AI gondolkodik...');

      try {
        const response = await this.ai.generateResponse(this.history, toolsDef);

        // Fontos: Az AI válaszát elmentjük a közös historyba
        this.history.push({ role: 'assistant', content: response.content });

        // Megnézzük, van-e tool_use
        const toolBlocks = response.content.filter((b) => b.type === 'tool_use');

        // HA NINCS TOOL HÍVÁS -> Végeztünk ezzel a körrel, visszatérünk a külső loopba
        if (toolBlocks.length === 0) {
          const textBlock = response.content.find((b) => b.type === 'text');
          if (textBlock) this.ui.logResponse(textBlock.text);
          break; // Kilép a processLoop-ból, de a start() loopja folytatódik
        }

        // HA VAN TOOL HÍVÁS -> Végrehajtjuk őket
        const toolResults = [];

        for (const block of toolBlocks) {
          if (block.type !== 'tool_use') continue;

          const serverName = this.mcp.getServerNameForTool(block.name);
          const allowed = await this.ui.requestApproval(serverName, block.name, block.input);

          let contentStr = '';
          let isError = false;

          if (allowed) {
            try {
              this.ui.logSystem('Tool futtatása...');
              const result = await this.mcp.executeTool(block.name, block.input);

              // MCP eredmény konvertálása stringgé
              contentStr = result.content
                .map((c) => (c.type === 'text' ? c.text : JSON.stringify(c)))
                .join('\n');

              this.ui.logSystem('Tool sikeresen lefutott.');
            } catch (err: any) {
              contentStr = `Error executing tool: ${err.message}`;
              isError = true;
            }
          } else {
            contentStr = 'User denied this action.';
            isError = true;
            this.ui.logSystem('Tool futtatása elutasítva.');
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: contentStr,
            is_error: isError,
          });
        }

        // Az eredményeket visszaküldjük a historyba, és a while(true) újraindul
        // hogy az AI reagálhasson az eredményekre
        this.history.push({ role: 'user', content: toolResults });
      } catch (error: any) {
        console.error('AI Error:', error);
        this.ui.logSystem('Hiba történt az AI kommunikációban. Próbáld újra.');
        break; // Hiba esetén megszakítjuk a jelenlegi feldolgozást
      }
    }
  }
}
