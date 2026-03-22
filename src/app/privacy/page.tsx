import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="text-amber-500 hover:text-amber-600 text-sm mb-6 inline-block">← ホームに戻る</Link>
        <h1 className="text-2xl font-bold text-gray-800 mb-8">プライバシーポリシー</h1>
        <div className="space-y-8 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">1. 収集する情報</h2>
            <p>ObatLog では、サービス提供のために以下の情報を収集します。</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>メールアドレス（ログイン認証のため）</li>
              <li>服薬記録（薬の名前、服用錠数、服用日時）</li>
              <li>通知トークン（飲み忘れ通知の送信のため）</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">2. 利用目的</h2>
            <p>収集した情報は、以下の目的にのみ利用します。</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>服薬の記録・管理機能の提供</li>
              <li>1日あたりの過量チェック（OD防止）</li>
              <li>飲み忘れ防止の通知送信</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">3. 第三者提供</h2>
            <p>お客様の個人情報を第三者に提供することはありません。</p>
            <p className="mt-2">なお、本サービスは Google Firebase をインフラ基盤として利用しています。データは Firebase のセキュリティポリシーに基づいて管理されます。詳細は <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">Firebase プライバシーポリシー</a> をご確認ください。</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">4. データの保持と削除</h2>
            <p>アカウントを削除することで、関連するすべてのデータ（服薬記録、薬の登録情報、通知設定）を削除できます。削除されたデータは復元できません。</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">5. Cookie について</h2>
            <p>本サービスでは、Firebase Authentication によるセッション管理のために Cookie を使用しています。広告目的の Cookie は使用していません。</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">6. お問い合わせ</h2>
            <p>プライバシーに関するお問い合わせは、以下までご連絡ください。</p>
            <p className="mt-2 text-gray-500">運営: 第29大阪技術局（<a href="https://osaka29.jp" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">osaka29.jp</a>）</p>
            <p className="text-gray-500">メール: <a href="mailto:contract@osaka29.jp" className="text-amber-500 hover:underline select-all">contract@osaka29.jp</a></p>
          </section>
          <p className="text-gray-400 text-xs pt-4 border-t border-gray-200">最終更新日: 2026年3月22日</p>
        </div>
      </div>
    </div>
  );
}
