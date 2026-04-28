import { BibleCacheService } from './bible-cache.service';
import { VerseCacheEntity } from './entities/verse-cache.entity';
import { Repository } from 'typeorm';

function makeRepo() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as jest.Mocked<Repository<VerseCacheEntity>>;
}

function makeVerseCacheRow(
  abbrZh: string,
  chapter: number,
  verse: number,
  text = 'text',
  version = 'nstrunv',
): VerseCacheEntity {
  return { id: 1, abbrZh, chapter, verse, text, version, cachedAt: new Date() } as VerseCacheEntity;
}

describe('BibleCacheService', () => {
  let service: BibleCacheService;
  let repo: ReturnType<typeof makeRepo>;

  beforeEach(() => {
    repo = makeRepo();
    service = new BibleCacheService(repo as any);
  });

  // ── findVerses ───────────────────────────────────────────
  describe('findVerses', () => {
    it('all in cache → returns sorted Verse[]', async () => {
      repo.find.mockResolvedValueOnce([
        makeVerseCacheRow('出', 13, 21, 'v21'),
        makeVerseCacheRow('出', 13, 19, 'v19'),
        makeVerseCacheRow('出', 13, 20, 'v20'),
      ]);

      const result = await service.findVerses(
        { abbrZh: '出', chapterStart: 13, verseStart: 19, verseEnd: 21 },
        'nstrunv',
      );

      expect(result).not.toBeNull();
      expect(result).toHaveLength(3);
      // 應依 range 展開順序排序（19, 20, 21）
      expect(result![0]).toMatchObject({ chapter: 13, verse: 19, text: 'v19' });
      expect(result![1]).toMatchObject({ chapter: 13, verse: 20, text: 'v20' });
      expect(result![2]).toMatchObject({ chapter: 13, verse: 21, text: 'v21' });
    });

    it('any verse missing in cache → returns null', async () => {
      // range 要求 3 節，但只找到 2 筆
      repo.find.mockResolvedValueOnce([
        makeVerseCacheRow('出', 13, 19),
        makeVerseCacheRow('出', 13, 20),
      ]);

      const result = await service.findVerses(
        { abbrZh: '出', chapterStart: 13, verseStart: 19, verseEnd: 21 },
        'nstrunv',
      );

      expect(result).toBeNull();
    });

    it('single verse in cache → returns one-element array', async () => {
      repo.find.mockResolvedValueOnce([makeVerseCacheRow('創', 1, 1, 'In the beginning')]);

      const result = await service.findVerses(
        { abbrZh: '創', chapterStart: 1, verseStart: 1 },
        'nstrunv',
      );

      expect(result).toHaveLength(1);
      expect(result![0]).toMatchObject({ abbrZh: '創', chapter: 1, verse: 1, text: 'In the beginning' });
    });
  });

  // ── saveVerses ───────────────────────────────────────────
  describe('saveVerses', () => {
    it('empty array → skips DB call', async () => {
      await service.saveVerses([]);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('non-empty array → calls upsert chain', async () => {
      const execMock = jest.fn().mockResolvedValueOnce(undefined);
      const orUpdateMock = jest.fn().mockReturnValue({ execute: execMock });
      const valuesMock = jest.fn().mockReturnValue({ orUpdate: orUpdateMock });
      const intoMock = jest.fn().mockReturnValue({ values: valuesMock });
      const insertMock = jest.fn().mockReturnValue({ into: intoMock });
      repo.createQueryBuilder.mockReturnValue({ insert: insertMock } as any);

      await service.saveVerses([
        { abbrZh: '出', chapter: 13, verse: 19, text: '摩西把約瑟的骸骨', version: 'nstrunv' },
      ]);

      expect(repo.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(execMock).toHaveBeenCalledTimes(1);
    });
  });

  // ── findOne ──────────────────────────────────────────────
  describe('findOne', () => {
    it('found → returns Verse', async () => {
      repo.findOne.mockResolvedValueOnce(makeVerseCacheRow('出', 13, 19, '骸骨'));

      const result = await service.findOne('出', 13, 19, 'nstrunv');

      expect(result).toMatchObject({ abbrZh: '出', chapter: 13, verse: 19, text: '骸骨' });
    });

    it('not found → returns null', async () => {
      repo.findOne.mockResolvedValueOnce(null);

      const result = await service.findOne('出', 13, 19, 'nstrunv');

      expect(result).toBeNull();
    });
  });
});
