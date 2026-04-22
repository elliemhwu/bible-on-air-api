import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ArticleStatus } from '../../articles/article.entity';

export class UpdateMagazineArticleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

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
