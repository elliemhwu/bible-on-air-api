import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ArticleStatus } from '../article.entity';

export class ArticleQueryDto {
  @IsOptional()
  @IsString()
  publicationUid?: string;

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;
}
