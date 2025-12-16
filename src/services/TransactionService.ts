import * as crypto from 'crypto';
import { ethers } from 'ethers';
import { createRequire } from 'module';
import { ITransaction, TransactionType } from '../interfaces/ITransaction.js';

const require = createRequire(import.meta.url);
const abi = require('../abis/AiLoggerABI.json');

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export class TransactionService {
  private contract: ethers.Contract | null = null;
  private provider: ethers.JsonRpcProvider;

  constructor() {
    // Assuming hardhat node is running on default port
    this.provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    this.initialize();
  }

  private async initialize() {
    try {
        // Get the first signer (default account 0 from hardhat node)
        const signer = await this.provider.getSigner();
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
        console.log("TransactionService connected to Blockchain");
    } catch (e) {
        console.error("Failed to connect to Blockchain", e);
    }
  }

  public async record(
    type: TransactionType,
    sender: string,
    receiver: string,
    payload: any
  ): Promise<ITransaction> {
    const id = crypto.randomUUID();
    const payloadStr = JSON.stringify(payload);
    let hash = "PENDING";
    const timestamp = Date.now();

    if (this.contract) {
        try {
            // Send transaction to blockchain
            const tx = await this.contract.logTransaction(id, type, sender, receiver, payloadStr);
            hash = tx.hash;
            console.log(`Transaction sent to blockchain: ${hash}`);
            // We can await tx.wait() if we want strict confirmation, but for UX speed we might skip it or await it in background.
            // For now, let's await it to be sure it's mined since it's local dev chain (fast).
            await tx.wait();
        } catch(e) {
            console.error("Blockchain write failed", e);
            hash = "ERROR_WRITE_FAILED";
        }
    } else {
         hash = "OFFLINE_MODE";
         console.warn("Blockchain not connected, transaction not logged on-chain");
    }

    // Return the ITransaction object (which now represents the blockchain event basically)
    return {
      id,
      timestamp,
      type,
      sender,
      receiver,
      payload,
      hash
    };
  }

  public async getChain(): Promise<ITransaction[]> {
    if (!this.contract) return [];

    try {
        // Query param "fromBlock: 0" to read from genesis to latest
        const filter = this.contract.filters.TransactionLogged();
        const events = await this.contract.queryFilter(filter, 0);

        return events.map((event: any) => {
            const { args, transactionHash } = event;
            return {
                id: args.id,
                type: args.txType, // Mapped back from Solidity argument name
                sender: args.sender,
                receiver: args.receiver,
                // Attempt to parse payload back to object
                payload: this.safeJSONParse(args.payload),
                timestamp: Number(args.timestamp) * 1000, // Convert seconds to ms
                hash: transactionHash
            } as ITransaction;
        });
    } catch (error) {
        console.error("Failed to fetch chain from blockchain", error);
        return [];
    }
  }

  private safeJSONParse(str: string): any {
    try {
        return JSON.parse(str);
    } catch {
        return str;
    }
  }
}
