import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import type { OrderStatus, PaymentStatus } from '@prisma/client';

const ORDER_STATUS_VALUES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

const PAYMENT_STATUS_VALUES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded'];

export class UpdateAdminOrderStatusDto {
  @IsOptional()
  @IsIn(ORDER_STATUS_VALUES)
  status?: OrderStatus;

  @IsOptional()
  @IsObject()
  approval?: {
    approved?: boolean;
    approvalType?: string;
    approvedBy?: string;
    reasonCode?: string;
    sideEffectsHandled?: Partial<Record<'payment' | 'warehouse' | 'notification' | 'crm' | 'channel', boolean>>;
    idempotencyKey?: string;
  };

  @IsOptional()
  @IsIn(PAYMENT_STATUS_VALUES)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
