import { IsArray, IsBoolean, IsEmail, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class GuestOrderItemDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class GuestCheckoutAddressDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  postalCode: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateGuestOrderDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  wantsAccount?: boolean;

  @IsObject()
  billingAddress: GuestCheckoutAddressDto;

  @IsOptional()
  @IsObject()
  deliveryAddress?: GuestCheckoutAddressDto;

  @IsArray()
  items: GuestOrderItemDto[];

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  deliveryMethod?: string;

  @IsOptional()
  @IsString()
  expeditionMethod?: string;

  @IsOptional()
  @IsBoolean()
  wantsDifferentDeliveryDay?: boolean;

  @IsOptional()
  @IsString()
  requestedDeliveryDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  operatorTip?: number;

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
}
