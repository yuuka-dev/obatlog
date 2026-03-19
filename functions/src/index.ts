// Firebase Functions v2 エントリーポイント・ルーター
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';
import { usersRouter } from './users';
import { medicationsRouter } from './medications';
import { intakesRouter } from './intakes';

admin.initializeApp();

const app = express();

// CORS設定: 本番 + 開発環境を許可
const allowedOrigins = [
  'https://obatlog.osaka29.jp',
  'http://localhost:4321',
  'http://localhost:5000',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

app.use('/v1/users', usersRouter);
app.use('/v1/medications', medicationsRouter);
app.use('/v1/intakes', intakesRouter);

// Functions v2 エクスポート（リージョン: 東京）
export const api = onRequest(
  { region: 'asia-northeast1', timeoutSeconds: 60 },
  app
);
