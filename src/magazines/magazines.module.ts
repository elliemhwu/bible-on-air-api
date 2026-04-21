import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../articles/article.entity';
import { MagazinesService } from './magazines.service';
import { MagazinesController } from './magazines.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Article])],
  providers: [MagazinesService],
  controllers: [MagazinesController],
})
export class MagazinesModule {}
