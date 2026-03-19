// 既存 intakes に新フィールド(cancelled, isOdLog, moodTags, memo)を追加するマイグレーション
// 実行: npx ts-node src/scripts/migrate-intakes.ts [--emulator]
import * as admin from 'firebase-admin';

const useEmulator = process.argv.includes('--emulator');
if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
}

admin.initializeApp();
const db = admin.firestore();

async function migrate() {
  const intakes = await db.collection('intakes').get();
  console.log(`Found ${intakes.size} intakes to migrate.`);

  let batch = db.batch();
  let count = 0;
  let batchCount = 0;

  for (const doc of intakes.docs) {
    const data = doc.data();
    const updates: Record<string, unknown> = {};

    if (data.cancelled === undefined) updates.cancelled = false;
    if (data.isOdLog === undefined) updates.isOdLog = false;
    if (data.moodTags === undefined) updates.moodTags = [];
    if (data.memo === undefined) updates.memo = '';

    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      count++;
      batchCount++;
    }

    // Firestore batch は最大500件。commit後は新しいbatchを作成
    if (batchCount === 500) {
      await batch.commit();
      console.log(`Committed ${count} documents so far.`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
  console.log(`Migration complete. Updated ${count} documents.`);
}

migrate().catch(console.error);
