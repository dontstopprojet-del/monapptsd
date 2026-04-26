export function safeNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function safeText(value: unknown, fallback = 'N/A'): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

export function safeLocale(value: unknown): string {
  return safeNumber(value).toLocaleString();
}

export function safeFixed(value: unknown, digits = 2, fallback = '0'): string {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : fallback;
}

export function safeCoord(row: Record<string, unknown>): { lat: number; lng: number } | null {
  const lat = Number(row.lat ?? row.latitude ?? NaN);
  const lng = Number(row.lng ?? row.longitude ?? NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function safeDate(value: unknown, lang = 'fr'): string {
  if (!value) return 'N/A';
  try {
    const d = new Date(String(value));
    if (isNaN(d.getTime())) return 'N/A';
    return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return 'N/A';
  }
}
