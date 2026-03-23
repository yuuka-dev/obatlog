# Google ログイン追加 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Firebase Auth に Google プロバイダを追加し、Google アカウントでログイン・新規登録できるようにする。

**Architecture:** `src/lib/auth.ts` に `signInWithGoogle()` を追加し、`LoginForm.tsx` に Google ボタンを配置。バックエンド変更なし（`ensureUserDoc` の遅延初期化がそのまま機能する）。

**Tech Stack:** Firebase Auth (Google Provider), Next.js, React, TypeScript

---

## Task 1: auth.ts に signInWithGoogle を追加

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: import に GoogleAuthProvider と signInWithPopup を追加**

`src/lib/auth.ts` の既存 import 文に `signInWithPopup` と `GoogleAuthProvider` を追加する。

変更前:
```typescript
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
```

変更後:
```typescript
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth';
```

- [ ] **Step 2: ファイル末尾に signInWithGoogle 関数を追加**

`getCurrentUser` 関数の後に追加:

```typescript
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}
```

- [ ] **Step 3: ビルド確認**

```bash
npm run build
```

- [ ] **Step 4: コミット**

```bash
git add src/lib/auth.ts
git commit -m "feat: signInWithGoogle 関数を追加"
```

---

## Task 2: i18n に Google ログイン用キーを追加

**Files:**
- Modify: `src/i18n/ja.json`
- Modify: `src/i18n/en.json`
- Modify: `src/i18n/id.json`

- [ ] **Step 1: ja.json にキーを追加**

`ja.json` の最後のキー `"seo.privacyTitle": "..."` の末尾にカンマを追加し、その下に以下を追加:

```json
  "auth.or": "または",
  "auth.googleSignIn": "Google でログイン",
  "auth.googlePopupBlocked": "ポップアップがブロックされました。ブラウザの設定を確認してください。",
  "auth.googleAccountExists": "このメールアドレスは既にパスワードで登録されています。パスワードでログインしてください。"
```

- [ ] **Step 2: en.json にキーを追加**

`en.json` の最後のキーの末尾にカンマを追加し、その下に以下を追加:

```json
  "auth.or": "or",
  "auth.googleSignIn": "Sign in with Google",
  "auth.googlePopupBlocked": "Popup was blocked. Please check your browser settings.",
  "auth.googleAccountExists": "This email is already registered with a password. Please sign in with your password."
```

- [ ] **Step 3: id.json にキーを追加**

`id.json` の最後のキーの末尾にカンマを追加し、その下に以下を追加:

```json
  "auth.or": "atau",
  "auth.googleSignIn": "Masuk dengan Google",
  "auth.googlePopupBlocked": "Popup diblokir. Periksa pengaturan browser Anda.",
  "auth.googleAccountExists": "Email ini sudah terdaftar dengan kata sandi. Silakan masuk dengan kata sandi."
```

- [ ] **Step 4: ビルド確認**

```bash
npm run build
```

- [ ] **Step 5: コミット**

```bash
git add src/i18n/ja.json src/i18n/en.json src/i18n/id.json
git commit -m "feat: Google ログイン用 i18n キー追加（3言語）"
```

---

## Task 3: LoginForm に Google ログインボタンを追加

**Files:**
- Modify: `src/components/LoginForm.tsx`

**注:** 既存コードベースでは i18n キーに `as any` キャストを使うパターンが定着している（`TranslationKey` 型が `ja.json` のキーから自動推論されるため、新規キーは型に含まれるまで `as any` が必要）。このパターンに従う。

- [ ] **Step 1: import に signInWithGoogle を追加**

変更前:
```typescript
import { signIn, signUp, resetPassword } from '../lib/auth';
```

変更後:
```typescript
import { signIn, signUp, resetPassword, signInWithGoogle } from '../lib/auth';
```

- [ ] **Step 2: handleGoogleSignIn ハンドラーを追加**

`handleSubmit` 関数の後に追加:

```typescript
  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      window.location.href = '/';
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      // ユーザーがキャンセルした場合は無視
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // 何もしない
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
```

- [ ] **Step 3: 利用規約テキストをフォーム外に移動し、Google ボタンを追加**

1. フォーム内にある `{isSignUp && !resetMode && (` で始まる `auth.agreeTerms` ブロック（`<p className="text-xs text-gray-400 text-center">` を含むブロック全体）を削除する。

2. `</form>` の直後、切り替えボタン `<div className="flex flex-col gap-1">` の前に、以下を挿入:

```tsx
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
```

- [ ] **Step 4: ビルド確認**

```bash
npm run build
```

- [ ] **Step 5: コミット**

```bash
git add src/components/LoginForm.tsx
git commit -m "feat: LoginForm に Google ログインボタンを追加"
```

---

## Task 4: Firebase Console 設定（手動）

- [ ] **Step 1: Google プロバイダを有効化**

1. [Firebase Console](https://console.firebase.google.com/) → obatlog プロジェクト
2. Authentication > Sign-in method
3. 「Google」を選択して有効化
4. プロジェクトのサポートメール（contract@osaka29.jp）を設定

- [ ] **Step 2: Authorized domains を確認**

1. Authentication > Settings > Authorized domains
2. `localhost` と Firebase Hosting ドメイン（`obatlog.web.app`）が含まれていることを確認
3. カスタムドメイン（`obatlog.osaka29.jp` 等）があれば追加

- [ ] **Step 3: One account per email address を確認**

1. Authentication > Settings > User account linking
2. 「One account per email address」が有効であることを確認
