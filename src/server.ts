import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import { ConfigService } from "./services/configService.js";
import { LoggerService } from "./services/loggerService.js";
import { McpService } from "./services/McpService.js";
import { AiService } from "./services/AiService.js";
import { Agent } from "./Agent.js";
import { SingleUserUiService } from "./services/SingleUserUiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. Rendszer Inicializálás (CSAK EGYSZER) ---
const configService = new ConfigService();
const logger = new LoggerService(configService);
const mcpService = new McpService(logger);
const aiService = new AiService(configService, logger);

// Ez a trükk: A UI Service globális, és várja a kapcsolatot
const uiService = new SingleUserUiService();

const agent = new Agent(mcpService, aiService, uiService, logger);

// --- 2. Szerver és Socket ---
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "../public")));

io.on("connection", (socket) => {
  logger.info("Web UI csatlakozva!");

  // A már futó UI service-nek odaadjuk az új socketet
  // Így a "háttérben" futó Agent mostantól ebbe az ablakba beszél
  uiService.setSocket(socket);

  socket.on("disconnect", () => {
    logger.info("Web UI lecsatlakozott (az Agent fut tovább...)");
    // Nem állítjuk le az Agentet!
  });
});

// --- 3. Indítás ---
(async () => {
  try {
    await mcpService.connectServers(configService.servers);

    server.listen(3000, () => {
      logger.info("Web felület elérhető: http://localhost:3000");
    });
    logger.info("Agent indítása...");
    await agent.start();

  } catch (error) {
    logger.error("Fatal Error", error);
  }
})();
