// mailSender のユニットテスト
// fetch をモックして Graph API 呼び出しをテスト

const mockFetch = jest.fn();
global.fetch = mockFetch;

// 環境変数セット
process.env.AZURE_TENANT_ID = 'test-tenant';
process.env.AZURE_CLIENT_ID = 'test-client';
process.env.AZURE_CLIENT_SECRET = 'test-secret';
process.env.MAIL_FROM = 'noreply@example.com';

import { sendEmail, _resetTokenCache } from '../mailSender';

beforeEach(() => {
  mockFetch.mockReset();
  _resetTokenCache();
});

describe('sendEmail', () => {
  const tokenResponse = {
    access_token: 'test-token-123',
    expires_in: 3600,
  };

  test('トークン取得 → メール送信の順に fetch する', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tokenResponse,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 202,
    });

    await sendEmail('user@example.com', 'テスト件名', '<p>本文</p>');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const tokenCall = mockFetch.mock.calls[0];
    expect(tokenCall[0]).toContain('login.microsoftonline.com/test-tenant');

    const mailCall = mockFetch.mock.calls[1];
    expect(mailCall[0]).toContain('graph.microsoft.com/v1.0/users/noreply@example.com/sendMail');
    const body = JSON.parse(mailCall[1].body);
    expect(body.message.toRecipients[0].emailAddress.address).toBe('user@example.com');
    expect(body.message.subject).toBe('テスト件名');
  });

  test('トークンをキャッシュし、2回目はトークン取得しない', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tokenResponse,
    });
    mockFetch.mockResolvedValueOnce({ ok: true, status: 202 });
    await sendEmail('a@example.com', 's', '<p>b</p>');

    mockFetch.mockResolvedValueOnce({ ok: true, status: 202 });
    await sendEmail('b@example.com', 's2', '<p>b2</p>');

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  test('メール送信で 401 → トークン再取得してリトライ', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tokenResponse,
    });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Unauthorized' });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...tokenResponse, access_token: 'new-token' }),
    });
    mockFetch.mockResolvedValueOnce({ ok: true, status: 202 });

    await sendEmail('user@example.com', 's', '<p>b</p>');

    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  test('トークン取得失敗でエラーを投げる', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Bad Request',
    });

    await expect(sendEmail('user@example.com', 's', '<p>b</p>'))
      .rejects.toThrow('Failed to get access token');
  });

  test('環境変数未設定でメール送信をスキップする', async () => {
    const original = process.env.AZURE_TENANT_ID;
    delete process.env.AZURE_TENANT_ID;
    try {
      await sendEmail('user@example.com', 's', '<p>b</p>');
      expect(mockFetch).not.toHaveBeenCalled();
    } finally {
      process.env.AZURE_TENANT_ID = original;
    }
  });

  test('メール送信で非401エラーはそのままエラーを投げる', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tokenResponse,
    });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    await expect(sendEmail('user@example.com', 's', '<p>b</p>'))
      .rejects.toThrow('Graph API sendMail failed: 500');
  });

  test('401リトライ後も失敗でエラーを投げる', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => tokenResponse })
      .mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Unauthorized' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...tokenResponse, access_token: 'new' }) })
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Error' });

    await expect(sendEmail('user@example.com', 's', '<p>b</p>'))
      .rejects.toThrow('Graph API sendMail failed: 500');
  });
});
