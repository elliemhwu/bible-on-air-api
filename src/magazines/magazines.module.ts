import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../articles/article.entity';
import { MagazineArticlesController } from './magazine-articles.controller';
import { MagazineArticlesService } from './magazine-articles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Article])],
  controllers: [MagazineArticlesController],
  providers: [MagazineArticlesService],
})
export class MagazinesModule {}
