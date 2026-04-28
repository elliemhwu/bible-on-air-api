import { MagazineArticlesController } from './magazine-articles.controller';
import { MagazineArticlesService } from './magazine-articles.service';
import { Article, ArticleStatus } from '../articles/article.entity';
import { CreateMagazineArticleDto } from './dto/create-magazine-article.dto';
import { UpdateMagazineArticleDto } from './dto/update-magazine-article.dto';

const UID = 'bible-on-air';

function makeArticle(): Article {
  return {
    id: 'uuid-1',
    publicationUid: UID,
    date: '2026-04-20',
    title: '測試靈修',
    status: ArticleStatus.DRAFT,
    templateId: null,
    coverImageUrl: null,
    publishedAt: null,
    blocks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Article;
}

describe('MagazineArticlesController', () => {
  let controller: MagazineArticlesController;
  let service: jest.Mocked<MagazineArticlesService>;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findByDate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as any;
    controller = new MagazineArticlesController(service);
  });

  it('findAll → delegates to service with uid and query', async () => {
    const articles = [makeArticle()];
    service.findAll.mockResolvedValueOnce(articles);

    const result = controller.findAll(UID, { status: ArticleStatus.DRAFT });

    await expect(result).resolves.toBe(articles);
    expect(service.findAll).toHaveBeenCalledWith(UID, { status: ArticleStatus.DRAFT });
  });

  it('findByDate → delegates to service with uid and date', async () => {
    const article = makeArticle();
    service.findByDate.mockResolvedValueOnce(article as any);

    const result = controller.findByDate(UID, '2026-04-20');

    await expect(result).resolves.toBe(article);
    expect(service.findByDate).toHaveBeenCalledWith(UID, '2026-04-20');
  });

  it('create → delegates to service with uid and dto', async () => {
    const article = makeArticle();
    service.create.mockResolvedValueOnce(article);
    const dto: CreateMagazineArticleDto = { date: '2026-04-20', title: '測試靈修' };

    const result = controller.create(UID, dto);

    await expect(result).resolves.toBe(article);
    expect(service.create).toHaveBeenCalledWith(UID, dto);
  });

  it('update → delegates to service with uid, date and dto', async () => {
    const article = makeArticle();
    service.update.mockResolvedValueOnce(article);
    const dto: UpdateMagazineArticleDto = { title: '新標題' };

    const result = controller.update(UID, '2026-04-20', dto);

    await expect(result).resolves.toBe(article);
    expect(service.update).toHaveBeenCalledWith(UID, '2026-04-20', dto);
  });
});
