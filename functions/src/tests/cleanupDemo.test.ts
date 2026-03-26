// cleanupDemoUsers のテスト
export {};

// onSchedule をモックしてハンドラー関数を直接取得
jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: jest.fn((_config: unknown, handler: unknown) => handler),
}));

const mockQueryGet = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const mockDocDelete = jest.fn().mockResolvedValue(undefined);
const mockDeleteUser = jest.fn().mockResolvedValue(undefined);

jest.mock('firebase-admin', () => {
  const mod = {
    initializeApp: jest.fn(),
    apps: [],
    firestore: Object.assign(
      jest.fn(() => ({
        collection: jest.fn().mockImplementation((name: string) => {
          if (name === 'users') {
            return {
              where: jest.fn().mockReturnThis(),
              get: mockQueryGet,
              doc: jest.fn(() => ({
                delete: mockDocDelete,
              })),
            };
          }
          // intakes, dailyCounts, errorLogs, medications
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
          };
        }),
        batch: jest.fn(() => ({
          delete: mockBatchDelete,
          commit: mockBatchCommit,
        })),
      })),
      {
        Timestamp: {
          now: jest.fn().mockReturnValue({ _seconds: Math.floor(Date.now() / 1000) }),
        },
      },
    ),
    auth: jest.fn(() => ({
      deleteUser: mockDeleteUser,
    })),
  };
  return mod;
});

import { cleanupDemoUsers } from '../cleanupDemo';

const handler = cleanupDemoUsers as unknown as () => Promise<void>;

beforeAll(() => {
  jest.spyOn(console, 'info').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
});
afterAll(() => jest.restoreAllMocks());
beforeEach(() => jest.clearAllMocks());

describe('cleanupDemoUsers', () => {
  it('期限切れデモユーザーがない場合は何もしない', async () => {
    mockQueryGet.mockResolvedValue({ empty: true, size: 0, docs: [] });

    await handler();

    expect(mockDocDelete).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith('[cleanupDemoUsers] 期限切れデモユーザーなし');
  });

  it('期限切れデモユーザーを削除する', async () => {
    mockQueryGet.mockResolvedValue({
      empty: false,
      size: 1,
      docs: [{ id: 'demo-user-1', data: () => ({ isDemo: true }) }],
    });

    await handler();

    // ユーザードキュメント削除
    expect(mockDocDelete).toHaveBeenCalled();
    // Firebase Auth アカウント削除
    expect(mockDeleteUser).toHaveBeenCalledWith('demo-user-1');
    expect(console.info).toHaveBeenCalledWith(`[cleanupDemoUsers] 削除完了: demo-user-1`);
  });

  it('複数の期限切れデモユーザーを削除する', async () => {
    mockQueryGet.mockResolvedValue({
      empty: false,
      size: 2,
      docs: [
        { id: 'demo-user-1', data: () => ({ isDemo: true }) },
        { id: 'demo-user-2', data: () => ({ isDemo: true }) },
      ],
    });

    await handler();

    expect(mockDeleteUser).toHaveBeenCalledTimes(2);
    expect(mockDeleteUser).toHaveBeenCalledWith('demo-user-1');
    expect(mockDeleteUser).toHaveBeenCalledWith('demo-user-2');
  });

  it('1ユーザーの削除失敗でも他ユーザーの削除を続行する', async () => {
    mockQueryGet.mockResolvedValue({
      empty: false,
      size: 2,
      docs: [
        { id: 'demo-fail', data: () => ({ isDemo: true }) },
        { id: 'demo-ok', data: () => ({ isDemo: true }) },
      ],
    });
    // 1人目の Auth 削除で失敗
    mockDeleteUser
      .mockRejectedValueOnce(new Error('Auth delete error'))
      .mockResolvedValueOnce(undefined);

    await handler();

    // 2人目は正常に削除される
    expect(mockDeleteUser).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledWith(
      '[cleanupDemoUsers] 削除失敗: demo-fail',
      expect.any(Error),
    );
    expect(console.info).toHaveBeenCalledWith('[cleanupDemoUsers] 削除完了: demo-ok');
  });
});
