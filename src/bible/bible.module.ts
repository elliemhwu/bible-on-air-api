import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BibleCacheService } from './bible-cache.service';
import { BibleFhlProvider } from './providers/bible-fhl.provider';
import { BibleService } from './bible.service';
import { VerseCacheEntity } from './entities/verse-cache.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VerseCacheEntity])],
  providers: [BibleService, BibleCacheService, BibleFhlProvider],
  exports: [BibleService],
})
export class BibleModule {}
