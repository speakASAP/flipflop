/**
 * Users Controller
 * Handles HTTP requests for user operations
 */

import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard, ApiResponse } from '@flipflop/shared';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req: any) {
    const profile = await this.usersService.getProfile(req.user, req.headers.authorization);
    return ApiResponse.success(profile);
  }

  @Put('profile')
  async updateProfile(@Request() req: any, @Body() dto: any) {
    const profile = await this.usersService.updateProfile(req.user, req.headers.authorization, dto);
    return ApiResponse.success(profile);
  }

  @Get('addresses')
  async getAddresses(@Request() req: any) {
    const addresses = await this.usersService.getAddresses(req.user, req.headers.authorization);
    return ApiResponse.success(addresses);
  }

  @Post('addresses')
  async createAddress(@Request() req: any, @Body() dto: any) {
    const address = await this.usersService.createAddress(req.user, req.headers.authorization, dto);
    return ApiResponse.success(address);
  }

  @Put('addresses/:id')
  async updateAddress(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    const address = await this.usersService.updateAddress(req.user, req.headers.authorization, id, dto);
    return ApiResponse.success(address);
  }

  @Delete('addresses/:id')
  async deleteAddress(@Request() req: any, @Param('id') id: string) {
    const result = await this.usersService.deleteAddress(req.user, req.headers.authorization, id);
    return ApiResponse.success(result);
  }
}

