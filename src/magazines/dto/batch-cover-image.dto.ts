import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsString,
  ValidateNested,
} from "class-validator";

export class CoverImageItemDto {
  @IsDateString()
  date: string;

  @IsString()
  imageUrl: string;
}

export class BatchCoverImageDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoverImageItemDto)
  items: CoverImageItemDto[];
}
