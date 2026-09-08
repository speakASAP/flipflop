import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@flipflop/shared';
import { EmailCampaignService } from './email-campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Controller('internal/marketing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('internal:flipflop-service:service')
export class MarketingController {
  constructor(private readonly emailCampaignService: EmailCampaignService) {}

  @Post('campaigns')
  async createCampaign(@Body() dto: CreateCampaignDto) {
    return this.emailCampaignService.createDraftCampaign(dto.goalId, dto.productIds);
  }

  @Post('campaigns/:id/send')
  async sendCampaign(@Param('id') id: string) {
    await this.emailCampaignService.sendCampaign(id);
    return { ok: true };
  }
}
