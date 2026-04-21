import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Publication } from './publication.entity';
import { PublishersModule } from '../publishers/publishers.module';

@Module({
  imports: [TypeOrmModule.forFeature([Publication]), PublishersModule],
  exports: [TypeOrmModule],
})
export class PublicationsModule {}
