// 過量チェックロジックのユニットテスト
// firebase-admin をモック化してモジュールロード時のエラーを防ぐ
jest.mock('firebase-admin', () => ({
  firestore: jest.fn().mockReturnValue({}),
  initializeApp: jest.fn(),
  apps: [],
}));
jest.mock('../middleware/auth', () => ({
  verifyToken: jest.fn(),
}));

import { calcOverdose } from '../intakes';

describe('calcOverdose', () => {
  it('累計が上限以下なら isOverdose: false', () => {
    expect(calcOverdose(2, 1, 3)).toEqual({ isOverdose: false, totalToday: 3 });
  });

  it('累計が上限を超えたら isOverdose: true', () => {
    expect(calcOverdose(2, 2, 3)).toEqual({ isOverdose: true, totalToday: 4 });
  });

  it('累計がちょうど上限なら isOverdose: false', () => {
    expect(calcOverdose(0, 3, 3)).toEqual({ isOverdose: false, totalToday: 3 });
  });

  it('既に上限到達後の追加記録は isOverdose: true', () => {
    expect(calcOverdose(3, 1, 3)).toEqual({ isOverdose: true, totalToday: 4 });
  });

  it('previousTotal=0, takenUnits=1, limitPerDay=1 → ちょうど上限', () => {
    expect(calcOverdose(0, 1, 1)).toEqual({ isOverdose: false, totalToday: 1 });
  });

  it('大きな数値でも正しく計算', () => {
    expect(calcOverdose(999999, 1, 1000000)).toEqual({ isOverdose: false, totalToday: 1000000 });
  });

  it('previousTotal=0, takenUnits が上限を大幅に超過', () => {
    expect(calcOverdose(0, 100, 3)).toEqual({ isOverdose: true, totalToday: 100 });
  });
});
