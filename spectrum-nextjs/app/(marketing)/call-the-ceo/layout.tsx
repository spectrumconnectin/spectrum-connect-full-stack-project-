import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Call the CEO — Talk Directly With the Founder',
  description:
    'Request a direct conversation with the founder of Spectrum Connect. For partnerships, investor inquiries, enterprise clients, media, and strategic opportunities.',
  openGraph: {
    title: 'Call the CEO — Spectrum Connect',
    description:
      'Have a partnership, investment, or enterprise opportunity? Request a direct call with the founder of Spectrum Connect.',
    url: 'https://spectrumconect.com/call-the-ceo',
    type: 'website',
  },
  alternates: { canonical: 'https://spectrumconect.com/call-the-ceo' },
};

export default function CallTheCeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
