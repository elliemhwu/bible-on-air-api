import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { CreateBlockDto } from './create-magazine-article.dto';

export class ReplaceBlockDto extends CreateBlockDto {
  @IsOptional()
  @IsUUID()
  id?: string;
}

export class ReplaceBlocksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReplaceBlockDto)
  blocks: ReplaceBlockDto[];
}
