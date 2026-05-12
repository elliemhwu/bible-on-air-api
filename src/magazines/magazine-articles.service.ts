import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticleTemplate } from '../article-templates/article-template.entity';
import { Article, ArticleStatus } from '../articles/article.entity';
import { BibleService } from '../bible/bible.service';
import { VerseBlockContent } from '../blocks/block-content.types';
import { Block, BlockType } from '../blocks/block.entity';
import { CoverImageItemDto } from './dto/batch-cover-image.dto';
import { BatchCreateArticleDto } from './dto/batch-create-article.dto';
import { CreateMagazineArticleDto } from './dto/create-magazine-article.dto';
import { MagazineArticleQueryDto } from './dto/magazine-article-query.dto';
import { UpdateBlockContentDto } from './dto/update-block-content.dto';
import { UpdateMagazineArticleDto } from './dto/update-magazine-article.dto';

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

  async create(uid: string, dto: CreateMagazineArticleDto): Promise<Article> {
    const article = this.articleRepo.create({
      publicationUid: uid,
      date: dto.date,
      title: dto.title,
      status: dto.status ?? ArticleStatus.DRAFT,
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

    return this.articleRepo.save(article);
  }

  async batchCreate(uid: string, dto: BatchCreateArticleDto): Promise<Article[]> {
    const articles = dto.items.map((item) =>
      this.articleRepo.create({
        publicationUid: uid,
        date: item.date,
        title: item.title,
        status: item.status ?? ArticleStatus.DRAFT,
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
    return this.articleRepo.save(articles);
  }

  async findAll(uid: string, query: MagazineArticleQueryDto): Promise<Article[]> {
    const qb = this.articleRepo
      .createQueryBuilder('article')
      .where('article.publicationUid = :uid', { uid })
      .orderBy('article.date', 'DESC');

    if (query.status) {
      qb.andWhere('article.status = :status', { status: query.status });
    }

    return qb.getMany();
  }

  async findByDate(uid: string, date: string): Promise<Article> {
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

    return article;
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

  async createBlocksFromTemplate(uid: string, id: string): Promise<Article> {
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

    return this.articleRepo.save(article);
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

  async batchUpdateCoverImages(uid: string, items: CoverImageItemDto[]): Promise<Article[]> {
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

    return this.articleRepo.save(articles);
  }

  async update(uid: string, date: string, dto: UpdateMagazineArticleDto): Promise<Article> {
    const article = await this.findByDate(uid, date);

    if (dto.title !== undefined) article.title = dto.title;
    if (dto.coverImageUrl !== undefined) article.coverImageUrl = dto.coverImageUrl;
    if (dto.status !== undefined) article.status = dto.status;
    if (dto.date !== undefined) article.date = dto.date;

    return this.articleRepo.save(article);
  }
}
