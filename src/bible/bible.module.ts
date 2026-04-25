import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BibleCacheService } from './bible-cache.service';
import { BibleController } from './bible.controller';
import { BibleFhlProvider } from './providers/bible-fhl.provider';
import { BibleService } from './bible.service';
import { VerseCacheEntity } from './entities/verse-cache.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VerseCacheEntity])],
  controllers: [BibleController],
  providers: [BibleService, BibleCacheService, BibleFhlProvider],
  exports: [BibleService],
})
export class BibleModule {}
