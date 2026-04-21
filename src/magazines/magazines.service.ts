import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../articles/article.entity';
import { PublicationType } from '../publications/publication.entity';

@Injectable()
export class MagazinesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
  ) {}

  async findByDate(date: string): Promise<Article> {
    const article = await this.articleRepo
      .createQueryBuilder('article')
      .innerJoin('article.publication', 'publication')
      .where('article.date = :date', { date })
      .andWhere('publication.type = :type', { type: PublicationType.MAGAZINE })
      .leftJoinAndSelect('article.blocks', 'blocks')
      .orderBy('blocks.order', 'ASC')
      .getOne();

    if (!article) throw new NotFoundException(`No magazine article for ${date}`);

    return article;
  }
}
