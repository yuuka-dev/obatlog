// medications ハンドラーの全ルートテスト（GET・POST成功・PUT成功・DELETE）
export {};

jest.mock('firebase-admin', () => {
  const medDocGet = jest.fn();
  const medDocUpdate = jest.fn().mockResolvedValue(undefined);
  const medDocDelete = jest.fn().mockResolvedValue(undefined);
  const medCollectionAdd = jest.fn();
  const medCollectionGet = jest.fn();

  const mod = {
    initializeApp: jest.fn(),
    apps: [],
    firestore: Object.assign(
      jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: medDocGet,
            update: medDocUpdate,
            delete: medDocDelete,
            id: 'med-1',
          })),
          add: medCollectionAdd,
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          get: medCollectionGet,
        })),
      })),
      { FieldValue: { serverTimestamp: jest.fn().mockReturnValue('mock-ts') } },
    ),
  };
  (mod as any).__test__ = { medDocGet, medDocUpdate, medDocDelete, medCollectionAdd, medCollectionGet };
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

const { medDocGet, medDocUpdate, medDocDelete, medCollectionAdd, medCollectionGet } =
  (admin as any).__test__;

let app: any;
beforeAll(() => {
  app = express();
  app.use(express.json());
  const { medicationsRouter } = require('../medications');
  app.use('/v1/medications', medicationsRouter);
});

beforeEach(() => jest.clearAllMocks());

// --- GET /v1/medications ---
describe('GET /v1/medications', () => {
  it('薬一覧を返す', async () => {
    medCollectionGet.mockResolvedValue({
      docs: [
        { id: 'med-1', data: () => ({ name: '薬A', limitPerDay: 3 }) },
        { id: 'med-2', data: () => ({ name: '薬B', limitPerDay: 5 }) },
      ],
    });

    const res = await request(app).get('/v1/medications');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('薬A');
  });

  it('エラー時は 500', async () => {
    medCollectionGet.mockRejectedValue(new Error('error'));

    const res = await request(app).get('/v1/medications');
    expect(res.status).toBe(500);
  });
});

// --- POST /v1/medications ---
describe('POST /v1/medications 成功パス', () => {
  it('正常登録で 201', async () => {
    medCollectionAdd.mockResolvedValue({ id: 'new-med-1' });

    const res = await request(app)
      .post('/v1/medications')
      .send({ name: 'テスト薬', limitPerDay: 3 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('new-med-1');
    expect(res.body.name).toBe('テスト薬');
  });

  it('name の前後空白がトリムされる', async () => {
    medCollectionAdd.mockResolvedValue({ id: 'new-med-2' });

    const res = await request(app)
      .post('/v1/medications')
      .send({ name: '  テスト薬  ', limitPerDay: 1 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('テスト薬');
  });

  it('Firestoreエラーで 500', async () => {
    medCollectionAdd.mockRejectedValue(new Error('error'));

    const res = await request(app)
      .post('/v1/medications')
      .send({ name: 'テスト', limitPerDay: 1 });
    expect(res.status).toBe(500);
  });
});

// --- PUT /v1/medications/:id ---
describe('PUT /v1/medications/:id', () => {
  const docData = { userId: 'user-1', name: '薬A', limitPerDay: 3, notifyEnabled: false, notifyAt: [] };

  it('name を更新する', async () => {
    medDocGet
      .mockResolvedValueOnce({ exists: true, data: () => docData })
      .mockResolvedValueOnce({ exists: true, data: () => ({ ...docData, name: '更新薬' }), id: 'med-1' });

    const res = await request(app)
      .put('/v1/medications/med-1')
      .send({ name: '更新薬' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('更新薬');
    expect(medDocUpdate).toHaveBeenCalled();
  });

  it('limitPerDay を更新する', async () => {
    medDocGet
      .mockResolvedValueOnce({ exists: true, data: () => docData })
      .mockResolvedValueOnce({ exists: true, data: () => ({ ...docData, limitPerDay: 5 }), id: 'med-1' });

    const res = await request(app)
      .put('/v1/medications/med-1')
      .send({ limitPerDay: 5 });
    expect(res.status).toBe(200);
    expect(res.body.limitPerDay).toBe(5);
  });

  it('notifyEnabled を更新する', async () => {
    medDocGet
      .mockResolvedValueOnce({ exists: true, data: () => docData })
      .mockResolvedValueOnce({ exists: true, data: () => ({ ...docData, notifyEnabled: true }), id: 'med-1' });

    const res = await request(app)
      .put('/v1/medications/med-1')
      .send({ notifyEnabled: true });
    expect(res.status).toBe(200);
    expect(res.body.notifyEnabled).toBe(true);
  });

  it('notifyAt を有効な値で更新する', async () => {
    medDocGet
      .mockResolvedValueOnce({ exists: true, data: () => docData })
      .mockResolvedValueOnce({ exists: true, data: () => ({ ...docData, notifyAt: ['08:00', '12:30'] }), id: 'med-1' });

    const res = await request(app)
      .put('/v1/medications/med-1')
      .send({ notifyAt: ['08:00', '12:30'] });
    expect(res.status).toBe(200);
    expect(res.body.notifyAt).toEqual(['08:00', '12:30']);
  });

  it('name が空文字で 400', async () => {
    medDocGet.mockResolvedValue({ exists: true, data: () => docData });

    const res = await request(app)
      .put('/v1/medications/med-1')
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('name が 101文字で 400', async () => {
    medDocGet.mockResolvedValue({ exists: true, data: () => docData });

    const res = await request(app)
      .put('/v1/medications/med-1')
      .send({ name: 'あ'.repeat(101) });
    expect(res.status).toBe(400);
  });

  it('limitPerDay=0 で 400', async () => {
    medDocGet.mockResolvedValue({ exists: true, data: () => docData });

    const res = await request(app)
      .put('/v1/medications/med-1')
      .send({ limitPerDay: 0 });
    expect(res.status).toBe(400);
  });

  it('limitPerDay=100 で 400', async () => {
    medDocGet.mockResolvedValue({ exists: true, data: () => docData });

    const res = await request(app)
      .put('/v1/medications/med-1')
      .send({ limitPerDay: 100 });
    expect(res.status).toBe(400);
  });

  it('薬が見つからない場合 404', async () => {
    medDocGet.mockResolvedValue({ exists: false });

    const res = await request(app)
      .put('/v1/medications/med-1')
      .send({ name: 'テスト' });
    expect(res.status).toBe(404);
  });

  it('他ユーザーの薬で 403', async () => {
    medDocGet.mockResolvedValue({ exists: true, data: () => ({ userId: 'other' }) });

    const res = await request(app)
      .put('/v1/medications/med-1')
      .send({ name: 'テスト' });
    expect(res.status).toBe(403);
  });

  it('更新後データが取得できない場合 500', async () => {
    medDocGet
      .mockResolvedValueOnce({ exists: true, data: () => docData })
      .mockResolvedValueOnce({ exists: true, data: () => null, id: 'med-1' });

    const res = await request(app)
      .put('/v1/medications/med-1')
      .send({ name: 'テスト' });
    expect(res.status).toBe(500);
  });

  it('Firestoreエラーで 500', async () => {
    medDocGet.mockRejectedValue(new Error('error'));

    const res = await request(app)
      .put('/v1/medications/med-1')
      .send({ name: 'テスト' });
    expect(res.status).toBe(500);
  });
});

// --- DELETE /v1/medications/:id ---
describe('DELETE /v1/medications/:id', () => {
  it('正常削除で 204', async () => {
    medDocGet.mockResolvedValue({ exists: true, data: () => ({ userId: 'user-1' }) });

    const res = await request(app).delete('/v1/medications/med-1');
    expect(res.status).toBe(204);
    expect(medDocDelete).toHaveBeenCalled();
  });

  it('存在しない薬で 404', async () => {
    medDocGet.mockResolvedValue({ exists: false });

    const res = await request(app).delete('/v1/medications/med-1');
    expect(res.status).toBe(404);
  });

  it('他ユーザーの薬で 403', async () => {
    medDocGet.mockResolvedValue({ exists: true, data: () => ({ userId: 'other' }) });

    const res = await request(app).delete('/v1/medications/med-1');
    expect(res.status).toBe(403);
  });

  it('エラー時は 500', async () => {
    medDocGet.mockRejectedValue(new Error('error'));

    const res = await request(app).delete('/v1/medications/med-1');
    expect(res.status).toBe(500);
  });
});
