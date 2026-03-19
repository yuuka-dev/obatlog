// 全APIエンドポイントで使用するトークン検証ミドルウェア
import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

// AuthenticatedRequest: uid が付与されたリクエスト型
export interface AuthenticatedRequest extends Request {
  uid: string;
}

// verifyToken: Authorizationヘッダーの idToken を検証し uid をセット
export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authorization header required.' } });
    return;
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    (req as AuthenticatedRequest).uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token.' } });
  }
}
