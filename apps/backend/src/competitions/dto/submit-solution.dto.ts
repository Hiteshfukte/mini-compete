import { IsString, IsNotEmpty, IsUrl, IsOptional } from 'class-validator';

export class SubmitSolutionDto {
  @IsUrl()
  @IsNotEmpty()
  submissionUrl: string;

  @IsString()
  @IsOptional()
  submissionDescription?: string;
}