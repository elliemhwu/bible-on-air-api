import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, ArticleStatus } from './article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { ArticleQueryDto } from './dto/article-query.dto';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
  ) {}

  async create(dto: CreateArticleDto): Promise<Article> {
    const article = this.articleRepo.create({
      publicationUid: dto.publicationUid,
      date: dto.date,
      status: dto.status ?? ArticleStatus.DRAFT,
      templateId: null,
      publishedAt: null,
      blocks: dto.blocks?.map((b) => ({
        order: b.order,
        type: b.type,
        subheading: b.subheading ?? null,
        content: b.content ?? null,
      })) ?? [],
    });

    return this.articleRepo.save(article);
  }

  async findAll(query: ArticleQueryDto): Promise<Article[]> {
    const qb = this.articleRepo
      .createQueryBuilder('article')
      .orderBy('article.date', 'DESC');

    if (query.publicationUid) {
      qb.andWhere('article.publicationUid = :publicationUid', {
        publicationUid: query.publicationUid,
      });
    }

    if (query.status) {
      qb.andWhere('article.status = :status', { status: query.status });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Article> {
    const article = await this.articleRepo.findOne({
      where: { id },
      relations: ['blocks'],
      order: { blocks: { order: 'ASC' } },
    });

    if (!article) throw new NotFoundException(`Article ${id} not found`);

    return article;
  }
}
