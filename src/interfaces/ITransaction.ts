export type TransactionType = 'USER_INPUT' | 'AI_REQUEST' | 'AI_RESPONSE' | 'TOOL_EXECUTION' | 'TOOL_RESULT' | 'SYSTEM';

export interface ITransaction {
  id: string;
  timestamp: number;
  type: TransactionType;
  sender: string;
  receiver: string;
  payload: any;
  hash: string;
}
