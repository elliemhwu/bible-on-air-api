import { Injectable } from '@nestjs/common';
import { expandVerseRange } from '../utils/bible-books.utils';
import { Verse, VerseRange } from '../bible.types';
import { BibleProvider } from './bible-provider.interface';

interface FhlRecord {
  chap: number;
  sec: number;
  bible_text: string;
}

interface FhlResponse {
  status: string;
  record_count: number;
  record: FhlRecord[];
}

const FHL_BASE_URL = 'https://bible.fhl.net/json/qb.php';

/**
 * 信望愛（FHL）聖經 API provider。
 * 跨章節範圍會拆成多次 API call（每章一次）。
 */
@Injectable()
export class BibleFhlProvider implements BibleProvider {
  async getVerses(range: VerseRange): Promise<Verse[]> {
    const refs = expandVerseRange(range);

    // 按章分組，保留順序
    const chaptersInOrder: number[] = [];
    const byChapter = new Map<number, number[]>();
    for (const ref of refs) {
      if (!byChapter.has(ref.chapter)) {
        chaptersInOrder.push(ref.chapter);
        byChapter.set(ref.chapter, []);
      }
      byChapter.get(ref.chapter)!.push(ref.verse);
    }

    const allVerses: Verse[] = [];
    for (const chapter of chaptersInOrder) {
      const verses = byChapter.get(chapter)!; // 已按節序排列（來自 expandVerseRange）
      const minVerse = verses[0];
      const maxVerse = verses[verses.length - 1];
      const sec = minVerse === maxVerse ? String(minVerse) : `${minVerse}-${maxVerse}`;

      const params = new URLSearchParams({
        chineses: range.abbrZh,
        chap: String(chapter),
        sec,
        version: 'nstrunv',
        gb: '0',
      });
      const url = `${FHL_BASE_URL}?${params}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `FHL API HTTP ${response.status} for ${range.abbrZh} ${chapter}:${sec}`,
        );
      }

      const data: FhlResponse = await response.json();
      if (data.status !== 'success') {
        throw new Error(
          `FHL API returned status "${data.status}" for ${range.abbrZh} ${chapter}:${sec}`,
        );
      }

      for (const record of data.record) {
        allVerses.push({
          abbrZh: range.abbrZh,
          chapter: record.chap,
          verse: record.sec,
          text: record.bible_text,
        });
      }
    }

    return allVerses;
  }
}
