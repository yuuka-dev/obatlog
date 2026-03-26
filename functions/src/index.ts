// Firebase Functions v2 エントリーポイント・ルーター
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';
import { usersRouter } from './users';
import { medicationsRouter } from './medications';
import { intakesRouter } from './intakes';
import { accountDeleteRouter } from './accountDelete';
import { dataExportRouter } from './dataExport';
import { demoRouter } from './demo';

admin.initializeApp();

const app = express();

// CORS設定: 本番 + 開発環境を許可
const allowedOrigins = [
  'https://obatlog.web.app',
  'https://obatlog.firebaseapp.com',
  'https://obatlog.com',
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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10kb' }));

app.use('/v1/users', usersRouter);
app.use('/v1/users', accountDeleteRouter);
app.use('/v1/users', dataExportRouter);
app.use('/v1/medications', medicationsRouter);
app.use('/v1/intakes', intakesRouter);
app.use('/v1/demo', demoRouter);

// Functions v2 エクスポート（リージョン: 東京）
export const api = onRequest(
  { region: 'asia-northeast1', timeoutSeconds: 60 },
  app
);

export { sendMedicationReminders } from './notify';
export { cleanupDemoUsers } from './cleanupDemo';
