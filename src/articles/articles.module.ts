import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from './article.entity';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { BlocksModule } from '../blocks/blocks.module';
import { PublicationsModule } from '../publications/publications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article]),
    BlocksModule,
    PublicationsModule,
  ],
  providers: [ArticlesService],
  controllers: [ArticlesController],
  exports: [TypeOrmModule, BlocksModule],
})
export class ArticlesModule {}
