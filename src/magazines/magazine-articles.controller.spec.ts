import { Article } from "../articles/article.entity";
import { Block, BlockType } from "../blocks/block.entity";
import { BatchCoverImageDto } from "./dto/batch-cover-image.dto";
import { BatchCreateArticleDto } from "./dto/batch-create-article.dto";
import { BatchStatusDto } from "./dto/batch-status.dto";
import { CreateMagazineArticleDto } from "./dto/create-magazine-article.dto";
import { ComputedArticleStatus } from "./dto/magazine-article-query.dto";
import { UpdateBlockContentDto } from "./dto/update-block-content.dto";
import { UpdateMagazineArticleDto } from "./dto/update-magazine-article.dto";
import { MagazineArticlesController } from "./magazine-articles.controller";
import { MagazineArticlesService } from "./magazine-articles.service";

const UID = "bible-on-air";

function makeArticle(): Article & { status: ComputedArticleStatus; verseRange: string | null } {
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
    status: ComputedArticleStatus.DRAFT,
    verseRange: null,
  } as any;
}

function makeBlock(): Block {
  return {
    id: "block-uuid-1",
    articleId: "uuid-1",
    order: 1,
    type: BlockType.RICHTEXT,
    subheading: null,
    content: { html: "<p>text</p>" },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Block;
}

describe("MagazineArticlesController", () => {
  let controller: MagazineArticlesController;
  let service: jest.Mocked<MagazineArticlesService>;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findByDate: jest.fn(),
      create: jest.fn(),
      batchCreate: jest.fn(),
      createBlocksFromTemplate: jest.fn(),
      batchUpdateCoverImages: jest.fn(),
      update: jest.fn(),
      updateBlockContent: jest.fn(),
      batchSubmit: jest.fn(),
      batchReview: jest.fn(),
      batchPublish: jest.fn(),
      batchUnpublish: jest.fn(),
    } as any;
    controller = new MagazineArticlesController(service);
  });

  it("findAll → delegates to service with uid and query", async () => {
    const response = {
      data: [makeArticle()],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    service.findAll.mockResolvedValueOnce(response);

    const result = controller.findAll(UID, { status: ComputedArticleStatus.DRAFT });

    await expect(result).resolves.toBe(response);
    expect(service.findAll).toHaveBeenCalledWith(UID, { status: ComputedArticleStatus.DRAFT });
  });

  it("findByDate → delegates to service with uid and date", async () => {
    const article = makeArticle();
    service.findByDate.mockResolvedValueOnce(article);

    const result = controller.findByDate(UID, "2026-04-20");

    await expect(result).resolves.toBe(article);
    expect(service.findByDate).toHaveBeenCalledWith(UID, "2026-04-20");
  });

  it("create → delegates to service with uid and dto", async () => {
    const article = makeArticle();
    service.create.mockResolvedValueOnce(article);
    const dto: CreateMagazineArticleDto = { date: "2026-04-20", title: "測試靈修" };

    const result = controller.create(UID, dto);

    await expect(result).resolves.toBe(article);
    expect(service.create).toHaveBeenCalledWith(UID, dto);
  });

  it("batchCreate → delegates to service with uid and dto", async () => {
    const articles = [makeArticle()];
    service.batchCreate.mockResolvedValueOnce(articles);
    const dto: BatchCreateArticleDto = {
      items: [{ date: "2026-04-21", title: "第一篇" }],
    };

    const result = controller.batchCreate(UID, dto);

    await expect(result).resolves.toBe(articles);
    expect(service.batchCreate).toHaveBeenCalledWith(UID, dto);
  });

  it("createBlocks → delegates to service with uid and article id", async () => {
    const article = makeArticle();
    service.createBlocksFromTemplate.mockResolvedValueOnce(article);

    const result = controller.createBlocks(UID, "uuid-1");

    await expect(result).resolves.toBe(article);
    expect(service.createBlocksFromTemplate).toHaveBeenCalledWith(UID, "uuid-1");
  });

  it("update → delegates to service with uid, date and dto", async () => {
    const article = makeArticle();
    service.update.mockResolvedValueOnce(article);
    const dto: UpdateMagazineArticleDto = { title: "新標題" };

    const result = controller.update(UID, "2026-04-20", dto);

    await expect(result).resolves.toBe(article);
    expect(service.update).toHaveBeenCalledWith(UID, "2026-04-20", dto);
  });

  it("batchUpdateCoverImages → delegates to service with uid and items", async () => {
    const articles = [makeArticle()];
    service.batchUpdateCoverImages.mockResolvedValueOnce(articles);
    const dto: BatchCoverImageDto = {
      items: [{ date: "2026-04-21", imageUrl: "/uploads/a.jpg" }],
    };

    const result = controller.batchUpdateCoverImages(UID, dto);

    await expect(result).resolves.toBe(articles);
    expect(service.batchUpdateCoverImages).toHaveBeenCalledWith(UID, dto.items);
  });

  it("updateBlockContent → delegates to service with uid, date, blockId and dto", async () => {
    const block = makeBlock();
    service.updateBlockContent.mockResolvedValueOnce(block);
    const dto: UpdateBlockContentDto = { content: { html: "<p>updated</p>" } };

    const result = controller.updateBlockContent(UID, "2026-04-20", "block-uuid-1", dto);

    await expect(result).resolves.toBe(block);
    expect(service.updateBlockContent).toHaveBeenCalledWith(
      UID, "2026-04-20", "block-uuid-1", dto,
    );
  });

  it("batchSubmit → delegates to service with uid and ids", async () => {
    const articles = [makeArticle()];
    service.batchSubmit.mockResolvedValueOnce(articles);
    const dto: BatchStatusDto = { ids: ["uuid-1"] };

    const result = controller.batchSubmit(UID, dto);

    await expect(result).resolves.toBe(articles);
    expect(service.batchSubmit).toHaveBeenCalledWith(UID, dto.ids);
  });

  it("batchReview → delegates to service with uid and ids", async () => {
    const articles = [makeArticle()];
    service.batchReview.mockResolvedValueOnce(articles);
    const dto: BatchStatusDto = { ids: ["uuid-1"] };

    const result = controller.batchReview(UID, dto);

    await expect(result).resolves.toBe(articles);
    expect(service.batchReview).toHaveBeenCalledWith(UID, dto.ids);
  });

  it("batchPublish → delegates to service with uid and ids", async () => {
    const articles = [makeArticle()];
    service.batchPublish.mockResolvedValueOnce(articles);
    const dto: BatchStatusDto = { ids: ["uuid-1"] };

    const result = controller.batchPublish(UID, dto);

    await expect(result).resolves.toBe(articles);
    expect(service.batchPublish).toHaveBeenCalledWith(UID, dto.ids);
  });

  it("batchUnpublish → delegates to service with uid and ids", async () => {
    const articles = [makeArticle()];
    service.batchUnpublish.mockResolvedValueOnce(articles);
    const dto: BatchStatusDto = { ids: ["uuid-1"] };

    const result = controller.batchUnpublish(UID, dto);

    await expect(result).resolves.toBe(articles);
    expect(service.batchUnpublish).toHaveBeenCalledWith(UID, dto.ids);
  });
});
