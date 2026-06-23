import { ConflictException, NotFoundException } from "@nestjs/common";
import { Article } from "../articles/article.entity";
import { BibleService } from "../bible/bible.service";
import { VerseBlockContent } from "../blocks/block-content.types";
import { Block, BlockType } from "../blocks/block.entity";
import { ComputedArticleStatus } from "./dto/magazine-article-query.dto";
import { formatVerseRange, MagazineArticlesService } from "./magazine-articles.service";

const UID = "bible-on-air";

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: "uuid-1",
    publicationUid: UID,
    date: "2026-04-20",
    title: "測試靈修",
    submitted: false,
    reviewed: false,
    visible: false,
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
    findBy: jest.fn(),
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
    it("creates article with all booleans false by default", async () => {
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
          submitted: false,
          reviewed: false,
          visible: false,
        }),
      );
      expect(result.status).toBe(ComputedArticleStatus.DRAFT);
    });

    it("returns article with computed status", async () => {
      const article = makeArticle({ submitted: true, reviewed: true, visible: true });
      articleRepo.create.mockReturnValue(article);
      articleRepo.save.mockResolvedValueOnce(article);

      const result = await service.create(UID, { date: "2026-04-20", title: "測試" });

      expect(result.status).toBe(ComputedArticleStatus.PUBLISHED);
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

  // ── batchCreate ─────────────────────────────────────────
  describe("batchCreate", () => {
    it("creates and saves all articles", async () => {
      const a1 = makeArticle({ date: "2026-04-21" });
      const a2 = makeArticle({ id: "uuid-2", date: "2026-04-22" });
      articleRepo.create
        .mockReturnValueOnce(a1)
        .mockReturnValueOnce(a2);
      articleRepo.save.mockResolvedValueOnce([a1, a2]);

      const result = await service.batchCreate(UID, {
        items: [
          { date: "2026-04-21", title: "第一篇" },
          { date: "2026-04-22", title: "第二篇" },
        ],
      });

      expect(articleRepo.create).toHaveBeenCalledTimes(2);
      expect(articleRepo.save).toHaveBeenCalledWith([a1, a2]);
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(ComputedArticleStatus.DRAFT);
    });

    it("always sets booleans to false", async () => {
      const article = makeArticle();
      articleRepo.create.mockReturnValueOnce(article);
      articleRepo.save.mockResolvedValueOnce([article]);

      await service.batchCreate(UID, {
        items: [{ date: "2026-04-21", title: "測試" }],
      });

      expect(articleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ submitted: false, reviewed: false, visible: false }),
      );
    });
  });

  // ── findAll ──────────────────────────────────────────────
  describe("findAll", () => {
    it("returns articles with computed status, ordered by date", async () => {
      const articles = [
        makeArticle({ date: "2026-04-20" }),
        makeArticle({ date: "2026-04-19" }),
      ];
      const qb = makeQb(articles);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(UID, {});

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(ComputedArticleStatus.DRAFT);
      expect(qb.where).toHaveBeenCalledWith("article.publicationUid = :uid", { uid: UID });
      expect(qb.orderBy).toHaveBeenCalledWith("article.date", "DESC");
    });

    it("applies visible=true filter for PUBLISHED status", async () => {
      const qb = makeQb([makeArticle({ visible: true })]);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(UID, { status: ComputedArticleStatus.PUBLISHED });

      expect(qb.andWhere).toHaveBeenCalledWith("article.visible = true");
    });

    it("applies submitted=false filter for DRAFT status", async () => {
      const qb = makeQb([makeArticle()]);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(UID, { status: ComputedArticleStatus.DRAFT });

      expect(qb.andWhere).toHaveBeenCalledWith("article.submitted = false");
    });

    it("applies submitted+!reviewed filter for PENDING_REVIEW", async () => {
      const qb = makeQb([makeArticle({ submitted: true })]);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(UID, { status: ComputedArticleStatus.PENDING_REVIEW });

      expect(qb.andWhere).toHaveBeenCalledWith(
        "article.submitted = true AND article.reviewed = false",
      );
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

    it("found with no verse blocks → returns article with computed status", async () => {
      const article = makeArticle({ blocks: [] });
      const qb = makeQb(article);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByDate(UID, "2026-04-20");

      expect(result).toMatchObject({ id: article.id, status: ComputedArticleStatus.DRAFT });
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
        { abbrZh: "出", chapter: 13, verse: 19, text: "骸骨", version: "nstrunv" },
      ];
      bibleService.getVerses.mockResolvedValueOnce({
        ranges: [
          { abbrZh: "出", zh: "出埃及記", en: "Exodus", abbrEn: "Exod", chapterStart: 13, verseStart: 19 },
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
      const article = makeArticle({ blocks: [makeBlock()] as any });
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
      const article = makeArticle({ blocks: [], articleTemplateId: 1 });
      const qb = makeQb(article);
      articleRepo.createQueryBuilder.mockReturnValue(qb);
      templateRepo.findOneBy.mockResolvedValueOnce(null);

      await expect(
        service.createBlocksFromTemplate(UID, "uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("creates blocks from template definitions and saves", async () => {
      const article = makeArticle({ blocks: [], articleTemplateId: 42 });
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
        expect.objectContaining({ type: BlockType.VERSE, content: { ranges: [] } }),
      );
      expect(articleRepo.manager.create).toHaveBeenCalledWith(
        "Block",
        expect.objectContaining({ type: BlockType.QUESTIONS, content: { items: [] } }),
      );
      expect(articleRepo.manager.create).toHaveBeenCalledWith(
        "Block",
        expect.objectContaining({ type: BlockType.RICHTEXT, content: { html: "" } }),
      );
      expect(result).toMatchObject({ id: savedArticle.id, status: ComputedArticleStatus.DRAFT });
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

      const result = await service.update(UID, "2026-04-20", { title: "新標題" });

      expect(articleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: "新標題" }),
      );
      expect(result.title).toBe("新標題");
    });

    it("not found → propagates NotFoundException from findByDate", async () => {
      const qb = makeQb(null);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.update(UID, "2099-01-01", { title: "x" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── batchUpdateCoverImages ───────────────────────────────
  describe("batchUpdateCoverImages", () => {
    it("updates coverImageUrl for matched articles and saves", async () => {
      const a1 = makeArticle({ date: "2026-04-21", coverImageUrl: null });
      const a2 = makeArticle({ id: "uuid-2", date: "2026-04-22", coverImageUrl: null });
      const qb = makeQb([a1, a2]);
      articleRepo.createQueryBuilder.mockReturnValue(qb);
      articleRepo.save.mockResolvedValueOnce([
        { ...a1, coverImageUrl: "/uploads/a.jpg" },
        { ...a2, coverImageUrl: "/uploads/b.jpg" },
      ]);

      const result = await service.batchUpdateCoverImages(UID, [
        { date: "2026-04-21", imageUrl: "/uploads/a.jpg" },
        { date: "2026-04-22", imageUrl: "/uploads/b.jpg" },
      ]);

      expect(articleRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ date: "2026-04-21", coverImageUrl: "/uploads/a.jpg" }),
          expect.objectContaining({ date: "2026-04-22", coverImageUrl: "/uploads/b.jpg" }),
        ]),
      );
      expect(result).toHaveLength(2);
    });

    it("silently skips dates with no matching article", async () => {
      const qb = makeQb([]);
      articleRepo.createQueryBuilder.mockReturnValue(qb);
      articleRepo.save.mockResolvedValueOnce([]);

      const result = await service.batchUpdateCoverImages(UID, [
        { date: "2099-01-01", imageUrl: "/uploads/missing.jpg" },
      ]);

      expect(articleRepo.save).toHaveBeenCalledWith([]);
      expect(result).toHaveLength(0);
    });

    it("queries only the given dates", async () => {
      const qb = makeQb([]);
      articleRepo.createQueryBuilder.mockReturnValue(qb);
      articleRepo.save.mockResolvedValueOnce([]);

      await service.batchUpdateCoverImages(UID, [
        { date: "2026-04-21", imageUrl: "/uploads/a.jpg" },
      ]);

      expect(qb.andWhere).toHaveBeenCalledWith(
        "article.date IN (:...dates)",
        { dates: ["2026-04-21"] },
      );
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

  // ── findAll readingRange ─────────────────────────────────
  describe("findAll readingRange", () => {
    it("returns readingRange from verse block with subheading=null", async () => {
      const article = makeArticle({
        blocks: [
          {
            id: "b1",
            articleId: "uuid-1",
            order: 1,
            type: BlockType.VERSE,
            subheading: null,
            content: { ranges: [{ abbrZh: "約", chapterStart: 1, verseStart: 1, verseEnd: 10 }] },
          } as any,
        ],
      });
      const qb = makeQb([article]);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(UID, {});

      expect(result[0].readingRange).toBe("約1:1-10");
    });

    it("joins multiple ranges with 、", async () => {
      const article = makeArticle({
        blocks: [
          {
            id: "b1",
            articleId: "uuid-1",
            order: 1,
            type: BlockType.VERSE,
            subheading: null,
            content: {
              ranges: [
                { abbrZh: "約", chapterStart: 1, verseStart: 1 },
                { abbrZh: "約", chapterStart: 2, verseStart: 3, chapterEnd: 2, verseEnd: 5 },
              ],
            },
          } as any,
        ],
      });
      const qb = makeQb([article]);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(UID, {});

      expect(result[0].readingRange).toBe("約1:1、約2:3-5");
    });

    it("returns null when no verse block with subheading=null exists", async () => {
      const article = makeArticle({
        blocks: [
          {
            id: "b1",
            articleId: "uuid-1",
            order: 4,
            type: BlockType.VERSE,
            subheading: "背誦經文",
            content: { ranges: [{ abbrZh: "詩", chapterStart: 23, verseStart: 1 }] },
          } as any,
        ],
      });
      const qb = makeQb([article]);
      articleRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(UID, {});

      expect(result[0].readingRange).toBeNull();
    });
  });

  // ── formatVerseRange ─────────────────────────────────────
  describe("formatVerseRange", () => {
    it("single verse", () => {
      expect(formatVerseRange({ abbrZh: "創", chapterStart: 1, verseStart: 1 })).toBe("創1:1");
    });
    it("same-chapter range", () => {
      expect(formatVerseRange({ abbrZh: "約", chapterStart: 3, verseStart: 16, verseEnd: 18 })).toBe("約3:16-18");
    });
    it("cross-chapter range", () => {
      expect(formatVerseRange({ abbrZh: "詩", chapterStart: 1, verseStart: 1, chapterEnd: 2, verseEnd: 5 })).toBe("詩1:1-2:5");
    });
  });

  // ── batch status operations ──────────────────────────────
  describe("batchSubmit", () => {
    it("sets submitted=true and returns articles with PENDING_REVIEW status", async () => {
      const article = makeArticle();
      articleRepo.findBy.mockResolvedValueOnce([article]);
      articleRepo.save.mockResolvedValueOnce([{ ...article, submitted: true }]);

      const result = await service.batchSubmit(UID, ["uuid-1"]);

      expect(articleRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ submitted: true })]),
      );
      expect(result[0].status).toBe(ComputedArticleStatus.PENDING_REVIEW);
    });
  });

  describe("batchReview", () => {
    it("sets submitted+reviewed=true and returns articles with APPROVED status", async () => {
      const article = makeArticle();
      articleRepo.findBy.mockResolvedValueOnce([article]);
      articleRepo.save.mockResolvedValueOnce([{ ...article, submitted: true, reviewed: true }]);

      const result = await service.batchReview(UID, ["uuid-1"]);

      expect(articleRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ submitted: true, reviewed: true }),
        ]),
      );
      expect(result[0].status).toBe(ComputedArticleStatus.APPROVED);
    });
  });

  describe("batchPublish", () => {
    it("sets all booleans true and writes publishedAt on first publish", async () => {
      const article = makeArticle({ visible: false });
      articleRepo.findBy.mockResolvedValueOnce([article]);
      const saved = { ...article, submitted: true, reviewed: true, visible: true, publishedAt: new Date() };
      articleRepo.save.mockResolvedValueOnce([saved]);

      const result = await service.batchPublish(UID, ["uuid-1"]);

      const savedArg = articleRepo.save.mock.calls[0][0][0];
      expect(savedArg.visible).toBe(true);
      expect(savedArg.publishedAt).toBeInstanceOf(Date);
      expect(result[0].status).toBe(ComputedArticleStatus.PUBLISHED);
    });

    it("does not overwrite publishedAt if already visible", async () => {
      const existingDate = new Date("2026-01-01");
      const article = makeArticle({ visible: true, publishedAt: existingDate });
      articleRepo.findBy.mockResolvedValueOnce([article]);
      articleRepo.save.mockResolvedValueOnce([article]);

      await service.batchPublish(UID, ["uuid-1"]);

      const savedArg = articleRepo.save.mock.calls[0][0][0];
      expect(savedArg.publishedAt).toBe(existingDate);
    });
  });

  describe("batchUnpublish", () => {
    it("sets visible=false and returns articles with APPROVED status", async () => {
      const article = makeArticle({ submitted: true, reviewed: true, visible: true });
      articleRepo.findBy.mockResolvedValueOnce([article]);
      articleRepo.save.mockResolvedValueOnce([{ ...article, visible: false }]);

      const result = await service.batchUnpublish(UID, ["uuid-1"]);

      expect(articleRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ visible: false })]),
      );
      expect(result[0].status).toBe(ComputedArticleStatus.APPROVED);
    });
  });
});
