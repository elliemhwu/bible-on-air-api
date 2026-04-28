import { findBibleBook, expandVerseRange } from './bible-books.utils';

// 出埃及記第1章22節，第13章22節，第14章25節（來自 BIBLE_BOOKS）

describe('findBibleBook', () => {
  it('finds by abbrZh', () => {
    const book = findBibleBook('出');
    expect(book).toBeDefined();
    expect(book?.zh).toBe('出埃及記');
  });

  it('finds by full zh name', () => {
    const book = findBibleBook('出埃及記');
    expect(book).toBeDefined();
    expect(book?.abbrZh).toBe('出');
  });

  it('returns undefined for unknown name', () => {
    expect(findBibleBook('火星書')).toBeUndefined();
  });

  it('correctly identifies multi-character abbreviations', () => {
    expect(findBibleBook('撒上')?.zh).toBe('撒母耳記上');
    expect(findBibleBook('撒下')?.zh).toBe('撒母耳記下');
  });
});

describe('expandVerseRange', () => {
  it('single verse → one ref', () => {
    const refs = expandVerseRange({ abbrZh: '出', chapterStart: 13, verseStart: 19 });
    expect(refs).toEqual([{ abbrZh: '出', chapter: 13, verse: 19 }]);
  });

  it('same-chapter range → sequential refs', () => {
    const refs = expandVerseRange({ abbrZh: '出', chapterStart: 13, verseStart: 19, verseEnd: 21 });
    expect(refs).toEqual([
      { abbrZh: '出', chapter: 13, verse: 19 },
      { abbrZh: '出', chapter: 13, verse: 20 },
      { abbrZh: '出', chapter: 13, verse: 21 },
    ]);
  });

  it('cross-chapter range → continues from verse 1 of next chapter', () => {
    // 出13:22-14:2：13章最後一節是22節
    const refs = expandVerseRange({
      abbrZh: '出',
      chapterStart: 13,
      verseStart: 22,
      chapterEnd: 14,
      verseEnd: 2,
    });
    expect(refs).toEqual([
      { abbrZh: '出', chapter: 13, verse: 22 },
      { abbrZh: '出', chapter: 14, verse: 1 },
      { abbrZh: '出', chapter: 14, verse: 2 },
    ]);
  });

  it('chapterEnd without verseEnd → extends to last verse of chapterEnd', () => {
    // 出1:1-1（chapterEnd=1, no verseEnd）→ 出第1章共22節
    const refs = expandVerseRange({ abbrZh: '出', chapterStart: 1, verseStart: 1, chapterEnd: 1 });
    expect(refs).toHaveLength(22);
    expect(refs[0]).toEqual({ abbrZh: '出', chapter: 1, verse: 1 });
    expect(refs[21]).toEqual({ abbrZh: '出', chapter: 1, verse: 22 });
  });

  it('unknown book → throws', () => {
    expect(() => expandVerseRange({ abbrZh: '火星書', chapterStart: 1, verseStart: 1 })).toThrow(
      'Unknown book',
    );
  });
});
