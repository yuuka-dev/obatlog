// intakes ハンドラーの全ルートテスト（POST成功・PATCH・GET）
export {};

jest.mock('firebase-admin', () => {
  const medDocGet = jest.fn();
  const intakeDocGet = jest.fn();
  const intakeDocSet = jest.fn().mockResolvedValue(undefined);
  const intakeDocUpdate = jest.fn().mockResolvedValue(undefined);
  const counterDocGet = jest.fn();
  const intakesQueryGet = jest.fn();
  const runTransaction = jest.fn();

  const mod = {
    initializeApp: jest.fn(),
    apps: [],
    firestore: Object.assign(
      jest.fn(() => ({
        collection: jest.fn().mockImplementation((name: string) => {
          if (name === 'medications') {
            return { doc: jest.fn(() => ({ get: medDocGet })) };
          }
          if (name === 'intakes') {
            return {
              doc: jest.fn(() => ({
                get: intakeDocGet,
                set: intakeDocSet,
                update: intakeDocUpdate,
                id: 'intake-new',
              })),
              where: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              get: intakesQueryGet,
            };
          }
          if (name === 'dailyCounts') {
            return { doc: jest.fn(() => ({ get: counterDocGet })) };
          }
          return {};
        }),
        runTransaction,
      })),
      { FieldValue: { serverTimestamp: jest.fn().mockReturnValue('mock-ts') } },
    ),
  };
  (mod as any).__test__ = {
    medDocGet, intakeDocGet, intakeDocSet, intakeDocUpdate,
    counterDocGet, intakesQueryGet, runTransaction,
  };
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

const {
  medDocGet, intakeDocGet, intakeDocSet, intakeDocUpdate,
  counterDocGet, intakesQueryGet, runTransaction,
} = (admin as any).__test__;

let app: any;
beforeAll(() => {
  app = express();
  app.use(express.json());
  const { intakesRouter } = require('../intakes');
  app.use('/v1/intakes', intakesRouter);
});

beforeEach(() => jest.clearAllMocks());

// --- POST /v1/intakes ---
describe('POST /v1/intakes 成功パス', () => {
  const medData = { userId: 'user-1', name: 'テスト薬', limitPerDay: 3 };

  it('通常記録で 201 を返す', async () => {
    medDocGet.mockResolvedValue({ exists: true, data: () => medData });
    runTransaction.mockImplementation(async (cb: any) => {
      const tx = {
        get: jest.fn().mockResolvedValue({ exists: false }),
        set: jest.fn(),
      };
      return cb(tx);
    });

    const res = await request(app)
      .post('/v1/intakes')
      .send({ medicationId: 'med-1', takenUnits: 1 });
    expect(res.status).toBe(201);
    expect(res.body.intakeId).toBe('intake-new');
    expect(res.body.isOverdose).toBe(false);
    expect(res.body.totalToday).toBe(1);
  });

  it('通常記録で既存カウンターがある場合', async () => {
    medDocGet.mockResolvedValue({ exists: true, data: () => medData });
    runTransaction.mockImplementation(async (cb: any) => {
      const tx = {
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ total: 2 }) }),
        set: jest.fn(),
      };
      return cb(tx);
    });

    const res = await request(app)
      .post('/v1/intakes')
      .send({ medicationId: 'med-1', takenUnits: 1 });
    expect(res.status).toBe(201);
    expect(res.body.totalToday).toBe(3);
    expect(res.body.isOverdose).toBe(false);
  });

  it('OD記録で 201 を返す', async () => {
    medDocGet.mockResolvedValue({ exists: true, data: () => medData });
    counterDocGet.mockResolvedValue({ exists: true, data: () => ({ total: 2 }) });

    const res = await request(app)
      .post('/v1/intakes')
      .send({ medicationId: 'med-1', takenUnits: 10, isOdLog: true, moodTags: ['sad'], memo: 'テストメモ' });
    expect(res.status).toBe(201);
    expect(res.body.isOverdose).toBe(true);
    expect(res.body.totalToday).toBe(2);
    expect(intakeDocSet).toHaveBeenCalledWith(expect.objectContaining({
      isOdLog: true,
      moodTags: ['sad'],
      memo: 'テストメモ',
    }));
  });

  it('OD記録でカウンターが存在しない場合', async () => {
    medDocGet.mockResolvedValue({ exists: true, data: () => medData });
    counterDocGet.mockResolvedValue({ exists: false });

    const res = await request(app)
      .post('/v1/intakes')
      .send({ medicationId: 'med-1', takenUnits: 5, isOdLog: true });
    expect(res.status).toBe(201);
    expect(res.body.totalToday).toBe(0);
  });

  it('OD記録でカウンターに total がない場合 0 にフォールバック', async () => {
    medDocGet.mockResolvedValue({ exists: true, data: () => medData });
    counterDocGet.mockResolvedValue({ exists: true, data: () => ({}) });

    const res = await request(app)
      .post('/v1/intakes')
      .send({ medicationId: 'med-1', takenUnits: 5, isOdLog: true });
    expect(res.status).toBe(201);
    expect(res.body.totalToday).toBe(0);
  });

  it('通常記録でカウンターに total がない場合 0 にフォールバック', async () => {
    medDocGet.mockResolvedValue({ exists: true, data: () => medData });
    runTransaction.mockImplementation(async (cb: any) => {
      const tx = {
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
        set: jest.fn(),
      };
      return cb(tx);
    });

    const res = await request(app)
      .post('/v1/intakes')
      .send({ medicationId: 'med-1', takenUnits: 1 });
    expect(res.status).toBe(201);
    expect(res.body.totalToday).toBe(1);
  });

  it('薬が見つからない場合 404', async () => {
    medDocGet.mockResolvedValue({ exists: false });

    const res = await request(app)
      .post('/v1/intakes')
      .send({ medicationId: 'nonexistent', takenUnits: 1 });
    expect(res.status).toBe(404);
  });

  it('他ユーザーの薬で 403', async () => {
    medDocGet.mockResolvedValue({ exists: true, data: () => ({ userId: 'other-user', name: '薬', limitPerDay: 3 }) });

    const res = await request(app)
      .post('/v1/intakes')
      .send({ medicationId: 'med-1', takenUnits: 1 });
    expect(res.status).toBe(403);
  });

  it('Firestoreエラーで 500', async () => {
    medDocGet.mockRejectedValue(new Error('Firestore error'));

    const res = await request(app)
      .post('/v1/intakes')
      .send({ medicationId: 'med-1', takenUnits: 1 });
    expect(res.status).toBe(500);
  });
});

// --- PATCH /v1/intakes/:id ---
describe('PATCH /v1/intakes/:id', () => {
  it('通常記録のキャンセルで 204', async () => {
    intakeDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'user-1', cancelled: false, isOdLog: false,
        medicationId: 'med-1', dateKey: '2026-03-25', takenUnits: 2,
      }),
    });
    runTransaction.mockImplementation(async (cb: any) => {
      const tx = {
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ total: 5 }) }),
        update: jest.fn(),
      };
      return cb(tx);
    });

    const res = await request(app).patch('/v1/intakes/intake-1');
    expect(res.status).toBe(204);
  });

  it('通常記録キャンセルでカウンターの total が未定義の場合', async () => {
    intakeDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'user-1', cancelled: false, isOdLog: false,
        medicationId: 'med-1', dateKey: '2026-03-25', takenUnits: 1,
      }),
    });
    runTransaction.mockImplementation(async (cb: any) => {
      const tx = {
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
        update: jest.fn(),
      };
      return cb(tx);
    });

    const res = await request(app).patch('/v1/intakes/intake-1');
    expect(res.status).toBe(204);
  });

  it('通常記録キャンセルでカウンターが存在しない場合', async () => {
    intakeDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'user-1', cancelled: false, isOdLog: false,
        medicationId: 'med-1', dateKey: '2026-03-25', takenUnits: 1,
      }),
    });
    runTransaction.mockImplementation(async (cb: any) => {
      const tx = {
        get: jest.fn().mockResolvedValue({ exists: false }),
        update: jest.fn(),
      };
      return cb(tx);
    });

    const res = await request(app).patch('/v1/intakes/intake-1');
    expect(res.status).toBe(204);
  });

  it('OD記録のキャンセルで 204（トランザクション不使用）', async () => {
    intakeDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'user-1', cancelled: false, isOdLog: true,
        medicationId: 'med-1', dateKey: '2026-03-25', takenUnits: 10,
      }),
    });

    const res = await request(app).patch('/v1/intakes/intake-1');
    expect(res.status).toBe(204);
    expect(intakeDocUpdate).toHaveBeenCalledWith({ cancelled: true });
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it('存在しない記録で 404', async () => {
    intakeDocGet.mockResolvedValue({ exists: false });

    const res = await request(app).patch('/v1/intakes/nonexistent');
    expect(res.status).toBe(404);
  });

  it('他ユーザーの記録で 403', async () => {
    intakeDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ userId: 'other-user' }),
    });

    const res = await request(app).patch('/v1/intakes/intake-1');
    expect(res.status).toBe(403);
  });

  it('キャンセル済みで 400', async () => {
    intakeDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ userId: 'user-1', cancelled: true }),
    });

    const res = await request(app).patch('/v1/intakes/intake-1');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ALREADY_CANCELLED');
  });

  it('エラー時は 500', async () => {
    intakeDocGet.mockRejectedValue(new Error('Firestore error'));

    const res = await request(app).patch('/v1/intakes/intake-1');
    expect(res.status).toBe(500);
  });
});

// --- GET /v1/intakes ---
describe('GET /v1/intakes', () => {
  it('dateKey 指定で特定日の記録を返す', async () => {
    intakesQueryGet.mockResolvedValue({
      docs: [
        { id: 'i-1', data: () => ({ medicationId: 'med-1', takenUnits: 1 }) },
      ],
    });

    const res = await request(app).get('/v1/intakes?dateKey=2026-03-25');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('i-1');
  });

  it('dateKey なしで直近N件を返す', async () => {
    intakesQueryGet.mockResolvedValue({
      docs: [
        { id: 'i-1', data: () => ({ medicationId: 'med-1' }) },
        { id: 'i-2', data: () => ({ medicationId: 'med-2' }) },
      ],
    });

    const res = await request(app).get('/v1/intakes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('limit パラメータで件数を指定できる', async () => {
    intakesQueryGet.mockResolvedValue({ docs: [] });

    const res = await request(app).get('/v1/intakes?limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('エラー時は 500', async () => {
    intakesQueryGet.mockRejectedValue(new Error('Firestore error'));

    const res = await request(app).get('/v1/intakes');
    expect(res.status).toBe(500);
  });
});
