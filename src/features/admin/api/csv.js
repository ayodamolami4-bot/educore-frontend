/**
 * CSV helpers for the exports the admin screens offer (AD02 / AD33).
 *
 * shareOrCopyCsv() always leaves the admin holding the file contents: on
 * phones it opens the native share sheet; on web (react-native-web has no
 * share sheet) it copies to the clipboard instead. Both paths return the
 * short user-facing notice the screen shows afterwards.
 *
 * toCsv() and parseCsv() are PURE (no React Native), so they can be imported
 * in node tests and by presenters without pulling in the native Share/Platform
 * modules. shareOrCopyCsv() does the native call, and uses a LAZY require of
 * react-native at call time so importing this module in node (for the pure
 * helpers) never trips the native bundler.
 */
function csvField(value) {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** rows: array of objects; columns: [{ key, header }] → CSV text. */
export function toCsv(rows, columns) {
  const head = columns.map((c) => csvField(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => csvField(row[c.key])).join(','));
  return [head, ...body].join('\n');
}

/**
 * Parse pasted CSV into row objects. Handles quoted fields (addresses and
 * names contain commas) and returns plain arrays so the caller can validate.
 */
export function parseCsv(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line) => {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  });
}

export async function shareOrCopyCsv(fileName, csv) {
  // Lazy import so the pure helpers above stay importable in node tests.
  const { Share, Platform } = await import('react-native');
  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(csv);
      return 'Copied the CSV to the clipboard — paste it into a .csv file.';
    } catch {
      return 'The browser blocked the clipboard — use the mobile app to export.';
    }
  }
  try {
    const result = await Share.share({ title: fileName, message: csv });
    if (result.action === Share.dismissedAction) return 'Export cancelled.';
    return 'Export ready — choose where to send the CSV.';
  } catch {
    return 'The share sheet did not open — nothing was exported.';
  }
}
