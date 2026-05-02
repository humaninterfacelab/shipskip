export const MAX_OUTPUT_LENGTH = 1_000_000;
export const MAX_READ_FILE_BYTES = 2_000_000;
export const DEFAULT_TIMEOUT_MS = 10_000;

export function looksBinary(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));

  if (sample.includes(0)) {
    return true;
  }

  const text = sample.toString("utf8");
  const replacementChars = text.match(/\uFFFD/g)?.length ?? 0;

  return replacementChars > Math.max(8, text.length * 0.05);
}

export function truncateText(text: string, maxLength = MAX_OUTPUT_LENGTH) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}\n\n[Output truncated for length]`;
}

export function addLineNumbers(text: string, firstLineNumber: number): string {
  const lines = text.split("\n");
  const lastLineNumber = firstLineNumber + lines.length - 1;
  const width = String(lastLineNumber).length;

  return lines
    .map((line, index) => {
      const lineNumber = String(firstLineNumber + index).padStart(width, " ");
      return `${lineNumber} | ${line}`;
    })
    .join("\n");
}

export function countOccurrences(text: string, search: string): number {
  let count = 0;
  let index = 0;

  while (true) {
    const found = text.indexOf(search, index);

    if (found === -1) {
      return count;
    }

    count += 1;
    index = found + search.length;
  }
}

export function replaceFirst(
  text: string,
  oldText: string,
  newText: string,
): string {
  const index = text.indexOf(oldText);

  if (index === -1) {
    return text;
  }

  return text.slice(0, index) + newText + text.slice(index + oldText.length);
}

