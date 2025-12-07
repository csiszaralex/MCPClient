import { Socket } from 'socket.io';
import { IAgentUi } from '../interfaces/IAgentUi.js';

export class SingleUserUiService implements IAgentUi {
  private socket: Socket | null = null;
  // Memoriaban taroljuk a chat előzmenyeket a UI szamara
  private messageBuffer: Array<{ type: string; content: any }> = [];

  setSocket(socket: Socket) {
    this.socket = socket;

    // 1. Amint csatlakozol, elküldjük az eddigi torteneseket (Replay)
    this.messageBuffer.forEach((msg) => {
      this.socket?.emit(msg.type, msg.content);
    });
  }

  // --- Implementacio ---

  ask(question: string): Promise<string> {
    // Ha nincs nyitva a weboldal, varunk, amíg csatlakozol
    if (!this.socket) console.log('⚠️ Varakozas a Web UI csatlakozasara...');

    return new Promise((resolve) => {
      // Polling vagy Event alapú varakozas, amíg lesz socket
      const checkSocket = setInterval(() => {
        if (this.socket) {
          clearInterval(checkSocket);

          // Ha megvan a socket, kiküldjük a kerdest
          this.socket.once('user_message', (msg: string) => {
            this.addToBuffer('user_message', msg); // User valaszat is mentjük
            resolve(msg);
          });
        }
      }, 500);
    });
  }

  requestApproval(serverName: string, toolName: string, args: any): Promise<boolean> {
    const data = { serverName, toolName, args };

    // Elmentjük a bufferbe, hogy ha frissítesz, akkor is lasd a kerdest
    // De vigyazat: csak az aktív kerdeseket kene, most egyszerűsítünk

    return new Promise((resolve) => {
      const waitForSocket = setInterval(() => {
        if (this.socket) {
          clearInterval(waitForSocket);

          this.socket.emit('approval_request', data);

          this.socket.once('approval_response', (approved: boolean) => {
            // Nem mentjük a bufferbe a valaszt, mert az mar tortenelem
            resolve(approved);
          });
        }
      }, 500);
    });
  }

  logResponse(text: string) {
    this.addToBuffer('ai_message', text);
    if (this.socket) this.socket.emit('ai_message', text);
  }

  logSystem(text: string) {
    this.addToBuffer('system_message', text);
    if (this.socket) this.socket.emit('system_message', text);
  }

  close() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  private addToBuffer(type: string, content: any) {
    this.messageBuffer.push({ type, content });
    // Opcionalis: limitaljuk a buffert, hogy ne egye meg a RAM-ot (pl. utolso 100 üzenet)
    if (this.messageBuffer.length > 100) this.messageBuffer.shift();
  }
}
