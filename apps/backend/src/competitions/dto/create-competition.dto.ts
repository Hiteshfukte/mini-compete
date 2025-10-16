import { IsString, IsOptional, IsArray, IsInt, IsDateString } from 'class-validator';

export class CreateCompetitionDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsInt()
  capacity: number;

  @IsDateString()
  regDeadline: string;

   @IsDateString()
  @IsOptional()
  startDate?: string;
}
