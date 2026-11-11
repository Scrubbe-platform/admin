/**
 * Reading time is derived, never typed by the author. The stored field is
 * `wordCount`; the "4 min read" string the public card wants is produced here
 * so it can never drift from an edited body.
 */
const WORDS_PER_MINUTE = 225;

export function countWords(markdown: string): number {
  const prose = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~\-|]/g, " ");
  const words = prose.split(/\s+/).filter((word) => word.length > 0);
  return words.length;
}

export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

export function readingTimeLabel(wordCount: number): string {
  return `${readingMinutes(wordCount)} min read`;
}
