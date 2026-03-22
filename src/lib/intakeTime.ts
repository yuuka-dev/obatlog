// Firestore / API 経由で takenAt の形が揃わないため、表示用に ms に正規化
export function takenAtToMs(taken: unknown): number | null {
  if (taken == null) return null;
  if (typeof taken === 'number' && Number.isFinite(taken)) {
    return taken > 1e12 ? taken : taken * 1000;
  }
  if (typeof taken === 'string') {
    const d = new Date(taken);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  if (typeof taken === 'object' && taken !== null) {
    const o = taken as Record<string, unknown>;
    let sec: number | undefined;
    if (typeof o.seconds === 'number') sec = o.seconds;
    else if (typeof o._seconds === 'number') sec = o._seconds;
    else if (typeof o.seconds === 'string') sec = parseInt(String(o.seconds), 10);
    else if (typeof o._seconds === 'string') sec = parseInt(String(o._seconds), 10);
    if (sec != null && Number.isFinite(sec)) return sec * 1000;
  }
  return null;
}

export function formatTakenAtTime(
  taken: unknown,
  options: { locale: string; timeZone: string }
): string {
  const ms = takenAtToMs(taken);
  if (ms == null) return '—';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(options.locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: options.timeZone,
  });
}
