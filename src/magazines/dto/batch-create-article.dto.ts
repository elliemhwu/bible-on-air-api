import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateMagazineArticleDto } from './create-magazine-article.dto';

export class BatchCreateArticleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMagazineArticleDto)
  items: CreateMagazineArticleDto[];
}
