/**
 * AI Assistant Controller
 */

import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { ApiResponseUtil } from '@shared/utils/api-response.util';

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('chat')
  async chat(@Body() chatDto: ChatDto) {
    const response = await this.aiService.chat(chatDto.message, chatDto.context);
    return ApiResponseUtil.success(response);
  }

  @Get('recommendations/:productId')
  async getRecommendations(@Param('productId') productId: string) {
    const recommendations = await this.aiService.getProductRecommendations(productId);
    return ApiResponseUtil.success(recommendations);
  }
}

