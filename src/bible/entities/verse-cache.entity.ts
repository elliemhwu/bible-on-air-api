import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('verse_cache')
@Unique(['abbrZh', 'chapter', 'verse'])
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

  @CreateDateColumn()
  cachedAt: Date;
}
