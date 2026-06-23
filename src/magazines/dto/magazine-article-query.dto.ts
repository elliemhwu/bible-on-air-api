import { IsEnum, IsOptional } from 'class-validator';

export enum ComputedArticleStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
}

export class MagazineArticleQueryDto {
  @IsOptional()
  @IsEnum(ComputedArticleStatus)
  status?: ComputedArticleStatus;
}
