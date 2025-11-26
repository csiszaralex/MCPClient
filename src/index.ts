import { Agent } from "./Agent.js";
import { AiService } from "./services/AiService.js";
import { McpService } from "./services/McpService.js";
import { UiService } from "./services/UiService.js";
import { ConfigService } from "./services/configService.js";
import { LoggerService } from "./services/loggerService.js";

(async () => {
  let logger: LoggerService | undefined;

  try {
    // 1. Config betöltése (validációval)
    const configService = new ConfigService();

    // 2. Logger inicializálása
    logger = new LoggerService(configService);
    logger.info("Rendszer indítása...");

    // 3. Service-ek példányosítása (Dependency Injection)
    // Most már mindenki megkapja a loggert és/vagy a configot
    const uiService = new UiService();
    const mcpService = new McpService(logger); // McpService kap loggert
    const aiService = new AiService(configService, logger); // AiService kap configot és loggert

    // 4. Csatlakozás
    logger.info("Szerverek csatlakoztatása folyamatban...");
    await mcpService.connectServers(configService.servers);

    // 5. Agent indítása
    const agent = new Agent(mcpService, aiService, uiService, logger);
    await agent.start();

  } catch (error: any) {
    // Ha még a logger sem jött létre, console.error kell
    if (logger) {
      logger.error("Végzetes hiba történt", error);
    } else {
      console.error("[FATAL]", error.message);
    }
    process.exit(1);
  }
})();
