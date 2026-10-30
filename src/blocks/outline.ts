import { BIBLE_BOOKS } from "../bible/bible-books.constant";
import { OutlineBlockContent, OutlineRange, OutlineSection } from "./block-content.types";

const DASH = "[-–—~－～]";
/** "1:1 - 4:11", "13:53 - 17:27", "4:12-25" or a single "5:1" */
const RANGE_RE = new RegExp(`^(\\d+):(\\d+)(?:\\s*${DASH}\\s*(?:(\\d+):)?(\\d+))?`);
const NUMBERING_RE = /^[一二三四五六七八九十百]+\s*[、.．]\s*/;
/** Separator between an item's range and its description */
const SEPARATOR_RE = /^\s*[｜|：:、]?\s*/;

/** Reads a range at the start of `text`; returns it with the rest of the text */
export function parseOutlineRange(text: string): { range: OutlineRange; rest: string } | null {
  const m = text.trim().match(RANGE_RE);
  if (!m) return null;
  const chapterStart = Number(m[1]);
  const verseStart = Number(m[2]);
  const range: OutlineRange = {
    chapterStart,
    verseStart,
    chapterEnd: m[3] ? Number(m[3]) : chapterStart,
    verseEnd: m[4] ? Number(m[4]) : verseStart,
  };
  return { range, rest: text.trim().slice(m[0].length) };
}

/** "1:1 - 4:11", "4:12 - 25", or "5:1" */
export function formatOutlineRange(r: OutlineRange): string {
  if (r.chapterStart === r.chapterEnd && r.verseStart === r.verseEnd) return `${r.chapterStart}:${r.verseStart}`;
  const end = r.chapterStart === r.chapterEnd ? `${r.verseEnd}` : `${r.chapterEnd}:${r.verseEnd}`;
  return `${r.chapterStart}:${r.verseStart} - ${end}`;
}

/** The book a title like "馬太福音鳥瞰" is about (longest name wins: 約翰一書 over 約翰福音…) */
export function bookInTitle(title: string): string {
  const match = [...BIBLE_BOOKS]
    .sort((a, b) => b.zh.length - a.zh.length)
    .find((b) => title.includes(b.zh));
  return match?.abbrZh ?? "";
}

/**
 * Turns outline lines as they were written on the old site into structure:
 *
 *   一、 引言：君王的宣告與預備 (1:1 - 4:11)     → section
 *   1:1 - 2:23 ｜ 耶穌基督的家譜、降生與童年     → item of that section
 *
 * Returns null when no line looks like part of an outline.
 */
export function parseOutlineLines(lines: string[], book = ""): OutlineBlockContent | null {
  const sections: OutlineSection[] = [];
  let found = false;
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const item = parseOutlineRange(line);
    if (item) {
      if (sections.length === 0) sections.push({ title: "", range: null, items: [] });
      sections[sections.length - 1].items.push({ range: item.range, text: item.rest.replace(SEPARATOR_RE, "").trim() });
      found = true;
      continue;
    }
    // A section heading, optionally numbered and ending in its range in parentheses
    let title = line.replace(NUMBERING_RE, "");
    let range: OutlineRange | null = null;
    const paren = title.match(/[（(]\s*([^（()）]+?)\s*[）)]\s*$/);
    const parsed = paren && parseOutlineRange(paren[1]);
    if (parsed && !parsed.rest.trim()) {
      range = parsed.range;
      title = title.slice(0, paren!.index).trim();
    }
    found ||= NUMBERING_RE.test(line) || range !== null;
    sections.push({ title, range, items: [] });
  }
  return found ? { book, sections } : null;
}

/** Plain-text lines of simple HTML (paragraphs, list items, line breaks) */
export function htmlToLines(html: string): string[] {
  return html
    .replace(/<\/(p|li|h[1-6]|div)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

/** Section numbers as on the old site: 一、二、… 十、十一、… */
export function sectionNumber(i: number): string {
  const n = i + 1;
  if (n <= 10) return NUMERALS[n - 1];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${tens > 1 ? NUMERALS[tens - 1] : ""}十${ones ? NUMERALS[ones - 1] : ""}`;
}

/** The outline as simple HTML, used when converting back to a rich-text block */
export function outlineToHtml(outline: OutlineBlockContent): string {
  return outline.sections
    .map((s, i) => {
      const head = `${sectionNumber(i)}、 ${s.title}${s.range ? ` (${formatOutlineRange(s.range)})` : ""}`;
      const items = s.items
        .map((it) => `<li>${escapeHtml(it.range ? `${formatOutlineRange(it.range)} ｜ ${it.text}` : it.text)}</li>`)
        .join("");
      return `<p>${escapeHtml(head)}</p>${items ? `<ul>${items}</ul>` : ""}`;
    })
    .join("");
}
