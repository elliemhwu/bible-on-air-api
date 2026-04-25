import { Verse, VerseRange } from '../bible.types';

export interface BibleProvider {
  /** 此 provider 所使用的聖經版本，供 cache 查詢時識別。 */
  readonly version: string;
  getVerses(range: VerseRange): Promise<Verse[]>;
}
