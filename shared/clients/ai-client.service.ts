import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { LoggerService } from '../logger/logger.service';

/**
 * Single source of the ai-microservice credential for every flipflop service.
 *
 * ai-microservice runs ServiceAuthGuard globally and, since 2026-08-26, verifies
 * RS256 only (ALLOW_HS256_FALLBACK=false). Every call therefore needs a Bearer
 * service token; without one the guard answers `401 Missing service token`.
 * All five flipflop services already mount a valid AI_SERVICE_TOKEN -- before
 * this helper existed no call site attached it, so every AI feature was dead.
 */
@Injectable()
export class AiClientService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.baseUrl = (
      process.env.AI_SERVICE_URL || 'http://ai-microservice:3380'
    ).replace(/\/$/, '');
  }

  /** Absolute URL of the completion endpoint. */
  get completeUrl(): string {
    return `${this.baseUrl}/ai/complete`;
  }

  /**
   * Authorization header for ai-microservice.
   *
   * Fails closed: sending the request unauthenticated would surface as a
   * confusing 401 from ai-microservice rather than as the misconfiguration it
   * actually is.
   */
  authHeaders(extra?: Record<string, string>): Record<string, string> {
    const token = (
      process.env.AI_SERVICE_TOKEN ||
      process.env.JWT_TOKEN ||
      process.env.SERVICE_TOKEN ||
      ''
    ).trim();

    if (!token) {
      this.logger.error(
        'No ai-microservice credential configured (AI_SERVICE_TOKEN / JWT_TOKEN / SERVICE_TOKEN); refusing to call ai-microservice unauthenticated',
        undefined,
        'AiClient',
      );
      throw new Error('[MISSING: ai-microservice runtime credential]');
    }

    return {
      'Content-Type': 'application/json',
      ...(extra ?? {}),
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    };
  }

  /**
   * POST /ai/complete with the service credential attached.
   *
   * Errors are logged with the upstream status and re-thrown -- callers decide
   * whether an AI outage is fatal for their flow, but it must never be silently
   * turned into an empty or default result.
   */
  async complete(
    body: Record<string, unknown>,
    options?: { timeout?: number; headers?: Record<string, string> },
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.httpService.axiosRef.post(
        this.completeUrl,
        body,
        {
          headers: this.authHeaders(options?.headers),
          timeout: options?.timeout ?? 25000,
        },
      );
      return response.data as Record<string, unknown>;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `ai-microservice /ai/complete failed (status ${status ?? 'none'}): ${message}`,
        error instanceof Error ? error.stack : undefined,
        'AiClient',
      );
      throw error;
    }
  }

  /** Text field of a completion response, across the shapes ai-microservice returns. */
  static extractText(data: Record<string, unknown> | null | undefined): string {
    if (!data || typeof data !== 'object') return '';
    const value =
      (data as { text?: unknown }).text ??
      (data as { content?: unknown }).content ??
      (data as { result?: unknown }).result;
    return typeof value === 'string' ? value : '';
  }
}
