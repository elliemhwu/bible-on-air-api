import { Injectable } from '@nestjs/common';
import { BibleCacheService } from './bible-cache.service';
import { BibleFhlProvider } from './bible-fhl.provider';
import { VerseRange, VerseResult } from './bible.types';

@Injectable()
export class BibleService {
  constructor(
    private readonly cache: BibleCacheService,
    private readonly provider: BibleFhlProvider,
  ) {}

  async getVerses(range: VerseRange): Promise<VerseResult> {
    const cached = await this.cache.findVerses(range);
    if (cached) {
      return { range, verses: cached };
    }

    const verses = await this.provider.getVerses(range);
    await this.cache.saveVerses(verses);
    return { range, verses };
  }
}
