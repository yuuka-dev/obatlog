// notify（sendMedicationReminders）のテスト
export {};

// onSchedule をモックしてハンドラー関数を直接取得
jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: jest.fn((_config: any, handler: any) => handler),
}));

jest.mock('../reminderSlot', () => ({
  getTokyoReminderSlot: jest.fn().mockReturnValue({ timeSlot: '08:00', dateKey: '2026-03-25' }),
}));

jest.mock('../mailSender', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../mailTemplate', () => ({
  buildReminderHtml: jest.fn().mockReturnValue('<html>reminder</html>'),
}));

jest.mock('firebase-admin', () => {
  const medsQueryGet = jest.fn();
  const userDocGet = jest.fn();
  const counterDocGet = jest.fn();
  const authGetUser = jest.fn();
  const messagingSend = jest.fn();

  const mod = {
    initializeApp: jest.fn(),
    apps: [],
    firestore: jest.fn(() => ({
      collection: jest.fn().mockImplementation((name: string) => {
        if (name === 'medications') {
          return { where: jest.fn().mockReturnThis(), get: medsQueryGet };
        }
        if (name === 'users') {
          return { doc: jest.fn().mockReturnValue({ get: userDocGet }) };
        }
        if (name === 'dailyCounts') {
          return { doc: jest.fn().mockReturnValue({ get: counterDocGet }) };
        }
        return {};
      }),
    })),
    auth: jest.fn(() => ({ getUser: authGetUser })),
    messaging: jest.fn(() => ({ send: messagingSend })),
  };
  (mod as any).__test__ = { medsQueryGet, userDocGet, counterDocGet, authGetUser, messagingSend };
  return mod;
});

import * as admin from 'firebase-admin';
import { sendMedicationReminders } from '../notify';

const { medsQueryGet, userDocGet, counterDocGet, authGetUser, messagingSend } = (admin as any).__test__;
const { sendEmail: mockSendEmail } = require('../mailSender');
const handler = sendMedicationReminders as unknown as () => Promise<void>;

beforeAll(() => {
  jest.spyOn(console, 'info').mockImplementation();
  jest.spyOn(console, 'warn').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
});
afterAll(() => jest.restoreAllMocks());

beforeEach(() => {
  jest.clearAllMocks();
  medsQueryGet.mockResolvedValue({ empty: true, size: 0, docs: [] });
});

describe('sendMedicationReminders', () => {
  it('対象の薬がない場合は何もしない', async () => {
    await handler();
    expect(userDocGet).not.toHaveBeenCalled();
    expect(messagingSend).not.toHaveBeenCalled();
  });

  it('プッシュ通知を送信する', async () => {
    medsQueryGet.mockResolvedValue({
      empty: false,
      size: 1,
      docs: [{ id: 'med-1', data: () => ({ userId: 'u1', name: 'テスト薬', limitPerDay: 3 }) }],
    });
    userDocGet.mockResolvedValue({
      data: () => ({ notifyMethod: 'push', notificationToken: 'fcm-token' }),
    });
    counterDocGet.mockResolvedValue({ exists: false });
    messagingSend.mockResolvedValue('msg-id');

    await handler();

    expect(messagingSend).toHaveBeenCalledWith(expect.objectContaining({
      token: 'fcm-token',
      notification: { title: 'ObatLog', body: 'テスト薬 の時間だよ' },
    }));
  });

  it('notifyMethod 未設定はプッシュ通知として扱う', async () => {
    medsQueryGet.mockResolvedValue({
      empty: false, size: 1,
      docs: [{ id: 'med-1', data: () => ({ userId: 'u1', name: '薬A', limitPerDay: 3 }) }],
    });
    userDocGet.mockResolvedValue({
      data: () => ({ notificationToken: 'token' }), // notifyMethod なし
    });
    counterDocGet.mockResolvedValue({ exists: false });
    messagingSend.mockResolvedValue('ok');

    await handler();
    expect(messagingSend).toHaveBeenCalled();
  });

  it('FCMトークンがない場合はスキップ', async () => {
    medsQueryGet.mockResolvedValue({
      empty: false, size: 1,
      docs: [{ id: 'med-1', data: () => ({ userId: 'u1', name: '薬A', limitPerDay: 3 }) }],
    });
    userDocGet.mockResolvedValue({
      data: () => ({ notifyMethod: 'push', notificationToken: null }),
    });
    counterDocGet.mockResolvedValue({ exists: false });

    await handler();
    expect(messagingSend).not.toHaveBeenCalled();
  });

  it('FCM送信エラーでも処理を継続する', async () => {
    medsQueryGet.mockResolvedValue({
      empty: false, size: 1,
      docs: [{ id: 'med-1', data: () => ({ userId: 'u1', name: '薬A', limitPerDay: 3 }) }],
    });
    userDocGet.mockResolvedValue({
      data: () => ({ notifyMethod: 'push', notificationToken: 'token' }),
    });
    counterDocGet.mockResolvedValue({ exists: false });
    messagingSend.mockRejectedValue(new Error('FCM error'));

    await handler();
    expect(console.error).toHaveBeenCalled();
  });

  it('メール通知を送信する', async () => {
    medsQueryGet.mockResolvedValue({
      empty: false, size: 1,
      docs: [{ id: 'med-1', data: () => ({ userId: 'u1', name: '薬B', limitPerDay: 3 }) }],
    });
    userDocGet.mockResolvedValue({
      data: () => ({ notifyMethod: 'email' }),
    });
    counterDocGet.mockResolvedValue({ exists: false });
    authGetUser.mockResolvedValue({ email: 'user@example.com' });

    await handler();
    expect(mockSendEmail).toHaveBeenCalledWith('user@example.com', 'ObatLog リマインダー', '<html>reminder</html>');
  });

  it('デモユーザーは demoEmail からメール送信する', async () => {
    medsQueryGet.mockResolvedValue({
      empty: false, size: 1,
      docs: [{ id: 'med-1', data: () => ({ userId: 'u1', name: '薬Demo', limitPerDay: 3 }) }],
    });
    userDocGet.mockResolvedValue({
      data: () => ({ notifyMethod: 'email', isDemo: true, demoEmail: 'demo@example.com' }),
    });
    counterDocGet.mockResolvedValue({ exists: false });

    await handler();
    // demoEmail を使って送信し、auth.getUser は呼ばない
    expect(authGetUser).not.toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalledWith('demo@example.com', 'ObatLog リマインダー', '<html>reminder</html>');
  });

  it('デモユーザーで demoEmail 未設定の場合はスキップ', async () => {
    medsQueryGet.mockResolvedValue({
      empty: false, size: 1,
      docs: [{ id: 'med-1', data: () => ({ userId: 'u1', name: '薬Demo2', limitPerDay: 3 }) }],
    });
    userDocGet.mockResolvedValue({
      data: () => ({ notifyMethod: 'email', isDemo: true, demoEmail: null }),
    });
    counterDocGet.mockResolvedValue({ exists: false });

    await handler();
    expect(authGetUser).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('auth.getUser 失敗時はスキップ', async () => {
    medsQueryGet.mockResolvedValue({
      empty: false, size: 1,
      docs: [{ id: 'med-1', data: () => ({ userId: 'u1', name: '薬C', limitPerDay: 3 }) }],
    });
    userDocGet.mockResolvedValue({
      data: () => ({ notifyMethod: 'email' }),
    });
    counterDocGet.mockResolvedValue({ exists: false });
    authGetUser.mockRejectedValue(new Error('Auth error'));

    await handler();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('メールアドレスがない場合はスキップ', async () => {
    medsQueryGet.mockResolvedValue({
      empty: false, size: 1,
      docs: [{ id: 'med-1', data: () => ({ userId: 'u1', name: '薬D', limitPerDay: 3 }) }],
    });
    userDocGet.mockResolvedValue({
      data: () => ({ notifyMethod: 'email' }),
    });
    counterDocGet.mockResolvedValue({ exists: false });
    authGetUser.mockResolvedValue({ email: undefined });

    await handler();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('カウンターに total がない場合 0 にフォールバック', async () => {
    medsQueryGet.mockResolvedValue({
      empty: false, size: 1,
      docs: [{ id: 'med-1', data: () => ({ userId: 'u1', name: '薬X', limitPerDay: 3 }) }],
    });
    userDocGet.mockResolvedValue({
      data: () => ({ notifyMethod: 'push', notificationToken: 'token' }),
    });
    // exists: true だが total フィールドなし → ?? 0
    counterDocGet.mockResolvedValue({ exists: true, data: () => ({}) });
    messagingSend.mockResolvedValue('ok');

    await handler();
    // total=0 < limitPerDay=3 → 通知される
    expect(messagingSend).toHaveBeenCalled();
  });

  it('上限到達済みの薬はスキップする', async () => {
    medsQueryGet.mockResolvedValue({
      empty: false, size: 1,
      docs: [{ id: 'med-1', data: () => ({ userId: 'u1', name: '薬E', limitPerDay: 3 }) }],
    });
    userDocGet.mockResolvedValue({
      data: () => ({ notifyMethod: 'push', notificationToken: 'token' }),
    });
    // 上限到達: total === limitPerDay
    counterDocGet.mockResolvedValue({ exists: true, data: () => ({ total: 3 }) });

    await handler();
    // activeMeds が空なので通知しない
    expect(messagingSend).not.toHaveBeenCalled();
  });

  it('複数ユーザー・複数薬を正しくグループ化する', async () => {
    medsQueryGet.mockResolvedValue({
      empty: false, size: 3,
      docs: [
        { id: 'med-1', data: () => ({ userId: 'u1', name: '薬A', limitPerDay: 3 }) },
        { id: 'med-2', data: () => ({ userId: 'u1', name: '薬B', limitPerDay: 3 }) },
        { id: 'med-3', data: () => ({ userId: 'u2', name: '薬C', limitPerDay: 3 }) },
      ],
    });
    userDocGet.mockResolvedValue({
      data: () => ({ notifyMethod: 'push', notificationToken: 'token' }),
    });
    counterDocGet.mockResolvedValue({ exists: false });
    messagingSend.mockResolvedValue('ok');

    await handler();
    // u1: 2件, u2: 1件 = 合計3件送信
    expect(messagingSend).toHaveBeenCalledTimes(3);
  });

  it('ユーザー単位のエラーが他ユーザーに影響しない', async () => {
    medsQueryGet.mockResolvedValue({
      empty: false, size: 2,
      docs: [
        { id: 'med-1', data: () => ({ userId: 'u1', name: '薬A', limitPerDay: 3 }) },
        { id: 'med-2', data: () => ({ userId: 'u2', name: '薬B', limitPerDay: 3 }) },
      ],
    });
    // u1 のユーザー取得でエラー、u2 は正常
    userDocGet
      .mockRejectedValueOnce(new Error('User fetch error'))
      .mockResolvedValueOnce({ data: () => ({ notifyMethod: 'push', notificationToken: 'token' }) });
    counterDocGet.mockResolvedValue({ exists: false });
    messagingSend.mockResolvedValue('ok');

    await handler();
    // u1 はエラーで失敗、u2 は正常に送信
    expect(messagingSend).toHaveBeenCalledTimes(1);
  });
});
