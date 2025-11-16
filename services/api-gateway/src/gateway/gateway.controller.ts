/**
 * API Gateway Controller
 * Routes requests to appropriate microservices
 */

import { Controller, All, Req, Res, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ApiResponseUtil } from '@shared/utils/api-response.util';
import { LoggerService } from '@shared/logger/logger.service';

@Controller('*')
export class GatewayController {
  private serviceRoutes: Record<string, string> = {
    '/api/auth': process.env.USER_SERVICE_URL || 'http://user-service:3004',
    '/api/users': process.env.USER_SERVICE_URL || 'http://user-service:3004',
    '/api/delivery-addresses': process.env.USER_SERVICE_URL || 'http://user-service:3004',
    '/api/products': process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002',
    '/api/categories': process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002',
    '/api/cart': process.env.ORDER_SERVICE_URL || 'http://order-service:3003',
    '/api/orders': process.env.ORDER_SERVICE_URL || 'http://order-service:3003',
    '/api/payu': process.env.ORDER_SERVICE_URL || 'http://order-service:3003',
    '/api/suppliers': process.env.SUPPLIER_SERVICE_URL || 'http://supplier-service:3006',
    '/api/ai': process.env.AI_SERVICE_URL || 'http://ai-service:3007',
    '/api/analytics': process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:3008',
    '/api/admin': process.env.ORDER_SERVICE_URL || 'http://order-service:3003',
  };

  constructor(
    private httpService: HttpService,
    private logger: LoggerService,
  ) {}

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const path = req.path;
    const method = req.method;

    // Find matching service
    const serviceUrl = this.findServiceUrl(path);

    if (!serviceUrl) {
      return res.status(HttpStatus.NOT_FOUND).json(
        ApiResponseUtil.error('NOT_FOUND', 'Service not found'),
      );
    }

    try {
      // Prepare request
      const targetUrl = `${serviceUrl}${path.replace('/api', '')}`;
      const headers = { ...req.headers };
      delete headers.host;

      this.logger.debug(`Proxying request: ${method} ${targetUrl}`, {
        path,
        serviceUrl,
      });

      // Make request to microservice
      const response = await firstValueFrom(
        this.httpService.request({
          method: method as any,
          url: targetUrl,
          headers,
          data: req.body,
          params: req.query,
          timeout: 30000,
        }),
      );

      // Forward response
      return res.status(response.status).json(response.data);
    } catch (error: any) {
      this.logger.error('Gateway proxy error', {
        error: error.message,
        path,
        serviceUrl,
      });

      const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.response?.data || error.message;

      return res.status(status).json(
        ApiResponseUtil.error('PROXY_ERROR', message),
      );
    }
  }

  private findServiceUrl(path: string): string | null {
    // Exact match first
    for (const [route, url] of Object.entries(this.serviceRoutes)) {
      if (path.startsWith(route)) {
        return url;
      }
    }

    // Fallback: try to match by prefix
    if (path.startsWith('/api/auth') || path.startsWith('/api/users') || path.startsWith('/api/delivery-addresses')) {
      return this.serviceRoutes['/api/users'];
    }
    if (path.startsWith('/api/products') || path.startsWith('/api/categories')) {
      return this.serviceRoutes['/api/products'];
    }
    if (path.startsWith('/api/cart') || path.startsWith('/api/orders') || path.startsWith('/api/payu')) {
      return this.serviceRoutes['/api/orders'];
    }

    return null;
  }
}
