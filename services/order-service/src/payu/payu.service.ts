/**
 * PayU Payment Service
 * Integration with PayU payment gateway for Czech Republic
 */

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '@shared/logger/logger.service';
import { Order } from '@shared/entities/order.entity';
import { User } from '@shared/entities/user.entity';
import { DeliveryAddress } from '@shared/entities/delivery-address.entity';

@Injectable()
export class PayuService {
  private merchantId: string;
  private posId: string;
  private clientId: string;
  private clientSecret: string;
  private apiUrl: string;
  private sandbox: boolean;

  constructor(
    private httpService: HttpService,
    private logger: LoggerService,
  ) {
    this.merchantId = process.env.PAYU_MERCHANT_ID || '';
    this.posId = process.env.PAYU_POS_ID || '';
    this.clientId = process.env.PAYU_CLIENT_ID || '';
    this.clientSecret = process.env.PAYU_CLIENT_SECRET || '';
    this.apiUrl = process.env.PAYU_API_URL || 'https://secure.snd.payu.com/api/v2_1';
    this.sandbox = process.env.PAYU_SANDBOX === 'true';
  }

  async createPayment(
    order: Order,
    user: User,
    deliveryAddress: DeliveryAddress,
  ): Promise<any> {
    try {
      // Get OAuth token
      const accessToken = await this.getAccessToken();

      // Prepare payment request
      const paymentRequest = {
        notifyUrl: `${process.env.API_URL || 'http://localhost:3001'}/api/orders/payu/notify`,
        customerIp: '127.0.0.1',
        merchantPosId: this.posId,
        description: `Order ${order.orderNumber}`,
        currencyCode: 'CZK',
        totalAmount: Math.round(order.total * 100), // Convert to grosze
        buyer: {
          email: user.email,
          phone: deliveryAddress.phone || user.phone,
          firstName: deliveryAddress.firstName || user.firstName,
          lastName: deliveryAddress.lastName || user.lastName,
        },
        products: order.items.map((item) => ({
          name: item.productName,
          unitPrice: Math.round(item.unitPrice * 100),
          quantity: item.quantity,
        })),
        continueUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order/${order.id}/success`,
      };

      // Create payment
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/orders`,
          paymentRequest,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`PayU payment created for order: ${order.orderNumber}`, {
        orderId: order.id,
        paymentId: response.data.orderId,
      });

      return response.data;
    } catch (error) {
      this.logger.error('PayU payment creation failed', {
        error: error.message,
        orderId: order.id,
      });
      throw error;
    }
  }

  async verifyPayment(orderId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error('PayU payment verification failed', {
        error: error.message,
        orderId,
      });
      throw error;
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/oauth/token`,
          {
            grant_type: 'client_credentials',
            client_id: this.clientId,
            client_secret: this.clientSecret,
          },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      return response.data.access_token;
    } catch (error) {
      this.logger.error('PayU OAuth token request failed', {
        error: error.message,
      });
      throw error;
    }
  }
}

