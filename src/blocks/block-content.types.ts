export interface VerseRange {
  abbrZh: string;
  chapterStart: number;
  verseStart: number;
  chapterEnd?: number;
  verseEnd?: number;
}

export type VerseDisplayMode = "ordered" | "inline" | "inline-numbered";

export interface VerseBlockContent {
  ranges: VerseRange[];
  displayMode?: VerseDisplayMode;
  imageUrl?: string;
}

export interface QuestionsBlockContent {
  items: string[];
}

export interface RichtextBlockContent {
  html: string;
}

/** A passage inside the outline's book, e.g. 1:1 - 4:11 */
export interface OutlineRange {
  chapterStart: number;
  verseStart: number;
  chapterEnd: number;
  verseEnd: number;
}

export interface OutlineItem {
  range: OutlineRange | null;
  text: string;
}

/** A numbered part of the book (一、二、… are added when displayed) */
export interface OutlineSection {
  title: string;
  range: OutlineRange | null;
  items: OutlineItem[];
}

/** 本書大綱 of a 書卷鳥瞰 day */
export interface OutlineBlockContent {
  /** abbrZh of the book, e.g. "太"; "" until chosen */
  book: string;
  sections: OutlineSection[];
}

export type BlockContent =
  | VerseBlockContent
  | QuestionsBlockContent
  | RichtextBlockContent
  | OutlineBlockContent;
