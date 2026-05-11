import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticleTemplate } from './article-template.entity';
import { ArticleTemplatesController } from './article-templates.controller';
import { ArticleTemplatesService } from './article-templates.service';

@Module({
  imports: [TypeOrmModule.forFeature([ArticleTemplate])],
  controllers: [ArticleTemplatesController],
  providers: [ArticleTemplatesService],
  exports: [ArticleTemplatesService],
})
export class ArticleTemplatesModule {}
