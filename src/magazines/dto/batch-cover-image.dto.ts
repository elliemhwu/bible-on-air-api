import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsString, IsUrl, ValidateNested } from 'class-validator';

export class CoverImageItemDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsUrl({ require_tld: false })
  imageUrl: string;
}

export class BatchCoverImageDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoverImageItemDto)
  items: CoverImageItemDto[];
}
