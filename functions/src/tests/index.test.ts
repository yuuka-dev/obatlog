// index.ts（エントリーポイント）のテスト — CORS設定とルーティング
export {};

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('firebase-functions/v2/https', () => ({
  onRequest: jest.fn((_config: any, handler: any) => handler),
}));

// 各ルーターをシンプルなテスト用ルーターに差し替え
jest.mock('../users', () => {
  const r = require('express').Router();
  r.get('/me', (_: any, res: any) => res.json({ router: 'users' }));
  return { usersRouter: r };
});
jest.mock('../accountDelete', () => {
  const r = require('express').Router();
  r.delete('/me', (_: any, res: any) => res.json({ router: 'accountDelete' }));
  return { accountDeleteRouter: r };
});
jest.mock('../dataExport', () => {
  const r = require('express').Router();
  r.get('/me/export', (_: any, res: any) => res.json({ router: 'dataExport' }));
  return { dataExportRouter: r };
});
jest.mock('../medications', () => {
  const r = require('express').Router();
  r.get('/', (_: any, res: any) => res.json({ router: 'medications' }));
  return { medicationsRouter: r };
});
jest.mock('../intakes', () => {
  const r = require('express').Router();
  r.get('/', (_: any, res: any) => res.json({ router: 'intakes' }));
  return { intakesRouter: r };
});
jest.mock('../notify', () => ({
  sendMedicationReminders: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

import { api } from '../index';

describe('index.ts エントリーポイント', () => {
  it('api がエクスポートされている', () => {
    expect(api).toBeDefined();
  });

  it('sendMedicationReminders が再エクスポートされている', () => {
    const { sendMedicationReminders } = require('../index');
    expect(sendMedicationReminders).toBeDefined();
  });

  describe('CORS', () => {
    it('許可されたオリジンでリクエストできる', async () => {
      const res = await request(api)
        .get('/v1/users/me')
        .set('Origin', 'https://obatlog.web.app');
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://obatlog.web.app');
    });

    it('localhost オリジンも許可される', async () => {
      const res = await request(api)
        .get('/v1/users/me')
        .set('Origin', 'http://localhost:4321');
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4321');
    });

    it('オリジンなしのリクエストは許可される', async () => {
      const res = await request(api).get('/v1/users/me');
      expect(res.status).toBe(200);
    });

    it('許可されていないオリジンは拒否される', async () => {
      const res = await request(api)
        .get('/v1/users/me')
        .set('Origin', 'https://evil.com');
      expect(res.status).toBe(500);
    });
  });

  describe('ルーティング', () => {
    it('GET /v1/users/me が users ルーターに到達する', async () => {
      const res = await request(api).get('/v1/users/me');
      expect(res.body.router).toBe('users');
    });

    it('GET /v1/users/me/export が dataExport ルーターに到達する', async () => {
      const res = await request(api).get('/v1/users/me/export');
      expect(res.body.router).toBe('dataExport');
    });

    it('GET /v1/medications が medications ルーターに到達する', async () => {
      const res = await request(api).get('/v1/medications');
      expect(res.body.router).toBe('medications');
    });

    it('GET /v1/intakes が intakes ルーターに到達する', async () => {
      const res = await request(api).get('/v1/intakes');
      expect(res.body.router).toBe('intakes');
    });
  });
});
