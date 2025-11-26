import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from './configService.js';
import { LoggerService } from './loggerService.js';

export class AiService {
  private anthropic: Anthropic;
  private model: string;
  private logger: LoggerService;

  // A konstruktor most már a ConfigService-t várja string helyett
  constructor(config: ConfigService, logger: LoggerService) {
    this.logger = logger;

    // Itt vesszük ki a configból a kulcsot
    this.anthropic = new Anthropic({
      apiKey: config.anthropicApiKey,
    });

    // A modellt is kivehetnénk a configból, de most maradhat hardcoded vagy config.model
    this.model = 'claude-haiku-4-5-20251001';
  }

  async generateResponse(messages: any[], tools: any[]) {
    this.logger.debug('AI kérés küldése...', { model: this.model, messageCount: messages.length });

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: messages,
        tools: tools,
      });
      return response;
    } catch (error) {
      this.logger.error('Hiba az Anthropic API hívás közben', error);
      throw error;
    }
  }
}
