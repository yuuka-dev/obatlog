// medications ハンドラーのバリデーション・レスポンステスト
jest.mock('firebase-admin', () => {
  const mockDoc = {
    exists: true,
    data: () => ({ userId: 'user-1', name: 'テスト薬', limitPerDay: 3, notifyEnabled: false, notifyAt: [] }),
    id: 'med-1',
  };
  const mockDocRef = {
    get: jest.fn().mockResolvedValue(mockDoc),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const mockCollection = jest.fn().mockReturnValue({
    doc: jest.fn().mockReturnValue(mockDocRef),
    add: jest.fn().mockResolvedValue({ id: 'new-med-1' }),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [] }),
  });
  return {
    initializeApp: jest.fn(),
    apps: [],
    firestore: Object.assign(jest.fn().mockReturnValue({ collection: mockCollection }), {
      FieldValue: { serverTimestamp: jest.fn().mockReturnValue('mock-timestamp') },
    }),
  };
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

let app: any;

beforeAll(() => {
  app = express();
  app.use(express.json());
  const { medicationsRouter } = require('../medications');
  app.use('/v1/medications', medicationsRouter);
});

describe('POST /v1/medications バリデーション', () => {
  it('name 空文字で 400', async () => {
    const res = await request(app)
      .post('/v1/medications')
      .send({ name: '', limitPerDay: 3 });
    expect(res.status).toBe(400);
  });

  it('name 101文字で 400', async () => {
    const res = await request(app)
      .post('/v1/medications')
      .send({ name: 'あ'.repeat(101), limitPerDay: 3 });
    expect(res.status).toBe(400);
  });

  it('limitPerDay=0 で 400', async () => {
    const res = await request(app)
      .post('/v1/medications')
      .send({ name: 'テスト', limitPerDay: 0 });
    expect(res.status).toBe(400);
  });

  it('limitPerDay=100 で 400', async () => {
    const res = await request(app)
      .post('/v1/medications')
      .send({ name: 'テスト', limitPerDay: 100 });
    expect(res.status).toBe(400);
  });

  it('limitPerDay=1.5 で 400', async () => {
    const res = await request(app)
      .post('/v1/medications')
      .send({ name: 'テスト', limitPerDay: 1.5 });
    expect(res.status).toBe(400);
  });

  it('正常な入力で 201', async () => {
    const res = await request(app)
      .post('/v1/medications')
      .send({ name: 'テスト薬', limitPerDay: 3 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('new-med-1');
  });
});

describe('PUT /v1/medications/:id バリデーション', () => {
  it('notifyAt に不正な時刻形式で 400', async () => {
    const res = await request(app)
      .put('/v1/medications/med-1')
      .send({ notifyAt: ['8:00'] });
    expect(res.status).toBe(400);
  });

  it('notifyAt が 6個以上で 400', async () => {
    const res = await request(app)
      .put('/v1/medications/med-1')
      .send({ notifyAt: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00'] });
    expect(res.status).toBe(400);
  });
});
