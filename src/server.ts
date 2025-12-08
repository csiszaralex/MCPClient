import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

import { Agent } from './Agent.js';
import { AiService } from './services/AiService.js';
import { ConfigService } from './services/ConfigService.js';
import { LoggerService } from './services/LoggerService.js';
import { McpService } from './services/McpService.js';
import { SingleUserUiService } from './services/SingleUserUiService.js';
import { TransactionService } from './services/TransactionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. Rendszer Inicializalas (CSAK EGYSZER) ---
const configService = new ConfigService();
const logger = new LoggerService(configService);
const transactionService = new TransactionService();
const mcpService = new McpService(logger);
const aiService = new AiService(configService, logger, transactionService);

// Ez a trükk: A UI Service globalis, es varja a kapcsolatot
const uiService = new SingleUserUiService();

const agent = new Agent(mcpService, aiService, uiService, logger, transactionService);

// --- 2. Szerver es Socket ---
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../public')));

io.on('connection', (socket) => {
  logger.info('Web UI csatlakozva!');

  // A mar futo UI service-nek odaadjuk az új socketet
  // Így a "hatterben" futo Agent mostantol ebbe az ablakba beszel
  uiService.setSocket(socket);

  socket.on('disconnect', () => {
    logger.info('Web UI lecsatlakozott (az Agent fut tovabb...)');
    // Nem allítjuk le az Agentet!
  });
});

// --- 3. Indítas ---
(async () => {
  try {
    await mcpService.connectServers(configService.servers);

    server.listen(3000, () => {
      logger.info('Web felület elerhető: http://localhost:3000');
    });
    logger.info('Agent indítasa...');
    await agent.start();
  } catch (error) {
    logger.error('Fatal Error', error);
  }
})();
