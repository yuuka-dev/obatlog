import HomePage from '@/components/HomePage';
import { getSiteUrl } from '@/lib/site';

const site = getSiteUrl();

export default function Page() {
  // WebApplication + Organization JSON-LD 構造化データ
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'ObatLog',
        description:
          '毎日の服薬をワンタップで記録。過量服薬チェックと飲み忘れ通知で安心の服薬管理を。',
        applicationCategory: 'HealthApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'JPY',
        },
        author: {
          '@type': 'Organization',
          name: '第29大阪技術局',
          url: `${site}/`,
        },
        url: `${site}/`,
      },
      {
        '@type': 'Organization',
        name: '第29大阪技術局',
        url: `${site}/`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePage />
    </>
  );
}
