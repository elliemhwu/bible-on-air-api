import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsString,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export class CoverImageItemDto {
  @IsDateString()
  date: string;

  /** null removes the day's image */
  @ValidateIf((_, v) => v !== null)
  @IsString()
  imageUrl: string | null;
}

export class BatchCoverImageDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoverImageItemDto)
  items: CoverImageItemDto[];
}
