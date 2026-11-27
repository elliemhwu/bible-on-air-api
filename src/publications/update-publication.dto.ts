import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePublicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  /** HTML from the studio's rich text editor */
  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  about?: string;
}
