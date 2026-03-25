// accountDelete ハンドラーのテスト
export {};

jest.mock('firebase-admin', () => {
  const mockWhereGet = jest.fn().mockResolvedValue({ empty: true, docs: [] });
  const mockBatchDelete = jest.fn();
  const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
  const mockDocDelete = jest.fn().mockResolvedValue(undefined);
  const mockDeleteUser = jest.fn().mockResolvedValue(undefined);

  const mod = {
    initializeApp: jest.fn(),
    apps: [],
    firestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        where: jest.fn().mockReturnValue({ get: mockWhereGet }),
        doc: jest.fn().mockReturnValue({ delete: mockDocDelete }),
      })),
      batch: jest.fn(() => ({ delete: mockBatchDelete, commit: mockBatchCommit })),
    })),
    auth: jest.fn(() => ({ deleteUser: mockDeleteUser })),
  };
  (mod as any).__test__ = { mockWhereGet, mockBatchDelete, mockBatchCommit, mockDocDelete, mockDeleteUser };
  return mod;
});

jest.mock('../middleware/auth', () => ({
  verifyToken: (req: any, _res: any, next: any) => {
    req.uid = 'user-1';
    req.email = 'test@test.com';
    next();
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import * as admin from 'firebase-admin';

const { mockWhereGet, mockBatchDelete, mockBatchCommit, mockDeleteUser } = (admin as any).__test__;

let app: any;
beforeAll(() => {
  app = express();
  app.use(express.json());
  const { accountDeleteRouter } = require('../accountDelete');
  app.use('/v1/users', accountDeleteRouter);
});

beforeEach(() => {
  jest.clearAllMocks();
  // デフォルト: 空コレクション
  mockWhereGet.mockResolvedValue({ empty: true, docs: [] });
  mockDeleteUser.mockResolvedValue(undefined);
});

describe('DELETE /v1/users/me', () => {
  it('全コレクションが空でも正常に削除', async () => {
    const res = await request(app).delete('/v1/users/me');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('アカウントを削除しました');
    expect(mockDeleteUser).toHaveBeenCalledWith('user-1');
  });

  it('コレクションにドキュメントがある場合バッチ削除する', async () => {
    // 最初のコレクション（medications）に2件
    mockWhereGet
      .mockResolvedValueOnce({
        empty: false,
        docs: [{ ref: 'ref-1' }, { ref: 'ref-2' }],
      })
      .mockResolvedValue({ empty: true, docs: [] });

    const res = await request(app).delete('/v1/users/me');
    expect(res.status).toBe(200);
    expect(mockBatchDelete).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it('500件ちょうどでバッチ境界を正しく処理する', async () => {
    const docs = Array.from({ length: 500 }, (_, i) => ({ ref: `ref-${i}` }));
    mockWhereGet
      .mockResolvedValueOnce({ empty: false, docs })
      .mockResolvedValue({ empty: true, docs: [] });

    const res = await request(app).delete('/v1/users/me');
    expect(res.status).toBe(200);
    expect(mockBatchDelete).toHaveBeenCalledTimes(500);
    // 500件ちょうど → ループ内commitのみ、ループ後commitなし
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it('エラー時は 500 を返す', async () => {
    mockDeleteUser.mockRejectedValueOnce(new Error('Auth error'));
    const res = await request(app).delete('/v1/users/me');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
