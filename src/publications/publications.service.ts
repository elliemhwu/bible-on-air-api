import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Publication } from './publication.entity';
import { UpdatePublicationDto } from './update-publication.dto';

@Injectable()
export class PublicationsService {
  constructor(
    @InjectRepository(Publication)
    private readonly repo: Repository<Publication>,
  ) {}

  async findOne(uid: string): Promise<Publication> {
    const publication = await this.repo.findOneBy({ uid });
    if (!publication) {
      throw new NotFoundException(`Publication ${uid} not found`);
    }
    return publication;
  }

  async update(uid: string, dto: UpdatePublicationDto): Promise<Publication> {
    const publication = await this.findOne(uid);
    if (dto.summary !== undefined) publication.summary = dto.summary.trim() || null;
    if (dto.about !== undefined) publication.about = dto.about;
    return this.repo.save(publication);
  }
}
