/**
 * Analytics Controller
 */

import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { ApiResponseUtil } from '@shared/utils/api-response.util';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('sales')
  async getSales(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const sales = await this.analyticsService.getSalesData(startDate, endDate);
    return ApiResponseUtil.success(sales);
  }

  @Get('revenue')
  async getRevenue(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const revenue = await this.analyticsService.getRevenueData(startDate, endDate);
    return ApiResponseUtil.success(revenue);
  }

  @Get('products')
  async getProductAnalytics(@Query('productId') productId?: string) {
    const analytics = await this.analyticsService.getProductAnalytics(productId);
    return ApiResponseUtil.success(analytics);
  }

  @Get('margins')
  async getMarginAnalysis(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const margins = await this.analyticsService.getMarginAnalysis(startDate, endDate);
    return ApiResponseUtil.success(margins);
  }
}

