import { describe, expect, test } from "bun:test";

import {
  addLineNumbers,
  countOccurrences,
  looksBinary,
  replaceFirst,
  truncateText,
} from "./utils";

describe("looksBinary", () => {
  test("identifies null bytes as binary content", () => {
    expect(looksBinary(Buffer.from([65, 0, 66]))).toBe(true);
  });

  test("does not flag normal utf8 text as binary", () => {
    expect(looksBinary(Buffer.from("hello\nworld", "utf8"))).toBe(false);
  });
});

describe("truncateText", () => {
  test("returns short text unchanged", () => {
    expect(truncateText("hello", 10)).toBe("hello");
  });

  test("adds a truncation marker when text exceeds the limit", () => {
    expect(truncateText("hello world", 5)).toBe(
      "hello\n\n[Output truncated for length]",
    );
  });
});

describe("addLineNumbers", () => {
  test("prefixes each line with aligned line numbers", () => {
    expect(addLineNumbers("alpha\nbeta", 9)).toBe(" 9 | alpha\n10 | beta");
  });
});

describe("countOccurrences", () => {
  test("counts non-overlapping occurrences", () => {
    expect(countOccurrences("aaaa", "aa")).toBe(2);
  });

  test("returns zero when the search text is absent", () => {
    expect(countOccurrences("abc", "z")).toBe(0);
  });
});

describe("replaceFirst", () => {
  test("replaces only the first matching occurrence", () => {
    expect(replaceFirst("one two one", "one", "three")).toBe("three two one");
  });

  test("returns the original text when no match exists", () => {
    expect(replaceFirst("one two", "three", "four")).toBe("one two");
  });
});
