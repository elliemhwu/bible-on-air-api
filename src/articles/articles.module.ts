import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from './article.entity';
import { BlocksModule } from '../blocks/blocks.module';
import { PublicationsModule } from '../publications/publications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article]),
    BlocksModule,
    PublicationsModule,
  ],
  exports: [TypeOrmModule, BlocksModule],
})
export class ArticlesModule {}
