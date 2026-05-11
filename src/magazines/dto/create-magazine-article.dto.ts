import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ArticleStatus } from '../../articles/article.entity';
import { BlockType } from '../../blocks/block.entity';
import { BlockContent } from '../../blocks/block-content.types';

export class CreateBlockDto {
  @IsNumber()
  order: number;

  @IsEnum(BlockType)
  type: BlockType;

  @IsOptional()
  @IsString()
  subheading?: string;

  @IsOptional()
  @IsObject()
  content?: BlockContent;
}

export class CreateMagazineArticleDto {
  @IsDateString()
  date: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsNumber()
  articleTemplateId?: number;

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBlockDto)
  blocks?: CreateBlockDto[];
}
