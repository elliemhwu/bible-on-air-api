import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Publication } from '../publications/publication.entity';
import { Block } from '../blocks/block.entity';

export enum ArticleStatus {
  DRAFT = 'draft',
  REVIEWED = 'reviewed',
  PUBLISHED = 'published',
}

class ArticleColumns {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  publicationUid: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 50 })
  status: ArticleStatus;

  @Column({ type: 'int', nullable: true })
  templateId: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImageUrl: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('articles')
export class Article extends ArticleColumns {
  @ManyToOne(() => Publication)
  @JoinColumn({ name: 'publicationUid', referencedColumnName: 'uid' })
  publication: Publication;

  @OneToMany(() => Block, (block) => block.article, { cascade: true })
  blocks: Block[];
}
