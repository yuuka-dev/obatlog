// Microsoft Graph API メール送信ユーティリティ
// Azure AD クライアント資格情報フローでトークンを取得し、Graph API でメール送信する

import * as logger from 'firebase-functions/logger';

// トークンキャッシュ
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/** テスト用: トークンキャッシュをリセット */
export function _resetTokenCache(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
}

function getEnvConfig() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const mailFrom = process.env.MAIL_FROM;

  if (!tenantId || !clientId || !clientSecret || !mailFrom) {
    return null;
  }
  return { tenantId, clientId, clientSecret, mailFrom };
}

async function getAccessToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();
  // 有効期限の60秒前に再取得
  if (cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get access token: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;
  return cachedToken!;
}

async function sendMailRequest(token: string, mailFrom: string, to: string, subject: string, htmlBody: string): Promise<Response> {
  const url = `https://graph.microsoft.com/v1.0/users/${mailFrom}/sendMail`;
  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: htmlBody },
        from: { emailAddress: { name: 'ObatLog', address: mailFrom } },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: false,
    }),
  });
}

/**
 * Graph API でメールを送信する
 * 環境変数未設定時は警告ログを出してスキップ
 */
export async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  const config = getEnvConfig();
  if (!config) {
    logger.warn('[mailSender] 環境変数が未設定のためメール送信をスキップ');
    return;
  }

  const { tenantId, clientId, clientSecret, mailFrom } = config;
  let token = await getAccessToken(tenantId, clientId, clientSecret);
  let res = await sendMailRequest(token, mailFrom, to, subject, htmlBody);

  // 401 → トークン再取得してリトライ（1回のみ）
  if (res.status === 401) {
    logger.warn('[mailSender] 401 received, refreshing token');
    cachedToken = null;
    tokenExpiresAt = 0;
    token = await getAccessToken(tenantId, clientId, clientSecret);
    res = await sendMailRequest(token, mailFrom, to, subject, htmlBody);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API sendMail failed: ${res.status} ${text}`);
  }
}
