import Tesseract from 'tesseract.js';

/**
 * Extract player names from a Sportadmin screenshot.
 * Returns a list of candidate names (first + last name pairs).
 */
export async function extractNamesFromImage(
  file: File,
  onProgress?: (pct: number) => void
): Promise<string[]> {
  const result = await Tesseract.recognize(file, 'swe', {
    logger: m => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const lines = result.data.text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 3);

  // Heuristic: a player name line typically has 2 words, starts with uppercase,
  // no digits, not too long
  const namePattern = /^[A-ZÅÄÖÉ][a-zåäöé]+([-\s][A-ZÅÄÖÉ][a-zåäöé]+)+$/;
  const names = lines.filter(l => {
    const words = l.split(/\s+/);
    return words.length >= 2 && words.length <= 4 && namePattern.test(l) && l.length < 40;
  });

  // Deduplicate
  return [...new Set(names)];
}
