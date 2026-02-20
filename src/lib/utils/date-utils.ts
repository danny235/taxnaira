import { parse, isValid, parseISO } from "date-fns";

const COMMON_FORMATS = [
  "dd/MM/yyyy",
  "dd-MM-yyyy",
  "dd.MM.yyyy",
  "dd MMM yyyy",
  "dd-MMM-yyyy",
  "d/M/yyyy",
  "d-M-yyyy",
  "d.M.yyyy",
  "dd/MM/yy",
  "dd-MM-yy",
  "dd.MM.yy",
  "MMM dd, yyyy",
  "yyyy-MM-dd",
];

const YEARLESS_FORMATS = [
  "dd/MM",
  "dd-MM",
  "dd.MM",
  "dd MMM",
  "dd-MMM",
  "d/M",
  "d.M",
  "MMM dd",
];

/**
 * Robustly parses a date string from various common bank statement formats.
 * Standardizes result to ISO string.
 * @param contextYear Fallback year if none found in string
 */
export function robustParseDate(
  dateStr: string | null | undefined,
  contextYear?: number,
): string {
  if (!dateStr) return new Date().toISOString();

  const trimmed = dateStr.trim();
  const baseDate = contextYear ? new Date(contextYear, 0, 1) : new Date();

  // 1. Try ISO first
  try {
    const isoDate = parseISO(trimmed);
    if (isValid(isoDate) && isoDate.getFullYear() > 1990)
      return isoDate.toISOString();
  } catch {}

  // 2. Normalize common variations
  let normalized = trimmed.replace(/\s+/g, " ");

  // Remove time if present (e.g. "07/01/26 00:22:59" -> "07/01/26")
  // We look for a space followed by something that looks like HH:mm
  normalized = normalized.replace(/\s+\d{1,2}:\d{2}(:\d{2})?.*$/, "");

  normalized = normalized.replace(
    /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/gi,
    (match) => {
      return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
    },
  );

  // Check if year is likely missing (e.g. "12/03", "12-Mar", but not "12/03/24")
  const lacksYear =
    !/(\d{2,4})$/.test(normalized) || normalized.split(/[-/ .]/).length < 3;

  // 3. Try format-specific parsing (with year)
  for (const formatStr of COMMON_FORMATS) {
    try {
      const parsedDate = parse(normalized, formatStr, baseDate);
      if (
        isValid(parsedDate) &&
        parsedDate.getFullYear() > 1990 &&
        parsedDate.getFullYear() < 2100
      ) {
        return parsedDate.toISOString();
      }
    } catch (e) {}
  }

  // 4. Try format-specific parsing (without year)
  for (const formatStr of YEARLESS_FORMATS) {
    try {
      const parsedDate = parse(normalized, formatStr, baseDate);
      if (isValid(parsedDate)) {
        // parse with baseDate will use baseDate's year (contextYear)
        return parsedDate.toISOString();
      }
    } catch (e) {}
  }

  // 5. Fallback to native Date as a last resort
  try {
    const nativeDate = new Date(trimmed);
    if (isValid(nativeDate) && nativeDate.getFullYear() > 1990) {
      return nativeDate.toISOString();
    }
  } catch {}

  // 5. Hard fallback
  console.warn(
    `⚠️ Failed to parse date string: "${dateStr}". Falling back to current date.`,
  );
  return new Date().toISOString();
}
