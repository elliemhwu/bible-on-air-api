import { BibleService } from './bible.service';
import { BibleCacheService } from './bible-cache.service';
import { BibleFhlProvider } from './providers/bible-fhl.provider';
import { Verse, VerseRange } from './bible.types';

function makeVerse(abbrZh: string, chapter: number, verse: number): Verse {
  return { abbrZh, chapter, verse, text: `${abbrZh}${chapter}:${verse}`, version: 'nstrunv' };
}

const RANGE: VerseRange = { abbrZh: '出', chapterStart: 13, verseStart: 19 };

describe('BibleService', () => {
  let service: BibleService;
  let cache: jest.Mocked<BibleCacheService>;
  let provider: jest.Mocked<BibleFhlProvider>;

  beforeEach(() => {
    cache = { findVerses: jest.fn(), saveVerses: jest.fn(), findOne: jest.fn() } as any;
    provider = { getVerses: jest.fn(), version: 'nstrunv' } as any;
    service = new BibleService(cache, provider);
  });

  describe('getVerses', () => {
    it('cache hit → returns cached verses, does not call provider', async () => {
      const cached = [makeVerse('出', 13, 19)];
      cache.findVerses.mockResolvedValueOnce(cached);

      const result = await service.getVerses([RANGE]);

      expect(result.verses).toEqual(cached);
      expect(provider.getVerses).not.toHaveBeenCalled();
      expect(cache.saveVerses).not.toHaveBeenCalled();
    });

    it('cache miss → calls provider and saves result', async () => {
      const fetched = [makeVerse('出', 13, 19)];
      cache.findVerses.mockResolvedValueOnce(null);
      provider.getVerses.mockResolvedValueOnce(fetched);
      cache.saveVerses.mockResolvedValueOnce(undefined);

      const result = await service.getVerses([RANGE]);

      expect(provider.getVerses).toHaveBeenCalledWith(RANGE);
      expect(cache.saveVerses).toHaveBeenCalledWith(fetched);
      expect(result.verses).toEqual(fetched);
    });

    it('multiple ranges → merges verses in order', async () => {
      const range1: VerseRange = { abbrZh: '出', chapterStart: 13, verseStart: 19 };
      const range2: VerseRange = { abbrZh: '創', chapterStart: 1, verseStart: 1 };
      const v1 = makeVerse('出', 13, 19);
      const v2 = makeVerse('創', 1, 1);

      cache.findVerses.mockResolvedValueOnce([v1]).mockResolvedValueOnce([v2]);

      const result = await service.getVerses([range1, range2]);

      expect(result.verses).toEqual([v1, v2]);
      expect(result.ranges).toEqual([
        { abbrZh: '出', zh: '出埃及記', en: 'Exodus', abbrEn: 'Exod', chapterStart: 13, verseStart: 19 },
        { abbrZh: '創', zh: '創世記', en: 'Genesis', abbrEn: 'Gen', chapterStart: 1, verseStart: 1 },
      ]);
    });

    it('returns enriched ranges in result', async () => {
      cache.findVerses.mockResolvedValueOnce([makeVerse('出', 13, 19)]);

      const result = await service.getVerses([RANGE]);

      expect(result.ranges).toEqual([
        { abbrZh: '出', zh: '出埃及記', en: 'Exodus', abbrEn: 'Exod', chapterStart: 13, verseStart: 19 },
      ]);
    });
  });
});
