import { getTokyoReminderSlot } from '../reminderSlot';

describe('getTokyoReminderSlot', () => {
  it('creates timeSlot using Asia/Tokyo hour/minute parts', () => {
    // 2026-03-19 14:10 UTC = 23:10 JST
    const d = new Date('2026-03-19T14:10:00.000Z');
    expect(getTokyoReminderSlot(d)).toEqual({
      dateKey: '2026-03-19',
      timeSlot: '23:10',
    });
  });

  it('floors minutes to 5-minute bucket', () => {
    // 23:07 JST => 23:05
    const d = new Date('2026-03-19T14:07:00.000Z');
    expect(getTokyoReminderSlot(d).timeSlot).toBe('23:05');
  });

  it('hour/minuteパーツが見つからない場合のフォールバック', () => {
    const mockFormat = {
      formatToParts: () => [{ type: 'literal', value: ':' }],
    };
    jest.spyOn(Intl, 'DateTimeFormat').mockReturnValue(mockFormat as any);

    const result = getTokyoReminderSlot(new Date());
    expect(result.timeSlot).toBe('00:00');

    jest.restoreAllMocks();
  });

  it('minute値がパース不能な場合のフォールバック', () => {
    const mockFormat = {
      formatToParts: () => [
        { type: 'hour', value: '09' },
        { type: 'minute', value: 'xx' },
      ],
    };
    jest.spyOn(Intl, 'DateTimeFormat').mockReturnValue(mockFormat as any);

    const result = getTokyoReminderSlot(new Date());
    // parseInt('xx') = NaN → safeMin = 0
    expect(result.timeSlot).toBe('09:00');

    jest.restoreAllMocks();
  });

  it('日付変更（UTC 15:00 = JST 翌日 00:00）を正しく処理する', () => {
    const d = new Date('2026-03-19T15:00:00.000Z');
    const result = getTokyoReminderSlot(d);
    expect(result.timeSlot).toBe('00:00');
    expect(result.dateKey).toBe('2026-03-20');
  });
});

