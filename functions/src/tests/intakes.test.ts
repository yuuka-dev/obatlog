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
});
