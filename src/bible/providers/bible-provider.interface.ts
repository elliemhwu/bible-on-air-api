import { Verse, VerseRange } from '../bible.types';

export interface BibleProvider {
  getVerses(range: VerseRange): Promise<Verse[]>;
}
