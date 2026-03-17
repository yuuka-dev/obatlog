
# 03_HighLevel_Design.md
# 基本設計 – ObatLog

---

## 1. システム構成
[Astro Frontend]
- Firebase Auth
- Firestore
- FCM (Web Push)
- PWA

[Firebase Functions]
- Daily reminder
- Overdose check
[Firebase Hosting]
---

## 2. 使用技術（High-Level）
- Astro（Frontend）
- Tailwind CSS（UI）
- Firebase Auth
- Firestore
- Functions
- FCM
- PWA（vite-plugin-pwa）

---

## 3. データモデル（大枠のみ）

### User
- email

### Medication
- name
- dosagePerUnit
- limitPerDay
- userId

### Intake
- medicationId
- takenUnits
- takenAt
- userId

（※ 詳細設計は ClaudeCode が行う）

---

## 4. 画面構成（大まか）
- ホーム（今日の記録）
- 薬リスト
- ログ一覧

---

## 5. Functions High-Level
- `dailyReminder`
- `overdoseCheck`