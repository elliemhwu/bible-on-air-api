import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../articles/article.entity';
import { BibleModule } from '../bible/bible.module';
import { MagazineArticlesController } from './magazine-articles.controller';
import { MagazineArticlesService } from './magazine-articles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Article]), BibleModule],
  controllers: [MagazineArticlesController],
  providers: [MagazineArticlesService],
})
export class MagazinesModule {}
