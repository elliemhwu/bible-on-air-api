import { BIBLE_BOOKS } from './bible-books.constant';
import { BibleBook, VerseRange } from './bible.types';

/** 由中文縮寫或全名查找書卷。 */
export function findBibleBook(abbrZh: string): BibleBook | undefined {
  return BIBLE_BOOKS.find((b) => b.abbrZh === abbrZh || b.zh === abbrZh);
}

/**
 * 將 VerseRange 展開為個別經節 ref 的陣列。
 *
 * 預設行為：
 * - 只提供 chapterStart + verseStart（無 chapterEnd / verseEnd）→ 單節
 * - 提供 chapterEnd 但無 verseEnd → 延伸至 chapterEnd 的最後一節
 */
export function expandVerseRange(
  range: VerseRange,
): Array<{ abbrZh: string; chapter: number; verse: number }> {
  const bookDef = findBibleBook(range.abbrZh);
  if (!bookDef) throw new Error(`Unknown book: ${range.abbrZh}`);

  const chEnd = range.chapterEnd ?? range.chapterStart;
  let vEnd: number;
  if (range.verseEnd !== undefined) {
    vEnd = range.verseEnd;
  } else if (range.chapterEnd !== undefined) {
    vEnd = bookDef.chapters[chEnd - 1];
  } else {
    vEnd = range.verseStart; // 單節
  }

  const refs: Array<{ abbrZh: string; chapter: number; verse: number }> = [];
  for (let ch = range.chapterStart; ch <= chEnd; ch++) {
    const vStart = ch === range.chapterStart ? range.verseStart : 1;
    const vEndForChapter = ch === chEnd ? vEnd : bookDef.chapters[ch - 1];
    for (let v = vStart; v <= vEndForChapter; v++) {
      refs.push({ abbrZh: range.abbrZh, chapter: ch, verse: v });
    }
  }
  return refs;
}
