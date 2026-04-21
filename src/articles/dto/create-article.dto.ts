import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ArticleStatus } from '../article.entity';
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

export class CreateArticleDto {
  @IsNotEmpty()
  @IsString()
  publicationUid: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBlockDto)
  blocks?: CreateBlockDto[];
}
