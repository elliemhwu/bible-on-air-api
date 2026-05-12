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

export type BlockContent =
  | VerseBlockContent
  | QuestionsBlockContent
  | RichtextBlockContent;
