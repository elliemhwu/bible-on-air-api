import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ArticleStatus } from '../../articles/article.entity';

export class UpdateMagazineArticleDto {
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @IsOptional()
  @IsDateString()
  date?: string;
}
