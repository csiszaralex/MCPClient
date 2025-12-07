import * as readline from 'readline';

export class UiService {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true, // Fontos a megfelelő TTY kezeleshez
    });
  }

  ask(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  async requestApproval(serverName: string, toolName: string, args: any): Promise<boolean> {
    console.log('\n' + '─'.repeat(50));
    console.log(`🚨 [ENGEDeLYKeReS]`);
    console.log(`🖥️  Szerver:  \x1b[36m${serverName}\x1b[0m`); // Kis színezes (Cyan)
    console.log(`🛠️  Tool:     \x1b[33m${toolName}\x1b[0m`); // Kis színezes (Sarga)
    console.log(
      `📦  Adatok:   ${JSON.stringify(args, null, 2).replace(/\n/g, '\n              ')}`
    ); // Behúzas javítasa
    console.log('─'.repeat(50));

    // Kis trükk: üres sor, hogy elvaljon a logtol
    const answer = await this.ask('Engedelyezed a futtatast? (i/n): ');
    return answer.toLowerCase() === 'i' || answer.toLowerCase() === 'y';
  }

  logResponse(text: string) {
    console.log(`\n\x1b[32m🤖 [AI]:\x1b[0m ${text}\n`); // Zold szín az AI-nak
  }

  logSystem(text: string) {
    console.log(`\x1b[90mℹ️  [System]: ${text}\x1b[0m`); // Szürke a rendszerüzeneteknek
  }

  close() {
    this.rl.close();
  }
}
