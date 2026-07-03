import { IsString, IsOptional, IsNumber, Min, IsObject } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  deliveryAddressId: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  discountCode?: string;

  @IsOptional()
  @IsObject()
  bundleIntent?: {
    source?: string;
    sourceProductId?: string;
    productIds?: string[];
    catalogCandidateId?: string;
    bundleId?: string;
  };
}

