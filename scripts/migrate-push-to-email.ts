// 既存ユーザーの notifyMethod を push → email に一括移行するワンショットスクリプト
// 実行: npx ts-node scripts/migrate-push-to-email.ts
//
// 前提:
// - GOOGLE_APPLICATION_CREDENTIALS が設定されていること
// - または Firebase Admin SDK のデフォルト認証情報が利用可能なこと

import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

async function migrate() {
  const usersSnap = await db.collection('users')
    .where('notifyMethod', '==', 'push')
    .get();

  if (usersSnap.empty) {
    console.log('移行対象のユーザーはいません');
    return;
  }

  console.log(`移行対象: ${usersSnap.size} ユーザー`);

  // Firestore のバッチは最大500件
  const batchSize = 500;
  const docs = usersSnap.docs;
  let migrated = 0;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + batchSize);

    for (const doc of chunk) {
      batch.update(doc.ref, { notifyMethod: 'email' });
    }

    await batch.commit();
    migrated += chunk.length;
    console.log(`${migrated} / ${docs.length} ユーザーを移行しました`);
  }

  console.log(`移行完了: ${migrated} ユーザー`);
}

migrate().catch(err => {
  console.error('移行エラー:', err);
  process.exit(1);
});
