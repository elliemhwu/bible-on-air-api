import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from './article.entity';
import { BlocksModule } from '../blocks/blocks.module';

@Module({
  imports: [TypeOrmModule.forFeature([Article]), BlocksModule],
  exports: [TypeOrmModule, BlocksModule],
})
export class ArticlesModule {}
