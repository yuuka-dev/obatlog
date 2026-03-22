"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
// Firebase Functions v2 エントリーポイント・ルーター
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const users_1 = require("./users");
const medications_1 = require("./medications");
const intakes_1 = require("./intakes");
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
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use('/v1/users', users_1.usersRouter);
app.use('/v1/medications', medications_1.medicationsRouter);
app.use('/v1/intakes', intakes_1.intakesRouter);
// Functions v2 エクスポート（リージョン: 東京）
exports.api = (0, https_1.onRequest)({ region: 'asia-northeast1', timeoutSeconds: 60 }, app);
//# sourceMappingURL=index.js.map