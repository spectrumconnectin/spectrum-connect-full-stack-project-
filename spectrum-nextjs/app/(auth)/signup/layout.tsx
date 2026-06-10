import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Your Free Account',
  description:
    'Join Spectrum Connect free — hire verified creative professionals or get hired as a creator. AI-powered matching, milestone escrow, and just 12% total fees.',
  alternates: { canonical: 'https://spectrumconect.com/signup' },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
