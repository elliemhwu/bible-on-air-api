import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('verse_cache')
@Unique(['abbrZh', 'chapter', 'verse', 'version'])
export class VerseCacheEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  abbrZh: string;

  @Column()
  chapter: number;

  @Column()
  verse: number;

  @Column('text')
  text: string;

  @Column({ length: 32 })
  version: string;

  @CreateDateColumn()
  cachedAt: Date;
}
