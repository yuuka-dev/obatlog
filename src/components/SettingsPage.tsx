// 設定画面（React Island）
import { useState } from 'react';
import { signOut } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { getLang, t } from '../i18n/index';

export default function SettingsPage() {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const lang = getLang();

  // ログアウト
  async function handleLogout() {
    await signOut();
    window.location.href = '/login';
  }

  // アカウント削除
  async function handleDeleteAccount() {
    setDeleting(true);
    setError('');
    try {
      await apiFetch('/v1/users/me', { method: 'DELETE' });
      await signOut();
      window.location.href = '/login';
    } catch {
      setError(t('errors.internal', lang));
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
      <h1 className="text-xl font-bold text-gray-800">
        {t('settings.title' as any, lang)}
      </h1>

      {/* ログアウト */}
      <section>
        <button
          onClick={handleLogout}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition"
        >
          {t('settings.logout' as any, lang)}
        </button>
      </section>

      {/* アカウント削除 */}
      <section className="border-t pt-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">
          {t('settings.dangerZone' as any, lang)}
        </h2>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-lg transition text-sm"
          >
            {t('settings.deleteAccount' as any, lang)}
          </button>
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-sm text-gray-600">
              {t('settings.deleteConfirm' as any, lang)}
            </p>
            {error && <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded-lg transition text-sm disabled:opacity-50"
              >
                {deleting ? t('common.loading', lang) : t('settings.deleteConfirmYes' as any, lang)}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-lg transition text-sm"
              >
                {t('common.cancel', lang)}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* フッターリンク */}
      <section className="border-t pt-4 text-center text-xs text-gray-400 space-x-4">
        <a href="/privacy" className="hover:text-gray-600">{t('nav.privacy' as any, lang)}</a>
        <a href="/terms" className="hover:text-gray-600">{t('nav.terms' as any, lang)}</a>
      </section>
    </div>
  );
}
