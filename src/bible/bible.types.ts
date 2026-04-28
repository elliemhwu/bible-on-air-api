import { VerseRange } from '../blocks/block-content.types';

export { VerseRange };

export interface BibleBook {
  id: number;
  zh: string;
  en: string;
  abbrZh: string;
  abbrEn: string;
  /** index = 章數 - 1，值 = 該章的節數 */
  chapters: number[];
}

export interface Verse {
  abbrZh: string; // 中文縮寫，e.g. "約"；透過 BIBLE_BOOKS 可查完整名稱
  chapter: number;
  verse: number;
  text: string;
  version: string; // 聖經版本，e.g. "nstrunv"
}

export interface VerseResult {
  ranges: VerseRange[];
  verses: Verse[];
}

export interface VerseRangeResponse extends VerseRange {
  zh: string;
  en: string;
  abbrEn: string;
}

export interface VerseResultResponse {
  ranges: VerseRangeResponse[];
  verses: Verse[];
}
