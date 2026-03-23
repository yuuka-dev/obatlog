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
});

