import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from './ConfigService.js';
import { LoggerService } from './LoggerService.js';

export class AiService {
  private anthropic: Anthropic;
  private model: string;
  private logger: LoggerService;

  // A konstruktor most mar a ConfigService-t varja string helyett
  constructor(config: ConfigService, logger: LoggerService) {
    this.logger = logger;

    // Itt vesszük ki a configbol a kulcsot
    this.anthropic = new Anthropic({
      apiKey: config.anthropicApiKey,
    });

    // A modellt is kivehetnenk a configbol, de most maradhat hardcoded vagy config.model
    this.model = 'claude-haiku-4-5-20251001';
  }

  async generateResponse(messages: any[], tools: any[]) {
    const start = Date.now();
    this.logger.info('AI keres indul', {
      model: this.model,
      messageCount: messages?.length ?? 0,
      toolCount: tools?.length ?? 0,
    });

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: messages,
        tools: tools,
      });

      const durationMs = Date.now() - start;
      const contentTypes = Array.isArray((response as any).content)
        ? (response as any).content.map((c: any) => c.type)
        : [];

      this.logger.info('AI valasz megerkezett', {
        durationMs,
        contentTypes,
        stopReason: (response as any).stop_reason,
        id: (response as any).id,
      });

      return response;
    } catch (error) {
      const durationMs = Date.now() - start;
      this.logger.error(`Hiba az Anthropic API hívas kozben (${durationMs} ms)`, error);
      throw error;
    }
  }
}
