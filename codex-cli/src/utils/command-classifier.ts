export type ReadFileSummary = {
  file: string;
  start?: number;
  end?: number | "$";
  full: boolean;
};

/**
 * Extract summaries of read_file intents from a shell command string.
 * Supports:
 *  - sed -n 'a,bp' <file>
 *  - sed -n "a,bp" <file>
 *  - nl -ba <file> | sed -n 'a,bp'
 */
export function extractReadFileSummaries(cmd: string): Array<ReadFileSummary> {
  const results: Array<ReadFileSummary> = [];

  // Split into segments on typical command separators. Keep it simple.
  const segments = cmd.split(/(?:(?:;)|(?:&&)|(?:\|\|))/g);

  for (const raw of segments) {
    const s = raw.trim();
    if (!s) continue;

    // Pattern 1: sed -n 'a,bp' file
    const sedFileRe = /\bsed\s+-n\s+(["']?)(\d+),(\d+|\$)p\1\s+([^\s;&|]+)/;
    const m1 = s.match(sedFileRe);
    if (m1) {
      const start = Number(m1[2]);
      const endRaw = m1[3];
      const file = stripQuotes(m1[4]);
      results.push({ file, start, end: endRaw === "$" ? "$" : Number(endRaw), full: endRaw === "$" });
      continue;
    }

    // Pattern 2: nl -ba <file> | sed -n 'a,bp'
    const nlSedRe = /\bnl\b[^|]*?\s([^\s;&|]+)\s*\|\s*sed\s+-n\s+(["']?)(\d+),(\d+|\$)p\2/;
    const m2 = s.match(nlSedRe);
    if (m2) {
      const file = stripQuotes(m2[1]);
      const start = Number(m2[3]);
      const endRaw = m2[4];
      results.push({ file, start, end: endRaw === "$" ? "$" : Number(endRaw), full: endRaw === "$" });
      continue;
    }
  }

  return results;
}

export function formatReadLabel(r: ReadFileSummary): { name: string; lines?: number; full: boolean } {
  const name = r.file;
  if (r.full) return { name, full: true };
  if (typeof r.start === "number" && typeof r.end === "number") {
    const lines = r.end - r.start + 1;
    if (Number.isFinite(lines) && lines > 0) {
      return { name, lines, full: false };
    }
  }
  return { name, full: false };
}

function stripQuotes(s: string): string {
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  return s;
} 
