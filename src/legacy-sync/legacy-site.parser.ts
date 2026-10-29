import { load } from "cheerio";
import type { Element } from "domhandler";
import { BIBLE_BOOKS } from "../bible/bible-books.constant";
import { VerseRange } from "../blocks/block-content.types";
import { parseVerseRange } from "../bible/utils/verse-range-parser";

/**
 * Parser for the legacy Google Site (https://sites.google.com/view/bibleonair).
 *
 * Each month page contains one <section> per day. A day section holds one cover
 * image, one date heading (h1 before 2026/9, h2 afterwards) and a list of <p>,
 * split into parts by marker paragraphs such as "#觀察與思想".
 */

export type LegacyArticleKind = "daily" | "overview";

export interface LegacyArticle {
  date: string; // YYYY-MM-DD
  kind: LegacyArticleKind;
  heading: string;
  title: string;
  /** daily: scripture reading of the day; overview: always empty */
  verseRanges: VerseRange[];
  questions: string[];
  /** daily: 今日靈修; overview: 書卷介紹 */
  devotionalHtml: string;
  /** overview only: 本書大綱 */
  outlineHtml: string;
  memoryVerseRanges: VerseRange[];
  prayerHtml: string;
  imageUrl: string | null;
  warnings: string[];
}

export interface LegacyMonthLink {
  label: string; // e.g. "2026年10月"
  month: string; // YYYY-MM
  url: string;
}

const MARKERS = ["觀察與思想", "今日靈修", "本書大綱", "背誦金句", "回應與禱告"] as const;
type Marker = (typeof MARKERS)[number];

const DATE_HEADING_RE = /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(.*)$/;
const MONTH_LABEL_RE = /(\d{4})年(\d{1,2})月/;
const INVISIBLE_RE = /[​-‏‪-‮⁦-⁩﻿]/g;

/** Spellings used on the legacy site that differ from BIBLE_BOOKS. */
const BOOK_ALIASES: Record<string, string> = {
  約壹: "約一",
  約貳: "約二",
  約參: "約三",
};

const BOOK_NAMES = [
  ...BIBLE_BOOKS.flatMap((b) => [
    { name: b.zh, abbrZh: b.abbrZh },
    { name: b.abbrZh, abbrZh: b.abbrZh },
  ]),
  ...Object.entries(BOOK_ALIASES).map(([name, abbrZh]) => ({ name, abbrZh })),
].sort((a, b) => b.name.length - a.name.length);

function pad(n: string | number): string {
  return String(n).padStart(2, "0");
}

function cleanText(text: string): string {
  return text.replace(INVISIBLE_RE, "").replace(/ /g, " ").trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Paragraph text → <p> list; leading (full-width) indentation is dropped. */
function toHtml(paragraphs: string[]): string {
  return paragraphs
    .map((p) => p.replace(/^[\s　]+/, ""))
    .filter((p) => p.length > 0)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

function matchMarker(text: string): { marker: Marker; rest: string } | null {
  const stripped = text.replace(/^[#＃]\s*/, "");
  for (const marker of MARKERS) {
    if (stripped.startsWith(marker)) {
      const rest = stripped.slice(marker.length).trim();
      // "觀察與思想" without "#" is only a marker when it stands alone
      if (stripped === text && rest) return null;
      return { marker, rest };
    }
  }
  return null;
}

function normalizeReference(text: string): string {
  let t = cleanText(text)
    .replace(/[：]/g, ":")
    .replace(/[－–—~～]/g, "-")
    .replace(/\s*:\s*/g, ":")
    .replace(/\s*-\s*/g, "-");
  for (const { name, abbrZh } of BOOK_NAMES) {
    if (t.startsWith(name)) {
      t = abbrZh + t.slice(name.length).replace(/^[\s.]+/, "");
      break;
    }
  }
  return t
    .replace(/節$/, "")
    .replace(/\s.*$/, "")
    .replace(/(\d)[上下ab](?=$|[-,，、;；])/g, "$1"); // half verses, e.g. 5:39上
}

function parseSingle(segment: string): VerseRange {
  const chapterOnly = segment.match(/^(\D+?)(\d+)$/);
  if (chapterOnly) {
    const [, abbrZh, ch] = chapterOnly;
    const chapter = parseInt(ch, 10);
    parseVerseRange(`${abbrZh}${chapter}:1`); // validates book + chapter
    return { abbrZh, chapterStart: chapter, verseStart: 1, chapterEnd: chapter };
  }
  return parseVerseRange(segment);
}

/**
 * Parse a legacy scripture reference, e.g.
 *   "太 8:1-4"       → [太8:1-4]
 *   "約1:1-5,9-14"   → [約1:1-5, 約1:9-14]
 *   "詩126"          → [詩126 (whole chapter)]
 *   "以弗所書2:1-10" → [弗2:1-10]
 */
export function parseLegacyVerseRanges(text: string): VerseRange[] {
  const normalized = normalizeReference(text);
  const segments = normalized.split(/\s*[,，、;；]\s*/).filter((s) => /\d/.test(s));
  const ranges: VerseRange[] = [];

  for (const raw of segments) {
    let segment = raw;
    const first = ranges[0];
    if (first && /^\d/.test(segment)) {
      segment = segment.includes(":")
        ? `${first.abbrZh}${segment}`
        : `${first.abbrZh}${ranges[ranges.length - 1].chapterEnd ?? ranges[ranges.length - 1].chapterStart}:${segment}`;
    }
    ranges.push(parseSingle(segment));
  }

  if (ranges.length === 0) {
    throw new Error(`No scripture reference found in "${text}"`);
  }
  return ranges;
}

/** Extract the reference in parentheses at the end of a memory verse paragraph. */
export function extractMemoryVerseReference(text: string): string | null {
  const matches = [...text.matchAll(/[（(]([^（()）]+)[）)]/g)];
  if (matches.length) return matches[matches.length - 1][1].trim();
  const unclosed = text.match(/[（(]([^（()）]+)$/);
  return unclosed ? unclosed[1].trim() : null;
}

export function findMonthlyLinks(html: string, baseUrl: string): LegacyMonthLink[] {
  const $ = load(html);
  const links = new Map<string, LegacyMonthLink>();
  $("a[href]").each((_, a) => {
    const label = cleanText($(a).text());
    const m = label.match(MONTH_LABEL_RE);
    if (!m) return;
    const month = `${m[1]}-${pad(m[2])}`;
    if (links.has(month)) return;
    links.set(month, {
      label: m[0],
      month,
      url: new URL($(a).attr("href")!, baseUrl).toString(),
    });
  });
  return [...links.values()].sort((a, b) => b.month.localeCompare(a.month));
}

function parseSection(
  $: ReturnType<typeof load>,
  section: Element,
  heading: string,
): LegacyArticle | null {
  const m = heading.match(DATE_HEADING_RE);
  if (!m) return null;

  const [, y, mo, d, rest] = m;
  const date = `${y}-${pad(mo)}-${pad(d)}`;
  const kind: LegacyArticleKind = rest.includes("鳥瞰") ? "overview" : "daily";
  const warnings: string[] = [];

  const paragraphs = $(section)
    .find("p")
    .toArray()
    .map((p) => cleanText($(p).text()));

  const parts: Record<Marker | "head", string[]> = {
    head: [],
    觀察與思想: [],
    今日靈修: [],
    本書大綱: [],
    背誦金句: [],
    回應與禱告: [],
  };
  let current: Marker | "head" = "head";
  for (const text of paragraphs) {
    if (!text) continue;
    const marker = matchMarker(text);
    if (marker) {
      current = marker.marker;
      if (marker.rest) parts[current].push(marker.rest);
      continue;
    }
    parts[current].push(text);
  }

  let verseRanges: VerseRange[] = [];
  let title = "";
  let devotional: string[];
  if (kind === "daily") {
    // head = [title, ...scripture text]; scripture text is re-fetched from the Bible API
    title = parts.head[0] ?? "";
    devotional = parts.今日靈修;
    try {
      verseRanges = parseLegacyVerseRanges(rest);
    } catch (e) {
      warnings.push(`經文範圍無法解析：「${rest}」（${(e as Error).message}）`);
    }
  } else {
    title = rest.trim();
    devotional = parts.head;
  }

  let memoryVerseRanges: VerseRange[] = [];
  const memoryText = parts.背誦金句.join("");
  if (memoryText) {
    const ref = extractMemoryVerseReference(memoryText);
    try {
      if (!ref) throw new Error("找不到括號內的經文出處");
      memoryVerseRanges = parseLegacyVerseRanges(ref);
    } catch (e) {
      warnings.push(`背誦金句無法解析：「${memoryText.slice(0, 40)}」（${(e as Error).message}）`);
    }
  }

  if (kind === "daily" && parts.觀察與思想.length === 0) {
    warnings.push("找不到「觀察與思想」");
  }

  const img = $(section).find("img").first();
  const imageUrl = img.attr("src") || img.attr("data-src") || null;

  return {
    date,
    kind,
    heading,
    title,
    verseRanges,
    questions: parts.觀察與思想,
    devotionalHtml: toHtml(devotional),
    outlineHtml: toHtml(parts.本書大綱),
    memoryVerseRanges,
    prayerHtml: toHtml(parts.回應與禱告),
    imageUrl,
    warnings,
  };
}

/** Parse every day section of a month page, newest first as on the site. */
export function parseMonthPage(html: string): LegacyArticle[] {
  const $ = load(html);
  const articles: LegacyArticle[] = [];
  const seen = new Set<string>();

  $("section").each((_, section) => {
    const heading = $(section)
      .find("h1,h2,h3")
      .toArray()
      .map((h) => cleanText($(h).text()))
      .find((t) => DATE_HEADING_RE.test(t));
    if (!heading) return;
    const article = parseSection($, section, heading);
    if (article && !seen.has(article.date)) {
      seen.add(article.date);
      articles.push(article);
    }
  });

  return articles;
}
