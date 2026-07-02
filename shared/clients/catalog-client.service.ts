import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../logger/logger.service';

export interface CatalogProductRequestOptions {
  authorizationHeader?: string;
  catalogScope?: string;
}

export interface CatalogProductRelation {
  id: string;
  sourceProductId: string;
  targetProductId: string;
  relationType: string;
  score: number;
  confidence: number;
  source: string;
  evidence?: Record<string, unknown>;
}

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

  async getRelatedProducts(
    productId: string,
    options: { relationType?: string; authorizationHeader?: string } = {},
  ): Promise<CatalogProductRelation[]> {
    try {
      const params = new URLSearchParams();
      if (options.relationType) params.append('relationType', options.relationType);
      const query = params.toString();
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/products/${encodeURIComponent(productId)}/related${query ? `?${query}` : ''}`,
          {
            headers: this.catalogHeaders(
              options.authorizationHeader ? { Authorization: options.authorizationHeader } : undefined,
            ),
          },
        ),
      );

      if (!response.data?.success || !Array.isArray(response.data?.data)) {
        return [];
      }

      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Catalog related products unavailable for product ${productId}: ${errorMessage}`,
        'CatalogClient',
      );
      return [];
    }
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

  async getProductById(productId: string, options: CatalogProductRequestOptions = {}): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (options.catalogScope) params.append('catalogScope', options.catalogScope);
      const query = params.toString();
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/products/${encodeURIComponent(productId)}${query ? `?${query}` : ''}`,
          {
            headers: this.catalogHeaders(
              options.authorizationHeader ? { Authorization: options.authorizationHeader } : undefined,
            ),
          },
        ),
      );
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: any }; stack?: string; message?: string };
      const responseMessage = err.response?.data?.error?.message || err.response?.data?.message;
      const errorMessage = responseMessage || err.message || 'Unknown error';
      const errorStack = err.stack;
      const status = err.response?.status || HttpStatus.NOT_FOUND;
      this.logger.error(`Failed to get product ${productId}: ${errorMessage}`, errorStack, 'CatalogClient');
      throw new HttpException(errorMessage || `Product not found: ${productId}`, status);
    }
  }

  async updateProduct(productId: string, productData: Record<string, unknown>, options: CatalogProductRequestOptions = {}): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.baseUrl}/api/products/${encodeURIComponent(productId)}`,
          productData,
          {
            headers: this.catalogHeaders(
              options.authorizationHeader ? { Authorization: options.authorizationHeader } : undefined,
            ),
          },
        ),
      );
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: any }; stack?: string; message?: string };
      const responseMessage = err.response?.data?.error?.message || err.response?.data?.message;
      const errorMessage = responseMessage || err.message || 'Unknown error';
      const status = err.response?.status || HttpStatus.BAD_REQUEST;
      this.logger.error(`Failed to update product ${productId}: ${errorMessage}`, err.stack, 'CatalogClient');
      throw new HttpException(errorMessage, status);
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
      this.logger.warn(`Product not found by SKU ${sku}: ${errorMessage}`, 'CatalogClient');
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
      if (query.search) params.append('search', query.search);
      if (query.isActive !== undefined) params.append('isActive', String(query.isActive));
      if (query.categoryId) params.append('categoryId', query.categoryId);
      if (query.page) params.append('page', String(query.page));
      if (query.limit) params.append('limit', String(query.limit));

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
      this.logger.warn(`Pricing not found for product ${productId}`, 'CatalogClient');
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
      this.logger.warn(`Media not found for product ${productId}`, 'CatalogClient');
      return [];
    }
  }
}
