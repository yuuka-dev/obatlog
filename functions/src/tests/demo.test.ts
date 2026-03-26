// demo（POST /v1/demo/setup）のテスト
export {};

const mockVerifyIdToken = jest.fn();
const mockDocGet = jest.fn();
const mockDocSet = jest.fn().mockResolvedValue(undefined);
const mockCollectionDoc = jest.fn();
let docIdCounter = 0;

jest.mock('firebase-admin', () => {
  const mod = {
    initializeApp: jest.fn(),
    apps: [],
    firestore: Object.assign(
      jest.fn(() => ({
        collection: jest.fn().mockImplementation((name: string) => {
          if (name === 'users') {
            return {
              doc: jest.fn((id: string) => ({
                get: mockDocGet,
                set: mockDocSet,
                id,
              })),
            };
          }
          // medications, intakes, dailyCounts
          return {
            doc: mockCollectionDoc,
          };
        }),
      })),
      {
        FieldValue: { serverTimestamp: jest.fn().mockReturnValue('mock-ts') },
        Timestamp: {
          fromDate: jest.fn((d: Date) => ({ toDate: () => d, _seconds: Math.floor(d.getTime() / 1000) })),
        },
      },
    ),
    auth: jest.fn(() => ({
      verifyIdToken: mockVerifyIdToken,
    })),
  };
  return mod;
});

const express = require('express');
const request = require('supertest');

let app: ReturnType<typeof express>;
beforeAll(() => {
  app = express();
  app.use(express.json());
  const { demoRouter } = require('../demo');
  app.use('/v1/demo', demoRouter);
});

beforeAll(() => {
  jest.spyOn(console, 'info').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
});
afterAll(() => jest.restoreAllMocks());

beforeEach(() => {
  jest.clearAllMocks();
  docIdCounter = 0;
  mockCollectionDoc.mockImplementation(() => {
    const id = `doc-${++docIdCounter}`;
    return { id, set: mockDocSet };
  });
});

describe('POST /v1/demo/setup', () => {
  it('Authorization ヘッダーがない場合は 401', async () => {
    const res = await request(app).post('/v1/demo/setup');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('無効なトークンで 401', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));
    const res = await request(app)
      .post('/v1/demo/setup')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });

  it('匿名認証以外は 403', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'user-1',
      firebase: { sign_in_provider: 'password' },
    });
    const res = await request(app)
      .post('/v1/demo/setup')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('既にデモセットアップ済みの場合は 409', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'user-1',
      firebase: { sign_in_provider: 'anonymous' },
    });
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ isDemo: true }),
    });

    const res = await request(app)
      .post('/v1/demo/setup')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('正常にデモデータを投入する', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'demo-user-1',
      firebase: { sign_in_provider: 'anonymous' },
    });
    // ユーザー未作成
    mockDocGet.mockResolvedValue({ exists: false });

    const res = await request(app)
      .post('/v1/demo/setup')
      .set('Authorization', 'Bearer valid-token')
      .set('Accept-Language', 'ja');
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Demo setup complete.');
    expect(res.body.expiresAt).toBeDefined();

    // users ドキュメント作成
    expect(mockDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        isDemo: true,
        language: 'ja',
        notifyMethod: 'email',
        demoEmail: null,
      }),
      { merge: true },
    );

    // 薬3件 + intakes 8件 + dailyCounts が作成されている
    // mockDocSet の呼び出し回数: 1(user) + 3(meds) + 8(intakes) + N(dailyCounts)
    expect(mockDocSet.mock.calls.length).toBeGreaterThanOrEqual(12);
  });

  it('Accept-Language が英語の場合 language は en', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'demo-user-2',
      firebase: { sign_in_provider: 'anonymous' },
    });
    mockDocGet.mockResolvedValue({ exists: false });

    const res = await request(app)
      .post('/v1/demo/setup')
      .set('Authorization', 'Bearer valid-token')
      .set('Accept-Language', 'en-US');
    expect(res.status).toBe(201);

    expect(mockDocSet).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'en' }),
      { merge: true },
    );
  });

  it('Accept-Language がインドネシア語の場合 language は id', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'demo-user-3',
      firebase: { sign_in_provider: 'anonymous' },
    });
    mockDocGet.mockResolvedValue({ exists: false });

    const res = await request(app)
      .post('/v1/demo/setup')
      .set('Authorization', 'Bearer valid-token')
      .set('Accept-Language', 'id-ID');
    expect(res.status).toBe(201);

    expect(mockDocSet).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'id' }),
      { merge: true },
    );
  });

  it('Accept-Language が未知の場合は en', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'demo-user-4',
      firebase: { sign_in_provider: 'anonymous' },
    });
    mockDocGet.mockResolvedValue({ exists: false });

    const res = await request(app)
      .post('/v1/demo/setup')
      .set('Authorization', 'Bearer valid-token')
      .set('Accept-Language', 'fr-FR');
    expect(res.status).toBe(201);

    expect(mockDocSet).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'en' }),
      { merge: true },
    );
  });

  it('isDemo が false の既存ユーザーは通常ユーザーなのでセットアップ許可', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'user-existing',
      firebase: { sign_in_provider: 'anonymous' },
    });
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ isDemo: false }),
    });

    const res = await request(app)
      .post('/v1/demo/setup')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(201);
  });

  it('Firestore エラー時は 500', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'demo-user-err',
      firebase: { sign_in_provider: 'anonymous' },
    });
    mockDocGet.mockResolvedValue({ exists: false });
    mockDocSet.mockRejectedValueOnce(new Error('Firestore error'));

    const res = await request(app)
      .post('/v1/demo/setup')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
