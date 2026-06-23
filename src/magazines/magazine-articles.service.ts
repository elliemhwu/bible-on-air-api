import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ArticleTemplate } from '../article-templates/article-template.entity';
import { Article } from '../articles/article.entity';
import { BibleService } from '../bible/bible.service';
import { VerseBlockContent } from '../blocks/block-content.types';
import { Block, BlockType } from '../blocks/block.entity';
import { CoverImageItemDto } from './dto/batch-cover-image.dto';
import { BatchCreateArticleDto } from './dto/batch-create-article.dto';
import { CreateMagazineArticleDto } from './dto/create-magazine-article.dto';
import { ComputedArticleStatus, MagazineArticleQueryDto } from './dto/magazine-article-query.dto';
import { UpdateBlockContentDto } from './dto/update-block-content.dto';
import { UpdateMagazineArticleDto } from './dto/update-magazine-article.dto';

export function computeStatus(article: Pick<Article, 'submitted' | 'reviewed' | 'visible'>): ComputedArticleStatus {
  if (article.visible) return ComputedArticleStatus.PUBLISHED;
  if (article.reviewed) return ComputedArticleStatus.APPROVED;
  if (article.submitted) return ComputedArticleStatus.PENDING_REVIEW;
  return ComputedArticleStatus.DRAFT;
}

function withStatus<T extends Pick<Article, 'submitted' | 'reviewed' | 'visible'>>(article: T) {
  return { ...article, status: computeStatus(article) };
}

@Injectable()
export class MagazineArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(ArticleTemplate)
    private readonly templateRepo: Repository<ArticleTemplate>,
    @InjectRepository(Block)
    private readonly blockRepo: Repository<Block>,
    private readonly bibleService: BibleService,
  ) {}

  async create(uid: string, dto: CreateMagazineArticleDto): Promise<Article & { status: ComputedArticleStatus }> {
    const article = this.articleRepo.create({
      publicationUid: uid,
      date: dto.date,
      title: dto.title,
      submitted: false,
      reviewed: false,
      visible: false,
      articleTemplateId: dto.articleTemplateId ?? null,
      coverImageUrl: null,
      publishedAt: null,
      blocks:
        dto.blocks?.map((b) => ({
          order: b.order,
          type: b.type,
          subheading: b.subheading ?? null,
          content: b.content ?? null,
        })) ?? [],
    });

    return withStatus(await this.articleRepo.save(article));
  }

  async batchCreate(uid: string, dto: BatchCreateArticleDto): Promise<(Article & { status: ComputedArticleStatus })[]> {
    const articles = dto.items.map((item) =>
      this.articleRepo.create({
        publicationUid: uid,
        date: item.date,
        title: item.title,
        submitted: false,
        reviewed: false,
        visible: false,
        articleTemplateId: item.articleTemplateId ?? null,
        coverImageUrl: null,
        publishedAt: null,
        blocks:
          item.blocks?.map((b) => ({
            order: b.order,
            type: b.type,
            subheading: b.subheading ?? null,
            content: b.content ?? null,
          })) ?? [],
      }),
    );
    return (await this.articleRepo.save(articles)).map(withStatus);
  }

  async findAll(uid: string, query: MagazineArticleQueryDto): Promise<(Article & { status: ComputedArticleStatus })[]> {
    const qb = this.articleRepo
      .createQueryBuilder('article')
      .where('article.publicationUid = :uid', { uid })
      .orderBy('article.date', 'DESC');

    if (query.status) {
      switch (query.status) {
        case ComputedArticleStatus.DRAFT:
          qb.andWhere('article.submitted = false');
          break;
        case ComputedArticleStatus.PENDING_REVIEW:
          qb.andWhere('article.submitted = true AND article.reviewed = false');
          break;
        case ComputedArticleStatus.APPROVED:
          qb.andWhere('article.reviewed = true AND article.visible = false');
          break;
        case ComputedArticleStatus.PUBLISHED:
          qb.andWhere('article.visible = true');
          break;
      }
    }

    return (await qb.getMany()).map(withStatus);
  }

  async findByDate(uid: string, date: string): Promise<Article & { status: ComputedArticleStatus }> {
    const article = await this.articleRepo
      .createQueryBuilder('article')
      .where('article.publicationUid = :uid', { uid })
      .andWhere('article.date = :date', { date })
      .leftJoinAndSelect('article.blocks', 'blocks')
      .orderBy('blocks.order', 'ASC')
      .getOne();

    if (!article) {
      throw new NotFoundException(`No article for ${uid} on ${date}`);
    }

    await Promise.all(
      article.blocks.map(async (block) => {
        if (block.type !== BlockType.VERSE || !block.content) return;
        const { ranges } = block.content as VerseBlockContent;
        Object.assign(block.content, await this.bibleService.getVerses(ranges));
      }),
    );

    return withStatus(article);
  }

  async findById(uid: string, id: string): Promise<Article> {
    const article = await this.articleRepo
      .createQueryBuilder('article')
      .where('article.publicationUid = :uid', { uid })
      .andWhere('article.id = :id', { id })
      .leftJoinAndSelect('article.blocks', 'blocks')
      .orderBy('blocks.order', 'ASC')
      .getOne();

    if (!article) {
      throw new NotFoundException(`Article ${id} not found`);
    }

    return article;
  }

  async createBlocksFromTemplate(uid: string, id: string): Promise<Article & { status: ComputedArticleStatus }> {
    const article = await this.findById(uid, id);

    if (article.blocks.length > 0) {
      throw new ConflictException(`Article ${id} already has blocks`);
    }

    if (!article.articleTemplateId) {
      throw new NotFoundException(`Article ${id} has no articleTemplateId`);
    }

    const template = await this.templateRepo.findOneBy({ id: article.articleTemplateId });
    if (!template) {
      throw new NotFoundException(`ArticleTemplate #${article.articleTemplateId} not found`);
    }

    article.blocks = template.blockDefinitions.map((def) => {
      let content: object;
      if (def.type === BlockType.VERSE) {
        content = { ranges: [] };
      } else if (def.type === BlockType.QUESTIONS) {
        content = { items: [] };
      } else {
        content = { html: '' };
      }
      return this.articleRepo.manager.create('Block', {
        order: def.order,
        type: def.type,
        subheading: def.subheading,
        content,
      }) as any;
    });

    return withStatus(await this.articleRepo.save(article));
  }

  async updateBlockContent(uid: string, date: string, blockId: string, dto: UpdateBlockContentDto): Promise<Block> {
    const article = await this.findByDate(uid, date);
    const block = article.blocks.find((b) => b.id === blockId);
    if (!block) {
      throw new NotFoundException(`Block ${blockId} not found on article ${date}`);
    }
    block.content = dto.content as any;
    return this.blockRepo.save(block);
  }

  async batchUpdateCoverImages(uid: string, items: CoverImageItemDto[]): Promise<(Article & { status: ComputedArticleStatus })[]> {
    const dates = items.map((i) => i.date);
    const articles = await this.articleRepo
      .createQueryBuilder('article')
      .where('article.publicationUid = :uid', { uid })
      .andWhere('article.date IN (:...dates)', { dates })
      .getMany();

    const urlByDate = new Map(items.map((i) => [i.date, i.imageUrl]));
    for (const article of articles) {
      article.coverImageUrl = urlByDate.get(article.date) ?? article.coverImageUrl;
    }

    return (await this.articleRepo.save(articles)).map(withStatus);
  }

  async update(uid: string, date: string, dto: UpdateMagazineArticleDto): Promise<Article & { status: ComputedArticleStatus }> {
    const article = await this.findByDate(uid, date);

    if (dto.title !== undefined) article.title = dto.title;
    if (dto.coverImageUrl !== undefined) article.coverImageUrl = dto.coverImageUrl;
    if (dto.date !== undefined) article.date = dto.date;

    return withStatus(await this.articleRepo.save(article));
  }

  async batchSubmit(uid: string, ids: string[]): Promise<(Article & { status: ComputedArticleStatus })[]> {
    const articles = await this.articleRepo.findBy({ publicationUid: uid, id: In(ids) });
    for (const article of articles) {
      article.submitted = true;
    }
    return (await this.articleRepo.save(articles)).map(withStatus);
  }

  async batchReview(uid: string, ids: string[]): Promise<(Article & { status: ComputedArticleStatus })[]> {
    const articles = await this.articleRepo.findBy({ publicationUid: uid, id: In(ids) });
    for (const article of articles) {
      article.submitted = true;
      article.reviewed = true;
    }
    return (await this.articleRepo.save(articles)).map(withStatus);
  }

  async batchPublish(uid: string, ids: string[]): Promise<(Article & { status: ComputedArticleStatus })[]> {
    const articles = await this.articleRepo.findBy({ publicationUid: uid, id: In(ids) });
    const now = new Date();
    for (const article of articles) {
      const wasVisible = article.visible;
      article.submitted = true;
      article.reviewed = true;
      article.visible = true;
      if (!wasVisible) {
        article.publishedAt = now;
      }
    }
    return (await this.articleRepo.save(articles)).map(withStatus);
  }

  async batchUnpublish(uid: string, ids: string[]): Promise<(Article & { status: ComputedArticleStatus })[]> {
    const articles = await this.articleRepo.findBy({ publicationUid: uid, id: In(ids) });
    for (const article of articles) {
      article.visible = false;
    }
    return (await this.articleRepo.save(articles)).map(withStatus);
  }
}
