import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Publisher } from './publisher.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Publisher])],
  exports: [TypeOrmModule],
})
export class PublishersModule {}
