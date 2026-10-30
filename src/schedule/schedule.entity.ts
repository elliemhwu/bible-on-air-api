import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Article } from "../articles/article.entity";
import { User } from "../users/user.entity";

/** The three teams that take turns: 寫作、校稿、圖片 */
export enum Team {
  WRITER = "writer",
  REVIEWER = "reviewer",
  IMAGE = "image",
}

/** One weekday (Mon–Sat) of a week plan */
export interface PlanDay {
  /** Passage reference, e.g. "太24:1-14"; "" = not planned yet */
  ref: string;
  /** 書卷鳥瞰 day instead of a daily devotion */
  overview?: boolean;
}

/** 進度安排: the passages for one week, keyed by its Monday */
@Entity("week_plans")
export class WeekPlan {
  @PrimaryColumn({ type: "varchar", length: 100 })
  publicationUid: string;

  @PrimaryColumn({ type: "date" })
  weekStart: string;

  @Column({ type: "varchar", length: 200, nullable: true })
  sundayTheme: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  sundayPassage: string | null;

  /** Always six entries, Monday to Saturday */
  @Column({ type: "jsonb", default: () => "'[]'" })
  days: PlanDay[];

  @UpdateDateColumn()
  updatedAt: Date;
}

/** Rotation order of a team; assignments are filled from it in turn */
@Entity("team_rosters")
export class TeamRoster {
  @PrimaryColumn({ type: "varchar", length: 100 })
  publicationUid: string;

  @PrimaryColumn({ type: "varchar", length: 20 })
  team: Team;

  @Column({ type: "jsonb", default: () => "'[]'" })
  userIds: string[];

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Who serves a team on a given day. Stored per day so a 3-day writer slot can
 * still have single-day exceptions; the UI groups days back into slots.
 */
@Entity("assignments")
export class Assignment {
  @PrimaryColumn({ type: "varchar", length: 100 })
  publicationUid: string;

  @PrimaryColumn({ type: "date" })
  date: string;

  @PrimaryColumn({ type: "varchar", length: 20 })
  team: Team;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;
}

export enum NoteTag {
  HEADING = "heading",
  QUESTION = "question",
  FRAGMENT = "fragment",
}

/** A writer's reading-mode note on the passage of a day */
@Entity("writing_notes")
export class WritingNote {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  publicationUid: string;

  @Column({ type: "date" })
  date: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  tag: NoteTag | null;

  /** Verse numbers the note is about (within the day's passage); empty = whole passage */
  @Column({ type: "jsonb", default: () => "'[]'" })
  verses: number[];

  @Column({ type: "text" })
  text: string;

  @Column({ type: "int", default: 0 })
  order: number;

  /** Section the note was last copied into, e.g. "今日靈修" */
  @Column({ type: "varchar", length: 100, nullable: true })
  usedIn: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/** 留話: a message on an article, e.g. from the reviewer to the writer */
@Entity("article_comments")
export class ArticleComment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  articleId: string;

  @ManyToOne(() => Article, { onDelete: "CASCADE" })
  @JoinColumn({ name: "articleId" })
  article: Article;

  @Column({ type: "uuid" })
  authorId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "authorId" })
  author: User;

  @Column({ type: "text" })
  text: string;

  @CreateDateColumn()
  createdAt: Date;
}
