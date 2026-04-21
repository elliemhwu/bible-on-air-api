import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Block } from './block.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Block])],
  exports: [TypeOrmModule],
})
export class BlocksModule {}
