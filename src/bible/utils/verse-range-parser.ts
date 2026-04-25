import { BIBLE_BOOKS } from '../bible-books.constant';
import { findBibleBook } from './bible-books.utils';
import { VerseRange } from '../bible.types';

type BookPattern = { pattern: string; abbrZh: string };

// 建立一次，按名稱長度由長到短排序，防止 "撒" 比 "撒上" 先匹配
const BOOK_PATTERNS: BookPattern[] = BIBLE_BOOKS.flatMap((b) => [
  { pattern: b.zh, abbrZh: b.abbrZh },
  { pattern: b.abbrZh, abbrZh: b.abbrZh },
  { pattern: b.en, abbrZh: b.abbrZh },
  { pattern: b.abbrEn, abbrZh: b.abbrZh },
]).sort((a, b) => b.pattern.length - a.pattern.length);

// 章:節 範圍的 pattern，支援三種形式：
//   13:22          → 單節
//   13:21-22       → 同章範圍
//   13:21-14:2     → 跨章範圍
const CHAPTER_VERSE_RE = /^(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/;

/**
 * 將單一經文字串解析為 VerseRange。
 *
 * 支援書名格式：中文縮寫（出）、中文全名（出埃及記）、
 *               英文全名（Exodus）、英文縮寫（Ex、Ex.）
 *
 * 例：parseVerseRange("出埃及記 13:21-14:2")
 *   → { abbrZh: "出", chapterStart: 13, verseStart: 21, chapterEnd: 14, verseEnd: 2 }
 */
export function parseVerseRange(input: string): VerseRange {
  const trimmed = input.trim();

  let abbrZh: string | undefined;
  let rest: string | undefined;

  for (const { pattern, abbrZh: az } of BOOK_PATTERNS) {
    if (trimmed.toLowerCase().startsWith(pattern.toLowerCase())) {
      const after = trimmed.slice(pattern.length);
      // 書名後必須緊接（可選空白或點）再接數字（章號）
      if (/^[\s.]*\d/.test(after)) {
        abbrZh = az;
        rest = after.replace(/^[\s.]*/, '');
        break;
      }
    }
  }

  if (!abbrZh || rest === undefined) {
    throw new Error(`Cannot identify book name in: "${input}"`);
  }

  const match = rest.match(CHAPTER_VERSE_RE);
  if (!match) {
    throw new Error(`Invalid verse reference format in: "${input}"`);
  }

  const [, chStartStr, vStartStr, chEndStr, vEndStr] = match;
  const chapterStart = parseInt(chStartStr, 10);
  const verseStart = parseInt(vStartStr, 10);
  const chapterEnd = chEndStr !== undefined ? parseInt(chEndStr, 10) : undefined;
  const verseEnd = vEndStr !== undefined ? parseInt(vEndStr, 10) : undefined;

  validateRange(abbrZh, chapterStart, verseStart, chapterEnd, verseEnd, input);

  return {
    abbrZh,
    chapterStart,
    verseStart,
    ...(chapterEnd !== undefined && { chapterEnd }),
    ...(verseEnd !== undefined && { verseEnd }),
  };
}

function validateRange(
  abbrZh: string,
  chapterStart: number,
  verseStart: number,
  chapterEnd: number | undefined,
  verseEnd: number | undefined,
  original: string,
): void {
  const book = findBibleBook(abbrZh);
  if (!book) throw new Error(`Unknown book abbreviation: "${abbrZh}"`);

  const totalChapters = book.chapters.length;

  if (chapterStart < 1 || chapterStart > totalChapters) {
    throw new Error(
      `Chapter ${chapterStart} out of range for ${book.zh} (1-${totalChapters}) in: "${original}"`,
    );
  }
  const maxVerseStart = book.chapters[chapterStart - 1];
  if (verseStart < 1 || verseStart > maxVerseStart) {
    throw new Error(
      `Verse ${verseStart} out of range for ${book.zh} ${chapterStart} (1-${maxVerseStart}) in: "${original}"`,
    );
  }

  if (chapterEnd !== undefined) {
    if (chapterEnd < chapterStart || chapterEnd > totalChapters) {
      throw new Error(
        `End chapter ${chapterEnd} out of range for ${book.zh} in: "${original}"`,
      );
    }
    if (verseEnd !== undefined) {
      const maxVerseEnd = book.chapters[chapterEnd - 1];
      if (verseEnd < 1 || verseEnd > maxVerseEnd) {
        throw new Error(
          `End verse ${verseEnd} out of range for ${book.zh} ${chapterEnd} (1-${maxVerseEnd}) in: "${original}"`,
        );
      }
      if (chapterEnd === chapterStart && verseEnd < verseStart) {
        throw new Error(`End verse must be >= start verse in: "${original}"`);
      }
    }
  } else if (verseEnd !== undefined) {
    // 同章範圍（無 chapterEnd）
    const maxVerse = book.chapters[chapterStart - 1];
    if (verseEnd < verseStart || verseEnd > maxVerse) {
      throw new Error(
        `End verse ${verseEnd} out of range for ${book.zh} ${chapterStart} in: "${original}"`,
      );
    }
  }
}
