import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Legal — Spectrum Connect',
  description: 'All of the legal documents that govern your use of Spectrum Connect.',
};

const docs = [
  {
    title: 'Terms of Service',
    href: '/terms',
    description: "The contract between you and Spectrum Connect. Covers what you can do on the platform, how payments and escrow work, what happens if something goes wrong, and how we can each end the relationship.",
    updated: 'May 31, 2026',
    icon: 'fa-file-contract',
    color: '#195ad7',
    bg: '#eff6ff',
  },
  {
    title: 'Privacy Policy',
    href: '/privacy',
    description: "What personal data we collect, why we collect it, who we share it with, and how long we keep it. Also covers your rights under GDPR, CCPA, and similar laws.",
    updated: 'May 31, 2026',
    icon: 'fa-lock',
    color: '#059669',
    bg: '#ecfdf5',
  },
  {
    title: 'Cookie Policy',
    href: '/cookies',
    description: "The specific cookies and similar technologies Spectrum Connect uses, split by category. Includes how to accept or decline each type.",
    updated: 'May 31, 2026',
    icon: 'fa-cookie-bite',
    color: '#d97706',
    bg: '#fefce8',
  },
  {
    title: 'Refund Policy',
    href: '/refunds',
    description: "When you can get your money back. Covers funded-but-unreleased milestones, the dispute process, partial refunds, platform fee reversals, and chargebacks.",
    updated: 'May 31, 2026',
    icon: 'fa-rotate-left',
    color: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    title: 'DMCA & Copyright',
    href: '/dmca',
    description: "How to report infringing content, what we do when we receive a valid notice, and how to file a counter-notice if your work was taken down in error.",
    updated: 'May 31, 2026',
    icon: 'fa-copyright',
    color: '#dc2626',
    bg: '#fff1f2',
  },
  {
    title: 'GDPR & Data Rights',
    href: '/gdpr',
    description: "A plain-language guide to your rights under GDPR, UK GDPR, CCPA, and related laws — including access, deletion, portability, and how to lodge a complaint.",
    updated: 'May 31, 2026',
    icon: 'fa-shield-halved',
    color: '#0891b2',
    bg: '#ecfeff',
  },
  {
    title: 'Acceptable Use Policy',
    href: '/acceptable-use',
    description: "The specific things you can and can't do on Spectrum Connect. Covers fraud, off-platform payments, harassment, content rules, and the enforcement ladder.",
    updated: 'May 31, 2026',
    icon: 'fa-circle-check',
    color: '#0f766e',
    bg: '#f0fdfa',
  },
];

export default function LegalIndexPage() {
  return (
    <div style={{ background: '#fff', fontFamily: "'Inter',system-ui,sans-serif" }}>
      <Nav />

      <section style={{ borderBottom: '1px solid #eef0f3', padding: '60px 24px 48px', background: '#f9fafb' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#195ad7', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Legal</p>
          <h1 style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.025em', margin: '0 0 16px', color: '#111827' }}>
            Legal &amp; policies
          </h1>
          <p style={{ fontSize: 16, color: '#6b7280', margin: 0, maxWidth: 600, lineHeight: 1.65 }}>
            Everything that governs how Spectrum Connect works, how your data is used, and what
            your rights are. If you have a question that isn&apos;t answered here, email{' '}
            <a href="mailto:legal@spectrumconnect.co" style={{ color: '#195ad7', textDecoration: 'underline', textUnderlineOffset: 2 }}>legal@spectrumconnect.co</a>.
          </p>
        </div>
      </section>

      <section style={{ padding: '56px 24px 80px' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
            {docs.map(doc => (
              <Link
                key={doc.href}
                href={doc.href}
                style={{
                  display: 'block', textDecoration: 'none',
                  border: '1px solid #e5e7eb', borderRadius: 16, padding: '24px',
                  background: '#fff', transition: 'box-shadow 0.15s, border-color 0.15s',
                }}
                className="legal-card"
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: doc.bg, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className={`fa-solid ${doc.icon}`} style={{ color: doc.color, fontSize: 18 }}></i>
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>{doc.title}</h2>
                    <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: '0 0 10px' }}>{doc.description}</p>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Updated {doc.updated}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div style={{
            marginTop: 48, padding: '24px 28px',
            background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              Need something specific?
            </h3>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.65 }}>
              For takedown notices (DMCA) write to{' '}
              <a href="mailto:dmca@spectrumconnect.co" style={{ color: '#195ad7' }}>dmca@spectrumconnect.co</a>.
              For data-rights requests write to{' '}
              <a href="mailto:privacy@spectrumconnect.co" style={{ color: '#195ad7' }}>privacy@spectrumconnect.co</a>.
              For everything else,{' '}
              <a href="mailto:legal@spectrumconnect.co" style={{ color: '#195ad7' }}>legal@spectrumconnect.co</a>{' '}
              or the <a href="/help" style={{ color: '#195ad7' }}>Help Center</a>.
            </p>
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        .legal-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border-color: #d1d5db;
        }
      `}</style>
    </div>
  );
}
