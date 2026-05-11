import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticleTemplate } from './article-template.entity';

@Injectable()
export class ArticleTemplatesService {
  constructor(
    @InjectRepository(ArticleTemplate)
    private readonly templateRepo: Repository<ArticleTemplate>,
  ) {}

  findAll(publicationUid?: string): Promise<ArticleTemplate[]> {
    if (publicationUid) {
      return this.templateRepo.findBy({ publicationUid });
    }
    return this.templateRepo.find();
  }

  async findById(id: number): Promise<ArticleTemplate> {
    const template = await this.templateRepo.findOneBy({ id });
    if (!template) {
      throw new NotFoundException(`ArticleTemplate #${id} not found`);
    }
    return template;
  }
}
