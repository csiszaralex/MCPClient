import { Agent } from './Agent.js';
import { AiService } from './services/AiService.js';
import { ConfigService } from './services/ConfigService.js';
import { LoggerService } from './services/LoggerService.js';
import { McpService } from './services/McpService.js';
import { TransactionService } from './services/TransactionService.js';
import { UiService } from './services/UiService.js';

(async () => {
  let logger: LoggerService | undefined;

  try {
    // 1. Config betoltese (validacioval)
    const configService = new ConfigService();

    // 2. Logger inicializalasa
    logger = new LoggerService(configService);
    logger.info('Rendszer indítasa...');

    // 3. Service-ek peldanyosítasa (Dependency Injection)
    // Most mar mindenki megkapja a loggert es/vagy a configot
    const transactionService = new TransactionService();
    const uiService = new UiService();
    const mcpService = new McpService(logger); // McpService kap loggert
    const aiService = new AiService(configService, logger, transactionService); // AiService kap configot es loggert

    // 4. Csatlakozas
    logger.info('Szerverek csatlakoztatasa folyamatban...');
    await mcpService.connectServers(configService.servers);

    // 5. Agent indítasa
    const agent = new Agent(mcpService, aiService, uiService, logger, transactionService);
    await agent.start();
  } catch (error: any) {
    // Ha meg a logger sem jott letre, console.error kell
    if (logger) {
      logger.error('Vegzetes hiba tortent', error);
    } else {
      console.error('[FATAL]', error.message);
    }
    process.exit(1);
  }
})();
