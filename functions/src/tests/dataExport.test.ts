// dataExport ハンドラーのテスト
export {};

jest.mock('firebase-admin', () => {
  const mockUserDocGet = jest.fn();
  const mockMedsQueryGet = jest.fn();
  const mockIntakesQueryGet = jest.fn();

  const mod = {
    initializeApp: jest.fn(),
    apps: [],
    firestore: jest.fn(() => ({
      collection: jest.fn().mockImplementation((name: string) => {
        if (name === 'users') {
          return { doc: jest.fn(() => ({ get: mockUserDocGet })) };
        }
        if (name === 'medications') {
          return { where: jest.fn().mockReturnThis(), get: mockMedsQueryGet };
        }
        if (name === 'intakes') {
          return { where: jest.fn().mockReturnThis(), get: mockIntakesQueryGet };
        }
        return {};
      }),
    })),
  };
  (mod as any).__test__ = { mockUserDocGet, mockMedsQueryGet, mockIntakesQueryGet };
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

const { mockUserDocGet, mockMedsQueryGet, mockIntakesQueryGet } = (admin as any).__test__;

let app: any;
beforeAll(() => {
  app = express();
  app.use(express.json());
  const { dataExportRouter } = require('../dataExport');
  app.use('/v1/users', dataExportRouter);
});

beforeEach(() => jest.clearAllMocks());

describe('GET /v1/users/me/export', () => {
  it('全データをエクスポートする', async () => {
    mockUserDocGet.mockResolvedValue({
      exists: true,
      id: 'user-1',
      data: () => ({ email: 'test@test.com', language: 'ja' }),
    });
    mockMedsQueryGet.mockResolvedValue({
      docs: [{ id: 'med-1', data: () => ({ name: '薬A', limitPerDay: 3 }) }],
    });
    mockIntakesQueryGet.mockResolvedValue({
      docs: [{ id: 'intake-1', data: () => ({ medicationId: 'med-1', takenUnits: 1 }) }],
    });

    const res = await request(app).get('/v1/users/me/export');
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 'user-1', email: 'test@test.com', language: 'ja' });
    expect(res.body.medications).toHaveLength(1);
    expect(res.body.intakes).toHaveLength(1);
  });

  it('ユーザードキュメントが存在しない場合 user=null', async () => {
    mockUserDocGet.mockResolvedValue({ exists: false, id: 'user-1', data: () => undefined });
    mockMedsQueryGet.mockResolvedValue({ docs: [] });
    mockIntakesQueryGet.mockResolvedValue({ docs: [] });

    const res = await request(app).get('/v1/users/me/export');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
    expect(res.body.medications).toEqual([]);
    expect(res.body.intakes).toEqual([]);
  });

  it('エラー時は 500 を返す', async () => {
    mockUserDocGet.mockRejectedValue(new Error('Firestore error'));

    const res = await request(app).get('/v1/users/me/export');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
