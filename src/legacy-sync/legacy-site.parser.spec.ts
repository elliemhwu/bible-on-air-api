import {
  extractMemoryVerseReference,
  findMonthlyLinks,
  parseLegacyVerseRanges,
  parseMonthPage,
} from "./legacy-site.parser";

const section = (img: string, heading: string, tag: string, paragraphs: string[]) =>
  `<section><img src="${img}"><${tag}>${heading}</${tag}>${paragraphs
    .map((p) => `<p>${p}</p>`)
    .join("")}</section>`;

const MONTH_HTML = `<html><body>
<section><img src="logo.png"></section>
${section("https://img/1031", "2026/10/31 帖前5:1-11", "h2", [
  "我們是光明之子",
  "弟兄們，論到時候、日期，不用寫信給你們；",
  "#觀察與思想",
  "主的日子來到好像什麼一樣？（2節）",
  "保羅如何稱呼我們？（5節）",
  "#今日靈修",
  "　保羅在本段提到主的日子。",
  "第二段 <b>粗體</b>",
  "#背誦金句",
  "所以，你們該彼此勸慰，互相建立。（帖前5:11）",
  "#回應與禱告",
  "求主幫助我。",
])}
${section("https://img/0805", "2026/8/5   太13:24-33", "h1", [
  "微小而持續的影響力",
  "觀察與思想",
  "耶穌如何用稗子比喻天國？",
  "#今日靈修",
  "耶穌解釋完撒種的比喻後。",
  "",
  "#背誦金句   這原是百種裡最小的。(太13:32)",
  "#回應與禱告",
  "親愛的恩主。",
])}
${section("https://img/0406", "2026/4/6 以弗所書鳥瞰", "h1", [
  "《以弗所書》傳統上認為是監獄書信。",
  "#本書大綱",
  "一、在基督裡的救恩與教會(1:1-3:21)",
  "#背誦金句",
  "要照所安排的。(弗1:10)",
  "#回應與禱告",
  "求主使我。",
])}
</body></html>`;

describe("parseLegacyVerseRanges", () => {
  it.each([
    ["帖前5:1-11", [{ abbrZh: "帖前", chapterStart: 5, verseStart: 1, verseEnd: 11 }]],
    ["太 8:1-4", [{ abbrZh: "太", chapterStart: 8, verseStart: 1, verseEnd: 4 }]],
    ["以弗所書 2：1-10", [{ abbrZh: "弗", chapterStart: 2, verseStart: 1, verseEnd: 10 }]],
    ["約壹1:5-10", [{ abbrZh: "約一", chapterStart: 1, verseStart: 5, verseEnd: 10 }]],
    ["太 5:39上", [{ abbrZh: "太", chapterStart: 5, verseStart: 39 }]],
    ["詩126", [{ abbrZh: "詩", chapterStart: 126, verseStart: 1, chapterEnd: 126 }]],
    [
      "約1:1-5,9-14",
      [
        { abbrZh: "約", chapterStart: 1, verseStart: 1, verseEnd: 5 },
        { abbrZh: "約", chapterStart: 1, verseStart: 9, verseEnd: 14 },
      ],
    ],
    [
      "路23:26-24:2",
      [{ abbrZh: "路", chapterStart: 23, verseStart: 26, chapterEnd: 24, verseEnd: 2 }],
    ],
  ])("parses %s", (input, expected) => {
    expect(parseLegacyVerseRanges(input)).toEqual(expected);
  });

  it("throws on unknown books", () => {
    expect(() => parseLegacyVerseRanges("提6:17")).toThrow();
  });
});

describe("extractMemoryVerseReference", () => {
  it("takes the last parenthesised reference", () => {
    expect(extractMemoryVerseReference("又要（像這樣）改換一新。（弗4:23-24）")).toBe("弗4:23-24");
  });

  it("accepts an unclosed parenthesis", () => {
    expect(extractMemoryVerseReference("要叫你施捨的事行在暗中。(太 6:3-4")).toBe("太 6:3-4");
  });
});

describe("parseMonthPage", () => {
  const articles = parseMonthPage(MONTH_HTML);

  it("finds one article per day section, h1 or h2", () => {
    expect(articles.map((a) => a.date)).toEqual(["2026-10-31", "2026-08-05", "2026-04-06"]);
  });

  it("parses a daily devotional", () => {
    const a = articles[0];
    expect(a).toMatchObject({
      kind: "daily",
      title: "我們是光明之子",
      verseRanges: [{ abbrZh: "帖前", chapterStart: 5, verseStart: 1, verseEnd: 11 }],
      questions: ["主的日子來到好像什麼一樣？（2節）", "保羅如何稱呼我們？（5節）"],
      devotionalHtml: "<p>保羅在本段提到主的日子。</p><p>第二段 粗體</p>",
      memoryVerseRanges: [{ abbrZh: "帖前", chapterStart: 5, verseStart: 11 }],
      prayerHtml: "<p>求主幫助我。</p>",
      imageUrl: "https://img/1031",
      warnings: [],
    });
  });

  it("accepts markers without # and memory verses on the marker line", () => {
    const a = articles[1];
    expect(a.questions).toEqual(["耶穌如何用稗子比喻天國？"]);
    expect(a.memoryVerseRanges).toEqual([{ abbrZh: "太", chapterStart: 13, verseStart: 32 }]);
    expect(a.warnings).toEqual([]);
  });

  it("parses a book overview", () => {
    const a = articles[2];
    expect(a).toMatchObject({
      kind: "overview",
      title: "以弗所書鳥瞰",
      verseRanges: [],
      devotionalHtml: "<p>《以弗所書》傳統上認為是監獄書信。</p>",
      outlineHtml: "<p>一、在基督裡的救恩與教會(1:1-3:21)</p>",
      memoryVerseRanges: [{ abbrZh: "弗", chapterStart: 1, verseStart: 10 }],
    });
  });
});

describe("findMonthlyLinks", () => {
  it("dedupes month links and sorts newest first", () => {
    const html = `
      <a href="/view/bibleonair/靈修內容/2026年9月靈修內容">2026年9月</a>
      <a href="/view/bibleonair/靈修內容/2026年10月靈修內容">2026年10月</a>
      <a href="/view/bibleonair/靈修內容/2026年10月靈修內容">2026年10月</a>
      <a href="/view/bibleonair/about">關於</a>`;
    const links = findMonthlyLinks(html, "https://sites.google.com/view/bibleonair");
    expect(links.map((l) => l.month)).toEqual(["2026-10", "2026-09"]);
    expect(links[0].url).toContain("https://sites.google.com/view/bibleonair/");
  });
});
