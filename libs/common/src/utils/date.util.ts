/**
 * Return current time in "yyyy-MM-dd HH:mm:ss" format (same as incoming Kafka payloads).
 * Use as fallback when timestamp is missing.
 */
export function timestampSameFormatFallback(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

/**
 * Normalize a timestamp string to ISO 8601 format for Elasticsearch and MongoDB.
 * Accepts: "yyyy-MM-dd HH:mm:ss", "yyyy-MM-ddTHH:mm:ss.sssZ", or epoch ms.
 * Returns ISO string (e.g. "2026-02-21T00:36:27.000Z") or empty string if invalid.
 */
export function toIsoTimestamp(value: string | number | undefined | null): string {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  if (!s) return '';

  // Already ISO-like (contains T or ends with Z)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) || s.endsWith('Z')) {
    try {
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? '' : d.toISOString();
    } catch {
      return '';
    }
  }

  // "yyyy-MM-dd HH:mm:ss" or "yyyy-MM-dd HH:mm:ss.SSS"
  const spaceMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/);
  if (spaceMatch) {
    const [, y, m, d, hh, mm, ss, ms = '0'] = spaceMatch;
    const msPadded = ms.slice(0, 3).padEnd(3, '0');
    const iso = `${y}-${m}-${d}T${hh}:${mm}:${ss}.${msPadded}Z`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }

  // Epoch milliseconds
  const num = Number(s);
  if (!Number.isNaN(num) && num > 0) {
    const d = new Date(num);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }

  try {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  } catch {
    return '';
  }
}
