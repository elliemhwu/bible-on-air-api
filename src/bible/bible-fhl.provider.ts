import { Injectable, NotImplementedException } from '@nestjs/common';
import { BibleProvider } from './bible-provider.interface';
import { Verse, VerseRange } from './bible.types';

/**
 * 信望愛（FHL）聖經 API provider。
 * 串接台灣信望愛網站的 JSON 介面取得經文。
 */
@Injectable()
export class BibleFhlProvider implements BibleProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getVerses(_range: VerseRange): Promise<Verse[]> {
    throw new NotImplementedException('BibleFhlProvider not yet implemented');
  }
}
