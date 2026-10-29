import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Block } from "../blocks/block.entity";
import { Publication } from "../publications/publication.entity";

class ArticleColumns {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  publicationUid: string;

  @Column({ type: "date" })
  date: string;

  @Column({ type: "varchar", length: 200, nullable: true })
  title: string | null;

  @Column({ type: "boolean", default: false })
  submitted: boolean;

  @Column({ type: "boolean", default: false })
  reviewed: boolean;

  @Column({ type: "boolean", default: false })
  visible: boolean;

  @Column({ type: "int", nullable: true })
  articleTemplateId: number | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  coverImageUrl: string | null;

  @Column({ type: "timestamptz", nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity("articles")
export class Article extends ArticleColumns {
  @ManyToOne(() => Publication)
  @JoinColumn({ name: "publicationUid", referencedColumnName: "uid" })
  publication: Publication;

  @OneToMany(() => Block, (block) => block.article, { cascade: true })
  blocks: Block[];
}
