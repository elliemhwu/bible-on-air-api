import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { expandVerseRange } from './utils/bible-books.utils';
import { Verse, VerseRange } from './bible.types';
import { VerseCacheEntity } from './entities/verse-cache.entity';

@Injectable()
export class BibleCacheService {
  constructor(
    @InjectRepository(VerseCacheEntity)
    private readonly repo: Repository<VerseCacheEntity>,
  ) {}

  /**
   * 查找 range 內所有經節（指定版本）。
   * 若全部命中 cache → 回傳排序後的 Verse[]。
   * 若有任何一節缺失 → 回傳 null（交由 provider 補充）。
   */
  async findVerses(range: VerseRange, version: string): Promise<Verse[] | null> {
    const refs = expandVerseRange(range);

    const rows = await this.repo.find({
      where: refs.map((r) => ({ abbrZh: r.abbrZh, chapter: r.chapter, verse: r.verse, version })),
    });

    if (rows.length !== refs.length) return null;

    const rowMap = new Map(rows.map((r) => [`${r.chapter}:${r.verse}`, r]));
    return refs.map((ref) => {
      const row = rowMap.get(`${ref.chapter}:${ref.verse}`)!;
      return { abbrZh: row.abbrZh, chapter: row.chapter, verse: row.verse, text: row.text, version: row.version };
    });
  }

  /** Upsert 一批經節到 cache。 */
  async saveVerses(verses: Verse[]): Promise<void> {
    if (verses.length === 0) return;
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(VerseCacheEntity)
      .values(
        verses.map((v) => ({
          abbrZh: v.abbrZh,
          chapter: v.chapter,
          verse: v.verse,
          text: v.text,
          version: v.version,
        })),
      )
      .orUpdate(['text', 'cachedAt'], ['abbrZh', 'chapter', 'verse', 'version'])
      .execute();
  }

  /** 查詢單節是否存在於 cache（輔助用途）。 */
  async findOne(abbrZh: string, chapter: number, verse: number, version: string): Promise<Verse | null> {
    const row = await this.repo.findOne({ where: { abbrZh, chapter, verse, version } });
    if (!row) return null;
    return { abbrZh: row.abbrZh, chapter: row.chapter, verse: row.verse, text: row.text, version: row.version };
  }
}
