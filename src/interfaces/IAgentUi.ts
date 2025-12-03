// src/interfaces/IAgentUi.ts

export interface IAgentUi {
  ask(question: string): Promise<string>;
  requestApproval(serverName: string, toolName: string, args: any): Promise<boolean>;
  logResponse(text: string): void;
  logSystem(text: string): void;
  close(): void;
}
