import Tesseract from 'tesseract.js';

/**
 * Extract player names from a Sportadmin "Kallelsesvar" screenshot.
 *
 * Each row looks like: [XX] Firstname Lastname  [optional: Ledare]
 * where XX = 2-letter initials in a circle (OCR reads them as prefix on the line).
 */
export async function extractNamesFromImage(
  file: File,
  onProgress?: (pct: number) => void
): Promise<string[]> {
  const result = await Tesseract.recognize(file, 'swe+eng', {
    logger: m => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const rawLines = result.data.text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 1);

  const names: string[] = [];
  let inKommer = false;

  const excludeRoles = /\b(Ledare|Tränare|Coach|Assistent|Manager|Domare)\b/i;
  const sectionKommer = /Kommer\s*[•●©e]?$/i;
  const sectionStop = /Kommer ej|Ej svarat/i;
  // Initials prefix: 2 uppercase letters at start (e.g. "AK Arvid Kjellén")
  const initialsPrefix = /^[A-ZÅÄÖ]{2}\s+/;
  // Name: 2+ capitalized words
  const namePattern = /^[A-ZÅÄÖ][a-zåäöé][-a-zåäöé]*([\s-][A-ZÅÄÖ][-a-zåäöé]+)+$/;

  for (const rawLine of rawLines) {
    // Detect section headers
    if (sectionKommer.test(rawLine) && !sectionStop.test(rawLine)) { inKommer = true; continue; }
    if (sectionStop.test(rawLine)) { inKommer = false; continue; }
    if (!inKommer) continue;

    // Skip lines that contain a role label (the whole row is staff, not player)
    if (excludeRoles.test(rawLine)) continue;
    // Strip leading 2-letter initials (e.g. "AK ")
    let line = rawLine.replace(initialsPrefix, '').trim();
    // Skip short/empty
    if (line.length < 4) continue;
    // Skip if starts with digit or is a stats line
    if (/^\d/.test(line)) continue;

    if (namePattern.test(line) && line.length <= 50) {
      names.push(line);
    }
  }

  // Fallback: if section detection failed, grab any line matching name pattern
  if (names.length === 0) {
    for (const rawLine of rawLines) {
      let line = rawLine.replace(excludeRoles, '').trim();
      line = line.replace(initialsPrefix, '').trim();
      if (
        namePattern.test(line) &&
        line.length >= 5 && line.length <= 50 &&
        !/^(Kommer|Kallelsesvar|Ej svarat)/i.test(line)
      ) {
        names.push(line);
      }
    }
  }

  return [...new Set(names)];
}
