// 認証ミドルウェアのテスト
import { verifyToken } from '../middleware/auth';
import * as admin from 'firebase-admin';

jest.mock('firebase-admin', () => ({
  auth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn(),
  }),
  initializeApp: jest.fn(),
  apps: [],
}));

describe('verifyToken', () => {
  const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it('Authorizationヘッダーがない場合 401 を返す', async () => {
    const req: any = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('有効なトークンの場合 uid をセットして next() を呼ぶ', async () => {
    (admin.auth().verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'user-123' });
    const req: any = { headers: { authorization: 'Bearer valid-token' } };
    const res = mockRes();
    const next = jest.fn();
    await verifyToken(req, res, next);
    expect(req.uid).toBe('user-123');
    expect(next).toHaveBeenCalled();
  });

  it('Bearer 以外のスキームは 401', async () => {
    const req: any = { headers: { authorization: 'Basic abc123' } };
    const res = mockRes();
    const next = jest.fn();
    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('空トークンは 401', async () => {
    const req: any = { headers: { authorization: 'Bearer ' } };
    const res = mockRes();
    const next = jest.fn();
    (admin.auth().verifyIdToken as jest.Mock).mockRejectedValue(new Error('invalid'));
    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('有効なトークンの場合 email もセットされる', async () => {
    (admin.auth().verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'user-456', email: 'test@example.com' });
    const req: any = { headers: { authorization: 'Bearer valid-token-2' } };
    const res = mockRes();
    const next = jest.fn();
    await verifyToken(req, res, next);
    expect(req.uid).toBe('user-456');
    expect(req.email).toBe('test@example.com');
    expect(next).toHaveBeenCalled();
  });

  it('email が undefined の場合は空文字がセットされる', async () => {
    (admin.auth().verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'user-789' });
    const req: any = { headers: { authorization: 'Bearer valid-token-3' } };
    const res = mockRes();
    const next = jest.fn();
    await verifyToken(req, res, next);
    expect(req.email).toBe('');
    expect(next).toHaveBeenCalled();
  });
});
