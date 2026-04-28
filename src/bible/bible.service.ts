import { Injectable } from "@nestjs/common";
import { BibleCacheService } from "./bible-cache.service";
import { Verse, VerseRange, VerseResultResponse } from "./bible.types";
import { BibleFhlProvider } from "./providers/bible-fhl.provider";
import { enrichRange } from "./utils/bible-books.utils";

@Injectable()
export class BibleService {
  constructor(
    private readonly cache: BibleCacheService,
    private readonly provider: BibleFhlProvider,
  ) {}

  async getVerses(ranges: VerseRange[]): Promise<VerseResultResponse> {
    const allVerses: Verse[] = [];
    for (const range of ranges) {
      let verses = await this.cache.findVerses(range, this.provider.version);
      if (!verses) {
        verses = await this.provider.getVerses(range);
        await this.cache.saveVerses(verses);
      }
      allVerses.push(...verses);
    }
    return { ranges: ranges.map(enrichRange), verses: allVerses };
  }
}
