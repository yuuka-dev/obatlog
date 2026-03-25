// users ハンドラーのテスト
export {};

jest.mock('firebase-admin', () => {
  const mockDocGet = jest.fn();
  const mockDocSet = jest.fn().mockResolvedValue(undefined);
  const mockDocUpdate = jest.fn().mockResolvedValue(undefined);

  const mod = {
    initializeApp: jest.fn(),
    apps: [],
    firestore: Object.assign(
      jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: mockDocGet,
            set: mockDocSet,
            update: mockDocUpdate,
            id: 'user-1',
          })),
        })),
      })),
      { FieldValue: { serverTimestamp: jest.fn().mockReturnValue('mock-ts') } },
    ),
  };
  (mod as any).__test__ = { mockDocGet, mockDocSet, mockDocUpdate };
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

const { mockDocGet, mockDocSet, mockDocUpdate } = (admin as any).__test__;

let app: any;
beforeAll(() => {
  app = express();
  app.use(express.json());
  const { usersRouter } = require('../users');
  app.use('/v1/users', usersRouter);
});

beforeEach(() => jest.clearAllMocks());

const userData = { email: 'test@test.com', language: 'ja', notificationToken: null, adFree: false, notifyMethod: 'push' };

describe('GET /v1/users/me', () => {
  it('既存ユーザーのプロフィールを返す', async () => {
    mockDocGet.mockResolvedValue({ exists: true, id: 'user-1', data: () => userData });

    const res = await request(app).get('/v1/users/me');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('user-1');
    expect(res.body.language).toBe('ja');
    expect(mockDocSet).not.toHaveBeenCalled();
  });

  it('新規ユーザーはドキュメントを自動生成する', async () => {
    mockDocGet
      .mockResolvedValueOnce({ exists: false }) // ensureUserDoc チェック
      .mockResolvedValueOnce({ exists: true, id: 'user-1', data: () => userData }); // 本取得

    const res = await request(app).get('/v1/users/me');
    expect(res.status).toBe(200);
    expect(mockDocSet).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@test.com',
      language: 'ja',
      notifyMethod: 'push',
    }));
  });

  it('エラー時は 500 を返す', async () => {
    mockDocGet.mockRejectedValue(new Error('Firestore error'));

    const res = await request(app).get('/v1/users/me');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});

describe('PUT /v1/users/me', () => {
  beforeEach(() => {
    // ensureUserDoc + update で get が呼ばれる
    mockDocGet.mockResolvedValue({ exists: true, id: 'user-1', data: () => userData });
  });

  it('language を更新する', async () => {
    const res = await request(app)
      .put('/v1/users/me')
      .send({ language: 'en' });
    expect(res.status).toBe(200);
    expect(res.body.language).toBe('en');
    expect(mockDocUpdate).toHaveBeenCalledWith({ language: 'en' });
  });

  it('不正な language で 400', async () => {
    const res = await request(app)
      .put('/v1/users/me')
      .send({ language: 'fr' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('notificationToken を更新する', async () => {
    const res = await request(app)
      .put('/v1/users/me')
      .send({ notificationToken: 'fcm-token-abc' });
    expect(res.status).toBe(200);
    expect(mockDocUpdate).toHaveBeenCalledWith({ notificationToken: 'fcm-token-abc' });
  });

  it('notifyMethod を更新する', async () => {
    const res = await request(app)
      .put('/v1/users/me')
      .send({ notifyMethod: 'email' });
    expect(res.status).toBe(200);
    expect(res.body.notifyMethod).toBe('email');
  });

  it('不正な notifyMethod で 400', async () => {
    const res = await request(app)
      .put('/v1/users/me')
      .send({ notifyMethod: 'sms' });
    expect(res.status).toBe(400);
  });

  it('空ボディで 400', async () => {
    const res = await request(app)
      .put('/v1/users/me')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('No valid fields');
  });

  it('エラー時は 500', async () => {
    mockDocUpdate.mockRejectedValueOnce(new Error('Firestore error'));
    const res = await request(app)
      .put('/v1/users/me')
      .send({ language: 'ja' });
    expect(res.status).toBe(500);
  });
});
