import { BlockContent } from "src/blocks/block-content.types";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { BlockType } from "../blocks/block.entity";

export interface BlockDefinition {
  order: number;
  type: BlockType;
  subheading: string | null;
  label: string;
  content: BlockContent | null;
}

@Entity("article_templates")
export class ArticleTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 100 })
  publicationUid: string;

  @Column({ type: "jsonb" })
  blockDefinitions: BlockDefinition[];
}
