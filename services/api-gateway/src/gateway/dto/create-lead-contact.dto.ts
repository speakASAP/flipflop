import { IsBoolean, IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLeadContactDto {
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1200)
  message!: string;

  @IsBoolean()
  marketingConsent!: boolean;
}
