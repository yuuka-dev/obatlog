# Google ログイン追加 設計書

## 概要
Firebase Auth に Google プロバイダを追加し、Google アカウントでのログイン・新規登録を可能にする。

## フロント側

### `src/lib/auth.ts`
`signInWithGoogle()` を追加:
- `GoogleAuthProvider` + `signInWithPopup` を使用
- ポップアップで Google アカウント選択 → Firebase Auth に認証
- 成功したら `User` を返す（リダイレクトは呼び出し元の LoginForm で行う）
- Google idToken には必ず email が含まれる前提（Google プロバイダの仕様）

### `src/components/LoginForm.tsx`
- メール/パスワードフォームの下に区切り線 + 「Google でログイン」ボタンを追加
- ログインモード・新規登録モード・パスワードリセットモードすべてで表示
- Google ログインは Firebase 側でアカウント作成/ログインを自動判定するため、モード区別不要
- 成功後 `window.location.href = '/'` でリダイレクト（既存の signIn/signUp と同じパターン）
- 利用規約・プライバシーポリシーの同意文言は Google ボタンの上に移動し、新規登録モード時は Google ボタンより上に表示されるようにする

### エラーハンドリング
`signInWithPopup` で発生しうるエラーと対応:

| エラーコード | 対応 |
|-------------|------|
| `auth/popup-closed-by-user` | 無視（ユーザーが意図的にキャンセル） |
| `auth/cancelled-popup-request` | 無視（同上） |
| `auth/popup-blocked` | エラーメッセージ表示（`auth.googlePopupBlocked`） |
| `auth/account-exists-with-different-credential` | エラーメッセージ表示（`auth.googleAccountExists`）— 同メールのパスワードアカウントでログインするよう案内 |
| `auth/network-request-failed` | 既存の `errors.internal` を表示 |
| その他 | 既存の `errors.internal` を表示 |

### i18n（3言語）
追加キー:
- `auth.googleSignIn`: 「Google でログイン」「Sign in with Google」「Masuk dengan Google」
- `auth.googlePopupBlocked`: 「ポップアップがブロックされました。ブラウザの設定を確認してください。」
- `auth.googleAccountExists`: 「このメールアドレスは既にパスワードで登録されています。パスワードでログインしてください。」
- `auth.or`: 「または」「or」「atau」

## バックエンド側

**変更なし。** `ensureUserDoc` の遅延初期化が Google ログインでも機能する。Google ログイン後の初回 API アクセス（`getMe()`）時に users ドキュメントが自動作成される。

## Firebase Console（手動作業）

1. Authentication > Sign-in method で Google プロバイダを有効化
2. `One account per email address` がデフォルト ON であることを確認
3. Authentication > Settings > Authorized domains に本番ドメイン（obatlog.web.app 等）が含まれていることを確認

## アカウントリンク

Firebase の `One account per email address` 設定の実際の挙動:
- 既存メール/パスワードユーザーが同じメールで Google ログイン → `auth/account-exists-with-different-credential` エラーが発生
- このケースではエラーメッセージでパスワードログインを案内する（自動リンクはしない）
- ログイン後に設定画面から Google アカウントをリンクする機能は今回スコープ外

## スコープ外

- Google で登録した人が後からメール/パスワードを追加する機能
- 設定画面での連携プロバイダ表示
- 手動アカウントリンク機能
