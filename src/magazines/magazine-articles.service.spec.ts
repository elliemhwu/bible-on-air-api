import { ConflictException, NotFoundException } from "@nestjs/common";
import { Article, ArticleStatus } from "../articles/article.entity";
import { BibleService } from "../bible/bible.service";
import { VerseBlockContent } from "../blocks/block-content.types";
import { Block, BlockType } from "../blocks/block.entity";
import { MagazineArticlesService } from "./magazine-articles.service";

const UID = "bible-on-air";

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: "uuid-1",
    publicationUid: UID,
    date: "2026-04-20",
    title: "測試靈修",
    status: ArticleStatus.DRAFT,
    articleTemplateId: null,
    coverImageUrl: null,
    publishedAt: null,
    blocks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Article;
}

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "block-uuid-1",
    articleId: "uuid-1",
    order: 1,
    type: BlockType.RICHTEXT,
    subheading: null,
    content: { html: "<p>text</p>" },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Block;
}

function makeRepo() {
  return {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: { create: jest.fn() },
  };
}

function makeQb(result: Article | null | Article[]) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
    getOne: jest.fn().mockResolvedValue(result),
  };
  return qb;
}

describe("MagazineArticlesService", () => {
  let service: MagazineArticlesService;
  let articleRepo: ReturnType<typeof makeRepo>;
  let templateRepo: ReturnType<typeof makeRepo>;
  let blockRepo: ReturnType<typeof makeRepo>;
  let bibleService: jest.Mocked<BibleService>;

  beforeEach(() => {
    articleRepo = makeRepo();
    templateRepo = makeRepo();
    blockRepo = makeRepo();
    bibleService = { getVerses: jest.fn() } as any;
    service = new MagazineArticlesService(
      articleRepo as any,
      templateRepo as any,
      blockRepo as any,
      bibleService,
    );
  });

  // ── create ───────────────────────────────────────────────
  describe("create", () => {
    it("creates and saves article with default DRAFT status", async () => {
      const article = makeArticle();
      articleRepo.create.mockReturnValue(article);
      articleRepo.save.mockResolvedValueOnce(article);

      const result = await service.create(UID, {
        date: "2026-04-20",
        title: "測試靈修",
      });

      expect(articleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          publicationUid: UID,
          status: ArticleStatus.DRAFT,
        }),
      );
      expect(articleRepo.save).toHaveBeenCalledWith(article);
      expect(result).toBe(article);
    });

    it("respects explicitly provided status", async () => {
      const article = makeArticle({ status: ArticleStatus.PUBLISHED });
      articleRepo.create.mockReturnValue(article);
      articleRepo.save.mockResolvedValueOnce(article);

      await service.create(UID, {
        date: "2026-04-20",
        title: "測試靈修",
        status: ArticleStatus.PUBLISHED,
      });

      expect(articleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ArticleStatus.PUBLISHED }),
      );
    });

    it("maps blocks dto to entity shape", async () => {
      const article = makeArticle();
      articleRepo.create.mockReturnValue(article);
      articleRepo.save.mockResolvedValueOnce(article);

      await service.create(UID, {
        date: "2026-04-20",
        title: "測試",
        blocks: [
          {
            order: 1,
            type: BlockType.RICHTEXT,
            subheading: "今日靈修",
            content: { html: "<p>text</p>" },
          },
        ],
      });

      expect(articleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          blocks: [
            {
              order: 1,
              type: BlockType.RICHTEXT,
              subheading: "今日靈修",
              content: { html: "<p>text</p>" },
            },
          ],
        }),
      );
    });
  });

  // ── findAll ──────────────────────────────────────────────
  describe("findAll", () => {
    it("returns articles ordered by date", async () => {
      const articles = [
        makeArticle({ date: "2026-04-20" }),
        makeArticle({ date: "2026-04-19" }),
      ];
      const qb = makeQb(articles);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(UID, {});

      expect(result).toBe(articles);
      expect(qb.where).toHaveBeenCalledWith("article.publicationUid = :uid", {
        uid: UID,
      });
      expect(qb.orderBy).toHaveBeenCalledWith("article.date", "DESC");
    });

    it("applies status filter when provided", async () => {
      const qb = makeQb([makeArticle()]);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(UID, { status: ArticleStatus.PUBLISHED });

      expect(qb.andWhere).toHaveBeenCalledWith("article.status = :status", {
        status: ArticleStatus.PUBLISHED,
      });
    });

    it("does not apply status filter when omitted", async () => {
      const qb = makeQb([makeArticle()]);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(UID, {});

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  // ── findByDate ───────────────────────────────────────────
  describe("findByDate", () => {
    it("not found → throws NotFoundException", async () => {
      const qb = makeQb(null);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findByDate(UID, "2026-04-20")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("found with no verse blocks → returns article unchanged", async () => {
      const article = makeArticle({ blocks: [] });
      const qb = makeQb(article);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByDate(UID, "2026-04-20");

      expect(result).toMatchObject({ id: article.id });
      expect(bibleService.getVerses).not.toHaveBeenCalled();
    });

    it("found with verse block → calls BibleService and attaches verses", async () => {
      const verseContent: VerseBlockContent = {
        ranges: [{ abbrZh: "出", chapterStart: 13, verseStart: 19 }],
      };
      const article = makeArticle({
        blocks: [
          {
            id: "b1",
            articleId: "uuid-1",
            order: 1,
            type: BlockType.VERSE,
            subheading: null,
            content: verseContent,
          } as any,
        ],
      });
      const qb = makeQb(article);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      const verses = [
        {
          abbrZh: "出",
          chapter: 13,
          verse: 19,
          text: "骸骨",
          version: "nstrunv",
        },
      ];
      bibleService.getVerses.mockResolvedValueOnce({
        ranges: [
          {
            abbrZh: "出",
            zh: "出埃及記",
            en: "Exodus",
            abbrEn: "Exod",
            chapterStart: 13,
            verseStart: 19,
          },
        ],
        verses,
      });

      const result = await service.findByDate(UID, "2026-04-20");

      expect(bibleService.getVerses).toHaveBeenCalledWith([
        { abbrZh: "出", chapterStart: 13, verseStart: 19 },
      ]);
      expect(result.blocks[0].content).toMatchObject({ verses });
    });

    it("found with non-verse block → does not call BibleService", async () => {
      const article = makeArticle({
        blocks: [
          {
            id: "b1",
            articleId: "uuid-1",
            order: 1,
            type: BlockType.RICHTEXT,
            subheading: null,
            content: { html: "<p>x</p>" },
          } as any,
        ],
      });
      const qb = makeQb(article);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findByDate(UID, "2026-04-20");

      expect(bibleService.getVerses).not.toHaveBeenCalled();
    });
  });

  // ── createBlocksFromTemplate ─────────────────────────────
  describe("createBlocksFromTemplate", () => {
    it("throws ConflictException if article already has blocks", async () => {
      const article = makeArticle({
        blocks: [makeBlock()] as any,
      });
      const qb = makeQb(article);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.createBlocksFromTemplate(UID, "uuid-1"),
      ).rejects.toThrow(ConflictException);
    });

    it("throws NotFoundException if article has no templateId", async () => {
      const article = makeArticle({ blocks: [], articleTemplateId: null });
      const qb = makeQb(article);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.createBlocksFromTemplate(UID, "uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException if template does not exist", async () => {
      const article = makeArticle({
        blocks: [],
        articleTemplateId: 1,
      });
      const qb = makeQb(article);
      articleRepo.createQueryBuilder.mockReturnValue(qb);
      templateRepo.findOneBy.mockResolvedValueOnce(null);

      await expect(
        service.createBlocksFromTemplate(UID, "uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("creates blocks from template definitions and saves", async () => {
      const article = makeArticle({
        blocks: [],
        articleTemplateId: 42,
      });
      const qb = makeQb(article);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      const template = {
        id: "tmpl-uuid",
        blockDefinitions: [
          { order: 1, type: BlockType.VERSE, subheading: null },
          { order: 2, type: BlockType.QUESTIONS, subheading: "觀察與思想" },
          { order: 3, type: BlockType.RICHTEXT, subheading: "今日靈修" },
        ],
      };
      templateRepo.findOneBy.mockResolvedValueOnce(template);

      const mockBlocks = template.blockDefinitions.map((def) => ({
        order: def.order,
        type: def.type,
        subheading: def.subheading,
      }));
      articleRepo.manager.create
        .mockReturnValueOnce(mockBlocks[0])
        .mockReturnValueOnce(mockBlocks[1])
        .mockReturnValueOnce(mockBlocks[2]);

      const savedArticle = { ...article, blocks: mockBlocks };
      articleRepo.save.mockResolvedValueOnce(savedArticle);

      const result = await service.createBlocksFromTemplate(UID, "uuid-1");

      expect(articleRepo.manager.create).toHaveBeenCalledTimes(3);
      expect(articleRepo.manager.create).toHaveBeenCalledWith(
        "Block",
        expect.objectContaining({
          type: BlockType.VERSE,
          content: { ranges: [] },
        }),
      );
      expect(articleRepo.manager.create).toHaveBeenCalledWith(
        "Block",
        expect.objectContaining({
          type: BlockType.QUESTIONS,
          content: { items: [] },
        }),
      );
      expect(articleRepo.manager.create).toHaveBeenCalledWith(
        "Block",
        expect.objectContaining({
          type: BlockType.RICHTEXT,
          content: { html: "" },
        }),
      );
      expect(result).toBe(savedArticle);
    });
  });

  // ── update ───────────────────────────────────────────────
  describe("update", () => {
    it("updates provided fields and saves", async () => {
      const article = makeArticle();
      const qb = makeQb(article);
      articleRepo.createQueryBuilder.mockReturnValue(qb);
      const updated = { ...article, title: "新標題" } as Article;
      articleRepo.save.mockResolvedValueOnce(updated);

      const result = await service.update(UID, "2026-04-20", {
        title: "新標題",
      });

      expect(articleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: "新標題" }),
      );
      expect(result.title).toBe("新標題");
    });

    it("updates status", async () => {
      const article = makeArticle();
      const qb = makeQb(article);
      articleRepo.createQueryBuilder.mockReturnValue(qb);
      articleRepo.save.mockResolvedValueOnce({
        ...article,
        status: ArticleStatus.PUBLISHED,
      } as Article);

      await service.update(UID, "2026-04-20", {
        status: ArticleStatus.PUBLISHED,
      });

      expect(articleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ArticleStatus.PUBLISHED }),
      );
    });

    it("not found → propagates NotFoundException from findByDate", async () => {
      const qb = makeQb(null);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.update(UID, "2099-01-01", { title: "x" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateBlockContent ───────────────────────────────────
  describe("updateBlockContent", () => {
    it("updates block content and saves", async () => {
      const block = makeBlock({ id: "block-uuid-1", type: BlockType.RICHTEXT });
      const article = makeArticle({ blocks: [block] as any });
      const qb = makeQb(article);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      const newContent = { html: "<p>updated</p>" };
      const savedBlock = { ...block, content: newContent };
      blockRepo.save.mockResolvedValueOnce(savedBlock);

      const result = await service.updateBlockContent(
        UID,
        "2026-04-20",
        "block-uuid-1",
        { content: newContent },
      );

      expect(blockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ content: newContent }),
      );
      expect(result).toBe(savedBlock);
    });

    it("throws NotFoundException if blockId not in article", async () => {
      const article = makeArticle({
        blocks: [makeBlock({ id: "block-uuid-1" })] as any,
      });
      const qb = makeQb(article);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.updateBlockContent(UID, "2026-04-20", "nonexistent-block", {
          content: { html: "" },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("propagates NotFoundException if article not found", async () => {
      const qb = makeQb(null);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.updateBlockContent(UID, "2099-01-01", "block-uuid-1", {
          content: { html: "" },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
