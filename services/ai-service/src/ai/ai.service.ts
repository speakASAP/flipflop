/**
 * AI Service
 * Integration with OpenRouter API (Google Gemini 2.0 Flash)
 */

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../../../shared/logger/logger.service';

@Injectable()
export class AiService {
  private apiBase: string;
  private apiKey: string;
  private model: string;
  private timeout: number;

  constructor(
    private httpService: HttpService,
    private logger: LoggerService,
  ) {
    this.apiBase = process.env.OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';
    this.timeout = parseInt(process.env.OPENROUTER_TIMEOUT || '60', 10) * 1000;
  }

  async chat(message: string, context?: Record<string, any>): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(context);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiBase}/chat/completions`,
          {
            model: this.model,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              {
                role: 'user',
                content: message,
              },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
              'X-Title': 'flipflop.statex.cz E-commerce',
            },
            timeout: this.timeout,
          },
        ),
      );

      const aiResponse = response.data.choices[0]?.message?.content || 'I apologize, I could not process your request.';

      this.logger.log('AI chat response generated', {
        messageLength: message.length,
        responseLength: aiResponse.length,
      });

      return aiResponse;
    } catch (error) {
      this.logger.error('AI chat failed', {
        error: error.message,
      });
      throw error;
    }
  }

  async getProductRecommendations(productId: string): Promise<string[]> {
    try {
      const prompt = `Based on product ID ${productId}, suggest 5 related or complementary products that customers might be interested in. Return only product IDs as a JSON array.`;

      const response = await this.chat(prompt, {
        type: 'product_recommendations',
        productId,
      });

      // Parse response to extract product IDs
      try {
        const recommendations = JSON.parse(response);
        return Array.isArray(recommendations) ? recommendations : [];
      } catch {
        // If not JSON, try to extract IDs from text
        const ids = response.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi);
        return ids || [];
      }
    } catch (error) {
      this.logger.error('Product recommendations failed', {
        error: error.message,
        productId,
      });
      return [];
    }
  }

  private buildSystemPrompt(context?: Record<string, any>): string {
    let prompt = `You are a helpful shopping assistant for flipflop.statex.cz, an e-commerce platform in the Czech Republic.
Your role is to help customers find products, answer questions about products, and guide them through their shopping experience.
Always respond in Czech language.
Be friendly, helpful, and professional.`;

    if (context) {
      if (context.type === 'product_recommendations') {
        prompt += '\n\nYou are providing product recommendations. Return product IDs in JSON format.';
      }
    }

    return prompt;
  }
}

