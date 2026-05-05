import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../articles/article.entity';
import { AuthModule } from '../auth/auth.module';
import { BibleModule } from '../bible/bible.module';
import { MagazineArticlesController } from './magazine-articles.controller';
import { MagazineArticlesService } from './magazine-articles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Article]), AuthModule, BibleModule],
  controllers: [MagazineArticlesController],
  providers: [MagazineArticlesService],
})
export class MagazinesModule {}
