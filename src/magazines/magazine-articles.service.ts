import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Article, ArticleStatus } from "../articles/article.entity";
import { BibleService } from "../bible/bible.service";
import { VerseBlockContent } from "../blocks/block-content.types";
import { BlockType } from "../blocks/block.entity";
import { CreateMagazineArticleDto } from "./dto/create-magazine-article.dto";
import { MagazineArticleQueryDto } from "./dto/magazine-article-query.dto";
import { UpdateMagazineArticleDto } from "./dto/update-magazine-article.dto";

@Injectable()
export class MagazineArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    private readonly bibleService: BibleService,
  ) {}

  async create(uid: string, dto: CreateMagazineArticleDto): Promise<Article> {
    const article = this.articleRepo.create({
      publicationUid: uid,
      date: dto.date,
      title: dto.title,
      status: dto.status ?? ArticleStatus.DRAFT,
      templateId: null,
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

  async findAll(
    uid: string,
    query: MagazineArticleQueryDto,
  ): Promise<Article[]> {
    const qb = this.articleRepo
      .createQueryBuilder("article")
      .where("article.publicationUid = :uid", { uid })
      .orderBy("article.date", "DESC");

    if (query.status) {
      qb.andWhere("article.status = :status", { status: query.status });
    }

    return qb.getMany();
  }

  async findByDate(uid: string, date: string) {
    const article = await this.articleRepo
      .createQueryBuilder("article")
      .where("article.publicationUid = :uid", { uid })
      .andWhere("article.date = :date", { date })
      .leftJoinAndSelect("article.blocks", "blocks")
      .orderBy("blocks.order", "ASC")
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

  async update(
    uid: string,
    date: string,
    dto: UpdateMagazineArticleDto,
  ): Promise<Article> {
    const article = await this.findByDate(uid, date);

    if (dto.title !== undefined) article.title = dto.title;
    if (dto.coverImageUrl !== undefined)
      article.coverImageUrl = dto.coverImageUrl;
    if (dto.status !== undefined) article.status = dto.status;
    if (dto.date !== undefined) article.date = dto.date;

    return this.articleRepo.save(article);
  }
}
