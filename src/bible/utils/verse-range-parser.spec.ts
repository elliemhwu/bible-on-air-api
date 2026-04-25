import { parseVerseRange } from './verse-range-parser';

describe('parseVerseRange', () => {
  // ── 書名格式 ──────────────────────────────────────────
  describe('book name formats', () => {
    const expected = { abbrZh: '出', chapterStart: 13, verseStart: 22 };

    it('abbrZh', () => expect(parseVerseRange('出13:22')).toEqual(expected));
    it('abbrZh + space', () => expect(parseVerseRange('出 13:22')).toEqual(expected));
    it('zh full name', () => expect(parseVerseRange('出埃及記13:22')).toEqual(expected));
    it('zh full name + space', () => expect(parseVerseRange('出埃及記 13:22')).toEqual(expected));
    it('en full name', () => expect(parseVerseRange('Exodus 13:22')).toEqual(expected));
    it('en full name case-insensitive', () => expect(parseVerseRange('exodus 13:22')).toEqual(expected));
    it('abbrEn', () => expect(parseVerseRange('Exod13:22')).toEqual(expected));
    it('abbrEn + dot', () => expect(parseVerseRange('Exod.13:22')).toEqual(expected));
    it('abbrEn + space', () => expect(parseVerseRange('Exod 13:22')).toEqual(expected));
  });

  // ── 範圍格式 ──────────────────────────────────────────
  describe('range formats', () => {
    it('single verse', () => {
      expect(parseVerseRange('出13:22')).toEqual({
        abbrZh: '出', chapterStart: 13, verseStart: 22,
      });
    });

    it('same-chapter range', () => {
      expect(parseVerseRange('出13:21-22')).toEqual({
        abbrZh: '出', chapterStart: 13, verseStart: 21, verseEnd: 22,
      });
    });

    it('cross-chapter range', () => {
      expect(parseVerseRange('出埃及記13:21-14:2')).toEqual({
        abbrZh: '出', chapterStart: 13, verseStart: 21, chapterEnd: 14, verseEnd: 2,
      });
    });
  });

  // ── 多字縮寫不互相干擾 ────────────────────────────────
  describe('multi-character abbreviation disambiguation', () => {
    it('撒上 vs 撒下', () => {
      expect(parseVerseRange('撒上1:1').abbrZh).toBe('撒上');
      expect(parseVerseRange('撒下1:1').abbrZh).toBe('撒下');
    });

    it('帖前 vs 帖後', () => {
      expect(parseVerseRange('帖前1:1').abbrZh).toBe('帖前');
      expect(parseVerseRange('帖後1:1').abbrZh).toBe('帖後');
    });

    it('約 vs 約一 vs 約二 vs 約三', () => {
      expect(parseVerseRange('約1:1').abbrZh).toBe('約');
      expect(parseVerseRange('約一1:1').abbrZh).toBe('約一');
      expect(parseVerseRange('約二1:1').abbrZh).toBe('約二');
      expect(parseVerseRange('約三1:1').abbrZh).toBe('約三');
    });
  });

  // ── 邊界驗證 ──────────────────────────────────────────
  describe('validation errors', () => {
    it('unknown book → throws', () => {
      expect(() => parseVerseRange('火星書1:1')).toThrow('Cannot identify book name');
    });

    it('chapter out of range → throws', () => {
      expect(() => parseVerseRange('出999:1')).toThrow('out of range');
    });

    it('verse out of range → throws', () => {
      // 出埃及記第1章只有22節
      expect(() => parseVerseRange('出1:999')).toThrow('out of range');
    });

    it('end verse < start verse (same chapter) → throws', () => {
      expect(() => parseVerseRange('出13:22-21')).toThrow();
    });

    it('end chapter < start chapter → throws', () => {
      expect(() => parseVerseRange('出14:1-13:2')).toThrow();
    });
  });
});
