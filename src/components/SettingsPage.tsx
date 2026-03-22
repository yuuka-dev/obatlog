// 設定画面（React Island）
import { useState, useEffect } from 'react';
import { signOut } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { getLang, setLang, t } from '../i18n/index';
import { requestNotificationPermission } from '../lib/notifications';

export default function SettingsPage() {
  const [lang, setLangState] = useState(getLang());
  const [showLangSheet, setShowLangSheet] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notifyStatus, setNotifyStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [notifyLoading, setNotifyLoading] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotifyStatus(Notification.permission as any);
    }
  }, []);

  // 言語切替
  function handleLangChange(newLang: 'ja' | 'en' | 'id') {
    setLang(newLang);
    setLangState(newLang);
    setShowLangSheet(false);
  }

  // 通知許可
  async function handleEnableNotifications() {
    setNotifyLoading(true);
    try {
      await requestNotificationPermission();
      setNotifyStatus('granted');
    } catch {
      setNotifyStatus('denied');
    } finally {
      setNotifyLoading(false);
    }
  }

  // ログアウト
  async function handleLogout() {
    await signOut();
    window.location.href = '/login';
  }

  // データエクスポート
  async function handleExport() {
    try {
      const data = await apiFetch<object>('/v1/users/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `obatlog-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t('errors.internal', lang));
    }
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

  const langLabel = lang === 'ja' ? '日本語' : lang === 'en' ? 'English' : 'Indonesia';

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-800">
        {t('settings.title' as any, lang)}
      </h1>

      {/* 言語 — タップでボトムシート */}
      <button
        onClick={() => setShowLangSheet(true)}
        className="w-full flex justify-between items-center bg-white border rounded-lg px-4 py-3 text-sm"
      >
        <span className="text-gray-600">{t('settings.language' as any, lang)}</span>
        <span className="text-gray-800 font-medium">{langLabel}</span>
      </button>

      {/* 通知 */}
      <section className="bg-white border rounded-lg px-4 py-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{t('settings.notifications' as any, lang)}</span>
          {notifyStatus === 'granted' ? (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">ON</span>
          ) : notifyStatus === 'denied' ? (
            <span className="text-xs text-gray-400">{t('settings.notifyDenied' as any, lang)}</span>
          ) : (
            <button
              onClick={handleEnableNotifications}
              disabled={notifyLoading}
              className="text-xs bg-amber-400 hover:bg-amber-500 text-white px-3 py-1 rounded-lg transition disabled:opacity-50"
            >
              {notifyLoading ? '...' : t('settings.notifyEnable' as any, lang)}
            </button>
          )}
        </div>
      </section>

      {/* データエクスポート */}
      <button
        onClick={handleExport}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition text-sm"
      >
        {t('settings.exportData' as any, lang)}
      </button>

      {/* ログアウト */}
      <button
        onClick={handleLogout}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition"
      >
        {t('settings.logout' as any, lang)}
      </button>

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

      {/* 言語ボトムシート */}
      {showLangSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowLangSheet(false)}>
          <div className="fixed inset-0 bg-black/30" />
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl p-6 space-y-2 animate-slide-up"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-medium text-gray-500 mb-3">
              {t('settings.language' as any, lang)}
            </h3>
            {([
              { code: 'ja' as const, label: '日本語' },
              { code: 'en' as const, label: 'English' },
              { code: 'id' as const, label: 'Indonesia' },
            ]).map(l => (
              <button key={l.code} onClick={() => handleLangChange(l.code)}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm transition
                  ${lang === l.code ? 'bg-amber-50 text-amber-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                {l.label}
              </button>
            ))}
            <button onClick={() => setShowLangSheet(false)}
              className="w-full text-center text-sm text-gray-400 pt-2">
              {t('common.cancel', lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
