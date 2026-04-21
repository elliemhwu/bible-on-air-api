import { IsEnum, IsOptional } from 'class-validator';
import { ArticleStatus } from '../../articles/article.entity';

export class MagazineArticleQueryDto {
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;
}
