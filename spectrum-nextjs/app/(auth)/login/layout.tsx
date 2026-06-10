import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log In to Your Account',
  description:
    'Log in to Spectrum Connect to manage your projects, hire verified creators, message your team, and track milestone payments.',
  alternates: { canonical: 'https://spectrumconect.com/login' },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
