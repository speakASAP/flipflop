import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../logger/logger.service';

export interface CatalogContentPreview {
  marketplace: string;
  label: string;
  format: string;
  product: Record<string, unknown>;
  content: {
    title: string;
    plainText: string;
    html?: string;
    blocks?: unknown[];
    sections?: unknown[];
  };
  source: {
    canonicalDocumentVersion: string;
    legacyDescriptionFallback: boolean;
    sourceHash: string;
    generatedAt: string;
  };
  overridesApplied: unknown;
  warnings: string[];
}

/**
 * API client for catalog-microservice
 * Fetches product data from the central catalog
 */
@Injectable()
export class CatalogClientService {
  private readonly baseUrl: string;
  private readonly internalServiceToken?: string;
  private readonly serviceName: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.baseUrl = process.env.CATALOG_SERVICE_URL || 'http://catalog-microservice:3200';
    this.internalServiceToken = (
      process.env.CATALOG_INTERNAL_SERVICE_TOKEN ||
      process.env.CATALOG_SERVICE_TOKEN ||
      process.env.INTERNAL_SERVICE_TOKEN
    )?.trim();
    this.serviceName = process.env.SERVICE_NAME || 'flipflop-service';
  }

  private catalogHeaders(extraHeaders?: Record<string, string>): Record<string, string> | undefined {
    const headers = { ...(extraHeaders || {}) };

    if (this.internalServiceToken) {
      headers['x-internal-service-token'] = this.internalServiceToken;
      headers['x-service-name'] = this.serviceName;
    }

    return Object.keys(headers).length ? headers : undefined;
  }

  async getProductContentPreview(
    productId: string,
    marketplace: string,
    authorizationHeader?: string,
  ): Promise<CatalogContentPreview> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/products/${encodeURIComponent(productId)}/content-previews/${encodeURIComponent(marketplace)}`,
          {
            headers: this.catalogHeaders(
              authorizationHeader ? { Authorization: authorizationHeader } : undefined,
            ),
          },
        ),
      );

      if (!response.data?.success || !response.data?.data) {
        throw new HttpException('Catalog content preview not available', HttpStatus.BAD_GATEWAY);
      }

      return response.data.data;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to get ${marketplace} content preview for product ${productId}: ${errorMessage}`,
        errorStack,
        'CatalogClient',
      );
      throw new HttpException('Catalog content preview not available', HttpStatus.BAD_GATEWAY);
    }
  }

  async getProductById(productId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/products/${productId}`, {
          headers: this.catalogHeaders(),
        }),
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get product ${productId}: ${errorMessage}`, errorStack, 'CatalogClient');
      throw new HttpException(`Product not found: ${productId}`, HttpStatus.NOT_FOUND);
    }
  }

  async getProductBySku(sku: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/products/sku/${sku}`, {
          headers: this.catalogHeaders(),
        }),
      );
      if (!response.data.success || !response.data.data) {
        return null;
      }
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Product not found by SKU ${sku}: ${errorMessage}`, "CatalogClient");
      return null;
    }
  }

  async searchProducts(query: {
    search?: string;
    isActive?: boolean;
    categoryId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    try {
      const params = new URLSearchParams();
      if (query.search) params.append("search", query.search);
      if (query.isActive !== undefined) params.append("isActive", String(query.isActive));
      if (query.categoryId) params.append("categoryId", query.categoryId);
      if (query.page) params.append("page", String(query.page));
      if (query.limit) params.append("limit", String(query.limit));

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/products?${params.toString()}`, {
          headers: this.catalogHeaders(),
        }),
      );
      return {
        items: response.data.data || [],
        total: response.data.pagination?.total || 0,
        page: response.data.pagination?.page || 1,
        limit: response.data.pagination?.limit || 20,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to search products: ${errorMessage}`, errorStack, 'CatalogClient');
      return { items: [], total: 0, page: 1, limit: 20 };
    }
  }

  async getCategories(): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/categories`, {
          headers: this.catalogHeaders(),
        }),
      );
      return response.data.data || [];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get categories: ${errorMessage}`, errorStack, 'CatalogClient');
      return [];
    }
  }

  async getProductPricing(productId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/pricing/product/${productId}/current`, {
          headers: this.catalogHeaders(),
        }),
      );
      return response.data.data;
    } catch (error) {
      this.logger.warn(`Pricing not found for product ${productId}`, "CatalogClient");
      return null;
    }
  }

  async getProductMedia(productId: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/media/product/${productId}`, {
          headers: this.catalogHeaders(),
        }),
      );
      return response.data.data || [];
    } catch (error) {
      this.logger.warn(`Media not found for product ${productId}`, "CatalogClient");
      return [];
    }
  }
}
