import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Article } from '../articles/article.entity';
import { BlockContent } from './block-content.types';

export enum BlockType {
  VERSE = 'verse',
  QUESTIONS = 'questions',
  RICHTEXT = 'richtext',
}

class BlockColumns {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  articleId: string;

  @Column()
  order: number;

  @Column({ type: 'varchar', length: 50 })
  type: BlockType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subheading: string | null;

  @Column({ type: 'jsonb', nullable: true })
  content: BlockContent | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('blocks')
export class Block extends BlockColumns {
  @ManyToOne(() => Article, (article) => article.blocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'articleId' })
  article: Article;
}
