import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { LoggerService } from "../logger/logger.service";

const LEADS_REPLAY_CONSUMER = "flipflop-service";
const DEFAULT_REPLAY_PURPOSE = "consumer_reconciliation";
const MAX_LEADS_REPLAY_EVENTS = 30;

type LeadsReplayPurpose =
  | "consumer_reconciliation"
  | "incident_replay"
  | "consent_audit"
  | "conversion_linkage_replay";

type ReplayOptions = {
  purpose?: LeadsReplayPurpose;
  limit?: number;
  fromOccurredAt?: string;
  toOccurredAt?: string;
};

type SubmitFlipFlopCheckoutLeadInput = {
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  orderId: string;
  orderNumber: string;
  sourceUrl: string;
  marketingConsent: boolean;
  consentCapturedAt?: string;
};

type SubmitLeadResponse = {
  leadId: string;
  status: string;
  confirmationSent?: boolean;
};

@Injectable()
export class LeadsClientService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.baseUrl = process.env.LEADS_SERVICE_URL || "http://leads-microservice:4400";
  }


  async submitFlipFlopCheckoutLead(input: SubmitFlipFlopCheckoutLeadInput): Promise<SubmitLeadResponse> {
    const consentCapturedAt = input.consentCapturedAt || new Date().toISOString();
    const payload: Record<string, unknown> = {
      sourceService: "flipflop",
      sourceLabel: "checkout-customer",
      sourceUrl: input.sourceUrl,
      message: "FlipFlop checkout customer sync",
      contactMethods: [{ type: "email", value: input.email }],
      preferredChannel: "email",
      fallbackChannels: [],
      marketingConsent: input.marketingConsent,
      metadata: {
        intent: "checkout-customer-sync",
        surface: "checkout",
        productKey: "flipflop",
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        phonePresent: Boolean(input.phone),
        namePresent: Boolean(input.firstName || input.lastName),
      },
    };
    if (input.marketingConsent) {
      payload.consentSource = "flipflop:checkout:v1";
      payload.consentCapturedAt = consentCapturedAt;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/leads/submit`, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        }),
      );
      this.logger.log("FlipFlop checkout lead submitted", {
        leadId: response.data?.leadId,
        orderNumber: input.orderNumber,
        marketingConsent: input.marketingConsent,
      });
      return response.data as SubmitLeadResponse;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status || HttpStatus.BAD_GATEWAY;
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`FlipFlop checkout lead submission failed: ${message}`, "LeadsClient");
      throw new HttpException("Failed to submit FlipFlop checkout lead", status);
    }
  }

  async replayLeadLifecycleForFlipFlop(leadId: string, options: ReplayOptions = {}): Promise<any> {
    const params: Record<string, string | number> = {
      consumer: LEADS_REPLAY_CONSUMER,
      purpose: options.purpose || DEFAULT_REPLAY_PURPOSE,
      limit: this.normalizeLimit(options.limit),
    };
    if (options.fromOccurredAt) {
      params.fromOccurredAt = options.fromOccurredAt;
    }
    if (options.toOccurredAt) {
      params.toOccurredAt = options.toOccurredAt;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/leads/internal/${encodeURIComponent(leadId)}/lifecycle-replay`,
          {
            params,
            headers: this.getInternalHeaders(),
          },
        ),
      );
      const eventCount = Number(response.data?.bounds?.eventCount ?? response.data?.events?.length ?? 0);
      this.logger.log(`Leads lifecycle replay returned ${eventCount} minimized events`, "LeadsClient");
      return response.data;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status || HttpStatus.BAD_GATEWAY;
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`Leads lifecycle replay request failed: ${message}`, "LeadsClient");
      throw new HttpException("Failed to replay Leads lifecycle evidence", status);
    }
  }

  private normalizeLimit(limit?: number): number {
    if (!Number.isFinite(limit ?? NaN)) {
      return MAX_LEADS_REPLAY_EVENTS;
    }
    return Math.min(MAX_LEADS_REPLAY_EVENTS, Math.max(1, Math.floor(limit as number)));
  }

  private getInternalHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "x-service-name": LEADS_REPLAY_CONSUMER,
    };
    const token = process.env.LEADS_INTERNAL_SERVICE_TOKEN?.trim();
    if (token) {
      headers["x-internal-service-token"] = token;
    }
    return headers;
  }
}
