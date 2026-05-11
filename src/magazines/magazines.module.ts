import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticleTemplate } from '../article-templates/article-template.entity';
import { ArticleTemplatesModule } from '../article-templates/article-templates.module';
import { Article } from '../articles/article.entity';
import { AuthModule } from '../auth/auth.module';
import { BibleModule } from '../bible/bible.module';
import { MagazineArticlesController } from './magazine-articles.controller';
import { MagazineArticlesService } from './magazine-articles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, ArticleTemplate]),
    AuthModule,
    BibleModule,
    ArticleTemplatesModule,
  ],
  controllers: [MagazineArticlesController],
  providers: [MagazineArticlesService],
})
export class MagazinesModule {}
