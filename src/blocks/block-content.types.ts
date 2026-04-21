export interface VerseRange {
  book: string;
  chapterStart: number;
  verseStart: number;
  chapterEnd?: number;
  verseEnd?: number;
}

export interface VerseBlockContent {
  range: VerseRange;
  cachedText?: string;
  imageUrl?: string;
}

export interface QuestionsBlockContent {
  items: string[];
}

export interface RichtextBlockContent {
  html: string;
}

export type BlockContent =
  | VerseBlockContent
  | QuestionsBlockContent
  | RichtextBlockContent;
