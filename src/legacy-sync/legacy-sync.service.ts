import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import {
  ArticleTemplate,
  BlockDefinition,
} from "../article-templates/article-template.entity";
import { Article } from "../articles/article.entity";
import {
  BlockContent,
  QuestionsBlockContent,
  RichtextBlockContent,
  VerseBlockContent,
} from "../blocks/block-content.types";
import { Block, BlockType } from "../blocks/block.entity";
import { saveImage } from "../uploads/upload-storage";
import {
  LegacyArticle,
  LegacyMonthLink,
  findMonthlyLinks,
  parseMonthPage,
} from "./legacy-site.parser";

const DEFAULT_SITE_URL = "https://sites.google.com/view/bibleonair";
const CACHE_TTL_MS = 5 * 60 * 1000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** What the legacy site has that the database is missing for a given day. */
export type LegacyGap = "article" | "cover" | "title" | `block:${string}`;

export type LegacyItemState = "missing" | "incomplete" | "synced";

export interface LegacySyncItem {
  date: string;
  kind: LegacyArticle["kind"];
  title: string;
  heading: string;
  state: LegacyItemState;
  gaps: LegacyGap[];
  warnings: string[];
  articleId: string | null;
}

export interface LegacyMonthStatus {
  month: string;
  url: string;
  items: LegacySyncItem[];
}

export interface LegacySyncResult {
  date: string;
  action: "created" | "updated" | "unchanged" | "failed";
  filled: LegacyGap[];
  error?: string;
}

interface DesiredBlock {
  order: number;
  type: BlockType;
  subheading: string | null;
  label: string;
  content: BlockContent;
}

function isEmptyContent(type: BlockType, content: BlockContent | null): boolean {
  if (!content) return true;
  switch (type) {
    case BlockType.VERSE:
      return !(content as VerseBlockContent).ranges?.length;
    case BlockType.QUESTIONS:
      return !(content as QuestionsBlockContent).items?.some((q) => q.trim());
    case BlockType.RICHTEXT:
      return !(content as RichtextBlockContent).html
        ?.replace(/<[^>]*>/g, "")
        .trim();
  }
}

function blockKey(b: { type: BlockType; subheading: string | null }): string {
  return `${b.type}:${b.subheading ?? ""}`;
}

/**
 * Brings content from the legacy Google Site into the database.
 *
 * Only fills gaps: days that do not exist yet are created (published, as they
 * were public on the old site), and existing days only get their empty parts
 * filled. Content edited in the studio is never overwritten.
 */
@Injectable()
export class LegacySyncService {
  private readonly logger = new Logger(LegacySyncService.name);
  private readonly siteUrl: string;
  private readonly pageCache = new Map<string, { at: number; html: string }>();

  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(Block)
    private readonly blockRepo: Repository<Block>,
    @InjectRepository(ArticleTemplate)
    private readonly templateRepo: Repository<ArticleTemplate>,
    config: ConfigService,
  ) {
    this.siteUrl = config.get<string>("LEGACY_SITE_URL") || DEFAULT_SITE_URL;
  }

  async getMonths(): Promise<LegacyMonthLink[]> {
    return findMonthlyLinks(await this.fetchPage(this.siteUrl), this.siteUrl);
  }

  async getMonthStatus(uid: string, month: string, refresh = false): Promise<LegacyMonthStatus> {
    const { link, articles } = await this.loadMonth(month, refresh);
    const existing = await this.findExisting(uid, articles.map((a) => a.date));
    const templates = await this.loadTemplates(uid);

    const items = articles.map((legacy): LegacySyncItem => {
      const article = existing.get(legacy.date);
      const gaps = article
        ? this.findGaps(article, legacy, templates)
        : (["article"] as LegacyGap[]);
      return {
        date: legacy.date,
        kind: legacy.kind,
        title: legacy.title,
        heading: legacy.heading,
        state: !article ? "missing" : gaps.length ? "incomplete" : "synced",
        gaps,
        warnings: legacy.warnings,
        articleId: article?.id ?? null,
      };
    });

    return { month, url: link.url, items };
  }

  /** Sync the given days. Days in different months may be mixed. */
  async syncDates(uid: string, dates: string[]): Promise<LegacySyncResult[]> {
    const templates = await this.loadTemplates(uid);
    const byMonth = new Map<string, string[]>();
    for (const date of dates) {
      const month = date.slice(0, 7);
      byMonth.set(month, [...(byMonth.get(month) ?? []), date]);
    }

    const results: LegacySyncResult[] = [];
    for (const [month, monthDates] of byMonth) {
      const { articles } = await this.loadMonth(month);
      const legacyByDate = new Map(articles.map((a) => [a.date, a]));
      const existing = await this.findExisting(uid, monthDates);

      for (const date of monthDates) {
        const legacy = legacyByDate.get(date);
        if (!legacy) {
          results.push({ date, action: "failed", filled: [], error: "舊網站沒有這一天的內容" });
          continue;
        }
        try {
          results.push(await this.syncOne(uid, legacy, existing.get(date), templates));
        } catch (e) {
          this.logger.warn(`Sync ${date} failed: ${(e as Error).message}`);
          results.push({ date, action: "failed", filled: [], error: (e as Error).message });
        }
      }
    }
    return results;
  }

  private async syncOne(
    uid: string,
    legacy: LegacyArticle,
    article: Article | undefined,
    templates: Templates,
  ): Promise<LegacySyncResult> {
    const desired = this.desiredBlocks(legacy, templates);

    if (!article) {
      const coverImageUrl = await this.downloadCover(legacy);
      const publishedAt = new Date(`${legacy.date}T06:00:00+08:00`);
      await this.articleRepo.save(
        this.articleRepo.create({
          publicationUid: uid,
          date: legacy.date,
          title: legacy.title,
          submitted: true,
          reviewed: true,
          visible: true,
          publishedAt,
          articleTemplateId: this.templateFor(legacy, templates)?.id ?? null,
          coverImageUrl,
          blocks: desired.map(({ label: _label, ...b }) => b),
        }),
      );
      return { date: legacy.date, action: "created", filled: ["article"] };
    }

    const gaps = this.findGaps(article, legacy, templates);
    if (gaps.length === 0) {
      return { date: legacy.date, action: "unchanged", filled: [] };
    }

    const filled: LegacyGap[] = [];
    if (gaps.includes("title")) {
      article.title = legacy.title;
      filled.push("title");
    }
    if (gaps.includes("cover")) {
      article.coverImageUrl = await this.downloadCover(legacy);
      if (article.coverImageUrl) filled.push("cover");
    }
    if (!article.articleTemplateId) {
      article.articleTemplateId = this.templateFor(legacy, templates)?.id ?? null;
    }
    await this.articleRepo.save(article);

    const byKey = new Map(article.blocks.map((b) => [blockKey(b), b]));
    for (const want of desired) {
      const gap: LegacyGap = `block:${want.label}`;
      if (!gaps.includes(gap)) continue;
      const block = byKey.get(blockKey(want));
      if (block) {
        // Keep editor settings such as displayMode; only fill the content itself
        block.content = { ...(block.content ?? {}), ...want.content } as BlockContent;
        await this.blockRepo.save(block);
      } else {
        await this.blockRepo.save(
          this.blockRepo.create({
            articleId: article.id,
            order: want.order,
            type: want.type,
            subheading: want.subheading,
            content: want.content,
          }),
        );
      }
      filled.push(gap);
    }

    return { date: legacy.date, action: filled.length ? "updated" : "unchanged", filled };
  }

  private findGaps(article: Article, legacy: LegacyArticle, templates: Templates): LegacyGap[] {
    const gaps: LegacyGap[] = [];
    if (!article.title?.trim() && legacy.title) gaps.push("title");
    if (!article.coverImageUrl && legacy.imageUrl) gaps.push("cover");

    const byKey = new Map((article.blocks ?? []).map((b) => [blockKey(b), b]));
    for (const want of this.desiredBlocks(legacy, templates)) {
      const block = byKey.get(blockKey(want));
      if (!block || isEmptyContent(block.type, block.content)) {
        gaps.push(`block:${want.label}`);
      }
    }
    return gaps;
  }

  /** Blocks the legacy day can provide, following the matching template. */
  private desiredBlocks(legacy: LegacyArticle, templates: Templates): DesiredBlock[] {
    const template = this.templateFor(legacy, templates);
    const definitions: BlockDefinition[] = template?.blockDefinitions ?? [];

    const contentFor = (def: BlockDefinition): BlockContent | null => {
      const defaults = (def.defaultContent ?? {}) as object;
      const key = `${def.type}:${def.subheading ?? ""}`;
      const daily = legacy.kind === "daily";
      switch (key) {
        case "verse:":
          return legacy.verseRanges.length ? { ...defaults, ranges: legacy.verseRanges } : null;
        case "verse:背誦經文":
          return legacy.memoryVerseRanges.length
            ? { ...defaults, ranges: legacy.memoryVerseRanges }
            : null;
        case "questions:觀察與思想":
          return legacy.questions.length ? { items: legacy.questions } : null;
        case "richtext:今日靈修":
          return daily && legacy.devotionalHtml ? { html: legacy.devotionalHtml } : null;
        case "richtext:":
          return !daily && legacy.devotionalHtml ? { html: legacy.devotionalHtml } : null;
        case "richtext:本書大綱":
          return legacy.outlineHtml ? { html: legacy.outlineHtml } : null;
        case "richtext:回應與禱告":
          return legacy.prayerHtml ? { html: legacy.prayerHtml } : null;
        default:
          return null;
      }
    };

    return definitions.flatMap((def) => {
      const content = contentFor(def);
      return content
        ? [{ order: def.order, type: def.type, subheading: def.subheading, label: def.label, content }]
        : [];
    });
  }

  private templateFor(legacy: LegacyArticle, templates: Templates): ArticleTemplate | undefined {
    return legacy.kind === "overview" ? templates.overview : templates.daily;
  }

  private async loadTemplates(uid: string): Promise<Templates> {
    const all = await this.templateRepo.findBy({ publicationUid: uid });
    const daily = all.find((t) => t.isDefault) ?? all.find((t) => t.name.includes("每日"));
    const overview = all.find((t) => t.name.includes("鳥瞰"));
    if (!daily) {
      throw new NotFoundException(`Publication ${uid} has no article templates; run the seed first`);
    }
    return { daily, overview };
  }

  private async findExisting(uid: string, dates: string[]): Promise<Map<string, Article>> {
    if (dates.length === 0) return new Map();
    const sorted = [...dates].sort();
    const articles = await this.articleRepo.find({
      where: { publicationUid: uid, date: Between(sorted[0], sorted[sorted.length - 1]) },
      relations: { blocks: true },
    });
    return new Map(articles.map((a) => [a.date, a]));
  }

  private async loadMonth(
    month: string,
    refresh = false,
  ): Promise<{ link: LegacyMonthLink; articles: LegacyArticle[] }> {
    if (refresh) this.pageCache.clear();
    const link = (await this.getMonths()).find((l) => l.month === month);
    if (!link) {
      throw new NotFoundException(`舊網站沒有 ${month} 的月份頁`);
    }
    return { link, articles: parseMonthPage(await this.fetchPage(link.url)) };
  }

  private async fetchPage(url: string): Promise<string> {
    const cached = this.pageCache.get(url);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.html;

    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(20_000),
    }).catch((e: Error) => {
      throw new BadGatewayException(`無法連線到舊網站：${e.message}`);
    });
    if (!res.ok) {
      throw new BadGatewayException(`舊網站回應 ${res.status}：${url}`);
    }
    const html = await res.text();
    this.pageCache.set(url, { at: Date.now(), html });
    return html;
  }

  private async downloadCover(legacy: LegacyArticle): Promise<string | null> {
    if (!legacy.imageUrl) return null;
    const res = await fetch(legacy.imageUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(30_000),
    });
    const mimeType = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (!res.ok || !mimeType.startsWith("image/")) {
      throw new BadGatewayException(`封面圖片下載失敗（${res.status} ${mimeType}）`);
    }
    return saveImage(Buffer.from(await res.arrayBuffer()), mimeType);
  }
}

interface Templates {
  daily: ArticleTemplate;
  overview?: ArticleTemplate;
}
