// ログイン・新規登録フォーム（React Island）
import { useState } from 'react';
import { signIn, signUp } from '../lib/auth';
import { getLang, t } from '../i18n/index';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const lang = getLang();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
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
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('auth.email', lang)}
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t('auth.password', lang)}
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {error && <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 hover:bg-amber-500 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? t('common.loading', lang) : (isSignUp ? t('auth.signUp', lang) : t('auth.signIn', lang))}
          </button>
        </form>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-sm text-gray-500 hover:text-gray-700"
        >
          {isSignUp ? t('auth.signIn', lang) : t('auth.signUp', lang)}
        </button>
      </div>
    </div>
  );
}
