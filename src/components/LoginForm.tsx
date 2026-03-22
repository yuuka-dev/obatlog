// ログイン・新規登録フォーム（React Island）
import { useState } from 'react';
import { signIn, signUp, resetPassword } from '../lib/auth';
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
