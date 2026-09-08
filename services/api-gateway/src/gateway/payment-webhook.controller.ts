import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '@flipflop/shared';
import { GatewayService } from './gateway.service';

const PAYMENT_WEBHOOK_ROLES: ReadonlySet<string> = new Set([
  'internal:flipflop-service:service',
]);

/**
 * Inbound payment outcome callbacks from payments-microservice.
 * Auth RS256 Bearer only — no static API key, no open-if-unset path.
 */
@Controller()
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(
    private readonly gatewayService: GatewayService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  @Post('api/webhooks/payment-result')
  @HttpCode(200)
  async handlePaymentResult(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ): Promise<{ received: boolean }> {
    await this.assertPaymentWebhookPrincipal(authorization);

    const pairToken = this.configService.get<string>('FLIPFLOP_GATEWAY_TO_ORDER_TOKEN')?.trim();
    if (!pairToken) {
      this.logger.error(
        'FLIPFLOP_GATEWAY_TO_ORDER_TOKEN is not configured; refusing payment-result forward',
      );
      throw new UnauthorizedException('Gateway-to-order service token is not configured');
    }

    const bearer = pairToken.startsWith('Bearer ') ? pairToken : `Bearer ${pairToken}`;

    try {
      await this.gatewayService.forwardRequest(
        'orders',
        '/internal/orders/payment-result',
        'POST',
        body,
        { Authorization: bearer },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`payment-result forward to order-service failed: ${message}`);
      throw error;
    }

    return { received: true };
  }

  private async assertPaymentWebhookPrincipal(authorization?: string): Promise<void> {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      this.logger.error('payment-result webhook: missing Authorization Bearer');
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      this.logger.error('payment-result webhook: empty Authorization Bearer');
      throw new UnauthorizedException('Missing bearer token');
    }

    let user: { roles?: string[] };
    try {
      user = await this.authService.validateToken(token);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`payment-result webhook: auth validate failed: ${message}`);
      throw new UnauthorizedException('Invalid token');
    }

    const roles = Array.isArray(user?.roles) ? user.roles : [];
    if (!roles.some((role) => PAYMENT_WEBHOOK_ROLES.has(role))) {
      this.logger.error('payment-result webhook: principal lacks payment webhook role');
      throw new ForbiddenException('Principal lacks payment webhook role');
    }
  }
}
