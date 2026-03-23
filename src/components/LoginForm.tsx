// ログイン・新規登録フォーム（React Island）
import { useState } from 'react';
import { signIn, signUp, resetPassword, signInWithGoogle } from '../lib/auth';
import { getLang, t } from '../i18n/index';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const lang = getLang();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // パスワードリセットモード
      if (resetMode) {
        await resetPassword(email);
        setResetSent(true);
        return;
      }
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      window.location.href = '/';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('errors.internal', lang);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      window.location.href = '/';
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // ユーザーがキャンセルした場合は無視
      } else if (code === 'auth/popup-blocked') {
        setError(t('auth.googlePopupBlocked' as any, lang));
      } else if (code === 'auth/account-exists-with-different-credential') {
        setError(t('auth.googleAccountExists' as any, lang));
      } else {
        setError(t('errors.internal', lang));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center text-gray-800">ObatLog 💊</h1>

        {/* パスワードリセット完了メッセージ */}
        {resetSent ? (
          <div className="space-y-3">
            <p className="text-sm text-green-700 bg-green-50 rounded p-3">
              {t('auth.resetSent' as any, lang)}
            </p>
            <button
              onClick={() => { setResetMode(false); setResetSent(false); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              {t('auth.signIn', lang)}
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('auth.email', lang)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {!resetMode && (
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth.password', lang)}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              )}
              {error && <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-400 hover:bg-amber-500 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
              >
                {loading
                  ? t('common.loading', lang)
                  : resetMode
                    ? t('auth.resetPassword' as any, lang)
                    : isSignUp ? t('auth.signUp', lang) : t('auth.signIn', lang)}
              </button>
            </form>

            {/* 利用規約同意文言（新規登録時） */}
            {isSignUp && !resetMode && (
              <p className="text-xs text-gray-400 text-center">
                {(() => {
                  const text = t('auth.agreeTerms' as any, lang);
                  const parts = text.split(/\{terms\}|\{privacy\}/);
                  return (
                    <>
                      {parts[0]}
                      <a href="/terms" className="underline hover:text-gray-600">{t('terms' as any, lang)}</a>
                      {parts[1]}
                      <a href="/privacy" className="underline hover:text-gray-600">{t('privacy' as any, lang)}</a>
                      {parts[2]}
                    </>
                  );
                })()}
              </p>
            )}

            {/* 区切り線 */}
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400">{t('auth.or' as any, lang)}</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* Google ログインボタン */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg transition disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t('auth.googleSignIn' as any, lang)}
            </button>

            <div className="flex flex-col gap-1">
              {!resetMode && (
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  {isSignUp ? t('auth.signIn', lang) : t('auth.signUp', lang)}
                </button>
              )}
              <button
                onClick={() => { setResetMode(!resetMode); setError(''); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600"
              >
                {resetMode ? t('auth.signIn', lang) : t('auth.forgotPassword' as any, lang)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
