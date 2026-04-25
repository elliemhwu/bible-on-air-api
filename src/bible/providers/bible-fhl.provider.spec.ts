import { BibleFhlProvider } from './bible-fhl.provider';
import { VerseRange } from '../bible.types';

// 出埃及記 第13章有22節，第14章有25節（來自 BIBLE_BOOKS）

function fhlResponse(
  records: Array<{ chap: number; sec: number; bible_text: string }>,
  status = 'success',
) {
  return { status, record_count: records.length, record: records };
}

describe('BibleFhlProvider', () => {
  let provider: BibleFhlProvider;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    provider = new BibleFhlProvider();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => jest.restoreAllMocks());

  function mockFetch(records: Array<{ chap: number; sec: number; bible_text: string }>) {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => fhlResponse(records),
    } as Response);
  }

  // ── URL 組成 ────────────────────────────────────────────
  describe('URL construction', () => {
    it('single verse → sec without range', async () => {
      mockFetch([{ chap: 13, sec: 19, bible_text: 'text' }]);
      await provider.getVerses({ abbrZh: '出', chapterStart: 13, verseStart: 19 });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('chineses=%E5%87%BA'); // "出" URL-encoded
      expect(url).toContain('chap=13');
      expect(url).toContain('sec=19');
      expect(url).not.toContain('sec=19-');
    });

    it('same-chapter range → one fetch, sec=start-end', async () => {
      mockFetch([
        { chap: 13, sec: 19, bible_text: '19' },
        { chap: 13, sec: 20, bible_text: '20' },
        { chap: 13, sec: 21, bible_text: '21' },
      ]);

      await provider.getVerses({ abbrZh: '出', chapterStart: 13, verseStart: 19, verseEnd: 21 });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy.mock.calls[0][0]).toContain('sec=19-21');
    });

    it('cross-chapter range → two fetches with correct params', async () => {
      // 出13:19-14:2 → chap13: sec=19-22 (出13共22節), chap14: sec=1-2
      mockFetch([
        { chap: 13, sec: 19, bible_text: '19' },
        { chap: 13, sec: 20, bible_text: '20' },
        { chap: 13, sec: 21, bible_text: '21' },
        { chap: 13, sec: 22, bible_text: '22' },
      ]);
      mockFetch([
        { chap: 14, sec: 1, bible_text: '14:1' },
        { chap: 14, sec: 2, bible_text: '14:2' },
      ]);

      await provider.getVerses({
        abbrZh: '出',
        chapterStart: 13,
        verseStart: 19,
        chapterEnd: 14,
        verseEnd: 2,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy.mock.calls[0][0]).toContain('chap=13');
      expect(fetchSpy.mock.calls[0][0]).toContain('sec=19-22');
      expect(fetchSpy.mock.calls[1][0]).toContain('chap=14');
      expect(fetchSpy.mock.calls[1][0]).toContain('sec=1-2');
    });

    it('includes gb=0 (Traditional Chinese) and version=nstrunv', async () => {
      mockFetch([{ chap: 1, sec: 1, bible_text: 'text' }]);
      await provider.getVerses({ abbrZh: '創', chapterStart: 1, verseStart: 1 });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('gb=0');
      expect(url).toContain('version=nstrunv');
    });
  });

  // ── 回傳值映射 ─────────────────────────────────────────
  describe('response mapping', () => {
    it('maps API record to Verse correctly', async () => {
      mockFetch([{ chap: 13, sec: 19, bible_text: '摩西把約瑟的骸骨一同帶去' }]);

      const result = await provider.getVerses({ abbrZh: '出', chapterStart: 13, verseStart: 19 });

      expect(result).toEqual([
        { abbrZh: '出', chapter: 13, verse: 19, text: '摩西把約瑟的骸骨一同帶去' },
      ]);
    });

    it('preserves verse order across chapters', async () => {
      mockFetch([{ chap: 13, sec: 22, bible_text: 'ch13 last' }]);
      mockFetch([{ chap: 14, sec: 1, bible_text: 'ch14 first' }]);

      const result = await provider.getVerses({
        abbrZh: '出',
        chapterStart: 13,
        verseStart: 22,
        chapterEnd: 14,
        verseEnd: 1,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ chapter: 13, verse: 22 });
      expect(result[1]).toMatchObject({ chapter: 14, verse: 1 });
    });

    it('returns abbrZh from input range, not from API response', async () => {
      // API 回傳 chineses 欄位，但我們以 range.abbrZh 為準
      mockFetch([{ chap: 1, sec: 1, bible_text: 'text' }]);

      const result = await provider.getVerses({ abbrZh: '創', chapterStart: 1, verseStart: 1 });

      expect(result[0].abbrZh).toBe('創');
    });
  });

  // ── 錯誤處理 ───────────────────────────────────────────
  describe('error handling', () => {
    it('HTTP error response → throws with status code', async () => {
      fetchSpy.mockResolvedValueOnce({ ok: false, status: 503 } as Response);

      await expect(
        provider.getVerses({ abbrZh: '出', chapterStart: 13, verseStart: 19 }),
      ).rejects.toThrow('503');
    });

    it('API status !== success → throws', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => fhlResponse([], 'error'),
      } as unknown as Response);

      await expect(
        provider.getVerses({ abbrZh: '出', chapterStart: 13, verseStart: 19 }),
      ).rejects.toThrow();
    });

    it('network failure → propagates error', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        provider.getVerses({ abbrZh: '出', chapterStart: 13, verseStart: 19 }),
      ).rejects.toThrow('Network error');
    });
  });
});
