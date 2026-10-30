import {
  bookInTitle,
  formatOutlineRange,
  htmlToLines,
  outlineToHtml,
  parseOutlineLines,
  parseOutlineRange,
  sectionNumber,
} from "./outline";

// As written on the old site (2026/5/18 馬太福音鳥瞰)
const MATTHEW = [
  "一、 引言：君王的宣告與預備 (1:1 - 4:11)",
  "1:1 - 2:23 ｜ 耶穌基督的家譜、降生與童年（顯明其君王身分）",
  "3:1 - 4:11 ｜ 先鋒施洗約翰的預備、耶穌受洗與曠野受試探",
  "二、 加利利的事工與天國的宣導 (4:12 - 13:52)",
  "4:12 - 4:25 ｜ 耶穌在加利利開始傳道、呼召門徒",
  "四、耶路撒冷旅程與君王的審判 (19:1 - 25:46)",
  "19:1 - 20:34 ｜ 走向耶路撒冷的旅程（教導婚姻、財富與服事）",
];

describe("outline", () => {
  it("reads ranges in the forms the site uses", () => {
    expect(parseOutlineRange("1:1 - 4:11")?.range).toEqual({ chapterStart: 1, verseStart: 1, chapterEnd: 4, verseEnd: 11 });
    expect(parseOutlineRange("4:12-25 ｜ x")?.range).toEqual({ chapterStart: 4, verseStart: 12, chapterEnd: 4, verseEnd: 25 });
    expect(parseOutlineRange("5:1")?.range).toEqual({ chapterStart: 5, verseStart: 1, chapterEnd: 5, verseEnd: 1 });
    expect(parseOutlineRange("引言")).toBeNull();
  });

  it("formats ranges compactly", () => {
    expect(formatOutlineRange({ chapterStart: 1, verseStart: 1, chapterEnd: 4, verseEnd: 11 })).toBe("1:1 - 4:11");
    expect(formatOutlineRange({ chapterStart: 4, verseStart: 12, chapterEnd: 4, verseEnd: 25 })).toBe("4:12 - 25");
    expect(formatOutlineRange({ chapterStart: 5, verseStart: 1, chapterEnd: 5, verseEnd: 1 })).toBe("5:1");
  });

  it("turns the old site's outline into sections and items", () => {
    const outline = parseOutlineLines(MATTHEW, "太")!;

    expect(outline.book).toBe("太");
    expect(outline.sections.map((s) => s.title)).toEqual([
      "引言：君王的宣告與預備",
      "加利利的事工與天國的宣導",
      "耶路撒冷旅程與君王的審判",
    ]);
    expect(outline.sections[0].range).toEqual({ chapterStart: 1, verseStart: 1, chapterEnd: 4, verseEnd: 11 });
    expect(outline.sections[0].items).toEqual([
      {
        range: { chapterStart: 1, verseStart: 1, chapterEnd: 2, verseEnd: 23 },
        text: "耶穌基督的家譜、降生與童年（顯明其君王身分）",
      },
      {
        range: { chapterStart: 3, verseStart: 1, chapterEnd: 4, verseEnd: 11 },
        text: "先鋒施洗約翰的預備、耶穌受洗與曠野受試探",
      },
    ]);
  });

  it("keeps items that come before any heading", () => {
    const outline = parseOutlineLines(["1:1 - 2:3 ｜ 起初"])!;
    expect(outline.sections).toEqual([{ title: "", range: null, items: [{ range: expect.any(Object), text: "起初" }] }]);
  });

  it("does not take ordinary prose for an outline", () => {
    expect(parseOutlineLines(["本書共分為三大段落。", "作者是保羅。"])).toBeNull();
  });

  it("finds the book a title is about", () => {
    expect(bookInTitle("馬太福音鳥瞰")).toBe("太");
    expect(bookInTitle("約翰一書鳥瞰")).toBe("約一");
    expect(bookInTitle("書卷鳥瞰")).toBe("");
  });

  it("reads lines from rich text and writes them back", () => {
    const lines = htmlToLines("<p>一、 引言 (1:1 - 4:11)</p><ul><li><p>1:1 - 2:23 ｜ 家譜&amp;降生</p></li></ul>");
    expect(lines).toEqual(["一、 引言 (1:1 - 4:11)", "1:1 - 2:23 ｜ 家譜&降生"]);
    const html = outlineToHtml(parseOutlineLines(lines, "太")!);
    expect(html).toBe("<p>一、 引言 (1:1 - 4:11)</p><ul><li>1:1 - 2:23 ｜ 家譜&amp;降生</li></ul>");
  });

  it("numbers sections in Chinese", () => {
    expect([0, 9, 10, 19, 20].map(sectionNumber)).toEqual(["一", "十", "十一", "二十", "二十一"]);
  });
});
