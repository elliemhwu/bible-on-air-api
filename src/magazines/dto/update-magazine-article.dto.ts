import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMagazineArticleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
