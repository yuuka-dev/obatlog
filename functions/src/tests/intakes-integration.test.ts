// intakes ハンドラーのバリデーション・レスポンステスト
export {};
jest.mock('firebase-admin', () => {
  const mockDoc = {
    exists: true,
    data: () => ({ userId: 'user-1', name: 'テスト薬', limitPerDay: 3 }),
    id: 'med-1',
  };
  const mockCollection = jest.fn().mockReturnValue({
    doc: jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue(mockDoc),
      set: jest.fn().mockResolvedValue(undefined),
      id: 'intake-1',
    }),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
  });
  return {
    initializeApp: jest.fn(),
    apps: [],
    firestore: Object.assign(jest.fn().mockReturnValue({ collection: mockCollection, runTransaction: jest.fn() }), {
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
  // Express アプリを構築
  app = express();
  app.use(express.json());
  // intakes ルーターをインポート（モック適用後）
  const { intakesRouter } = require('../intakes');
  app.use('/v1/intakes', intakesRouter);
});

describe('POST /v1/intakes バリデーション', () => {
  it('medicationId 未指定で 400', async () => {
    const res = await request(app)
      .post('/v1/intakes')
      .send({ takenUnits: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('takenUnits が 0 で 400', async () => {
    const res = await request(app)
      .post('/v1/intakes')
      .send({ medicationId: 'med-1', takenUnits: 0 });
    expect(res.status).toBe(400);
  });

  it('takenUnits が負数で 400', async () => {
    const res = await request(app)
      .post('/v1/intakes')
      .send({ medicationId: 'med-1', takenUnits: -1 });
    expect(res.status).toBe(400);
  });

  it('通常記録で takenUnits > 99 は 400', async () => {
    const res = await request(app)
      .post('/v1/intakes')
      .send({ medicationId: 'med-1', takenUnits: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('99');
  });

  it('OD記録で takenUnits > 999 は 400', async () => {
    const res = await request(app)
      .post('/v1/intakes')
      .send({ medicationId: 'med-1', takenUnits: 1000, isOdLog: true });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('999');
  });

  it('moodTags が 6個以上で 400', async () => {
    const res = await request(app)
      .post('/v1/intakes')
      .send({
        medicationId: 'med-1', takenUnits: 1, isOdLog: true,
        moodTags: ['a', 'b', 'c', 'd', 'e', 'f'],
      });
    expect(res.status).toBe(400);
  });

  it('memo が 500文字超で 400', async () => {
    const res = await request(app)
      .post('/v1/intakes')
      .send({
        medicationId: 'med-1', takenUnits: 1, isOdLog: true,
        memo: 'a'.repeat(501),
      });
    expect(res.status).toBe(400);
  });
});
