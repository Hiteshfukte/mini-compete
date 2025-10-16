import { IsEnum } from 'class-validator';

export enum RegistrationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class UpdateRegistrationStatusDto {
  @IsEnum(RegistrationStatus)
  status: RegistrationStatus;
}