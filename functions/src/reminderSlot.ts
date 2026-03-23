// 東京タイムゾーンの「通知スロット（5分刻み）」と「日付キー」を作る
// Firestore の `notifyAt` は `HH:MM`（5分単位）で array-contains するので完全一致させる。
export function getTokyoReminderSlot(now: Date): { timeSlot: string; dateKey: string } {
  const dateKey = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';

  const hh = hour.padStart(2, '0');
  const rawMin = parseInt(minute, 10);
  const safeMin = Number.isFinite(rawMin) ? rawMin : 0;
  const mm = String(Math.floor(safeMin / 5) * 5).padStart(2, '0');

  return { timeSlot: `${hh}:${mm}`, dateKey };
}

