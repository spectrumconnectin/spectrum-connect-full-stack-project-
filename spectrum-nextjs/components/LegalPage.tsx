import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';

// Shared scaffold for all /terms, /privacy, /cookies, /refunds, /dmca,
// /gdpr, /acceptable-use pages. Keeps the typography, header, and footnotes
// consistent so the legal suite reads as one document set.

export interface LegalPageProps {
  title: string;
  tldr?: React.ReactNode;            // plain-language summary at top
  effectiveDate?: string;
  lastUpdated?: string;
  children: React.ReactNode;          // page body — JSX with H2s and Ps
  highlightColor?: 'amber' | 'blue' | 'green' | 'rose';
}

const HIGHLIGHTS = {
  amber: { bg: '#fefce8', border: '#fde68a' },
  blue:  { bg: '#eff6ff', border: '#bfdbfe' },
  green: { bg: '#ecfdf5', border: '#a7f3d0' },
  rose:  { bg: '#fff1f2', border: '#fecdd3' },
};

export default function LegalPage({
  title,
  tldr,
  effectiveDate,
  lastUpdated,
  children,
  highlightColor = 'amber',
}: LegalPageProps) {
  const hl = HIGHLIGHTS[highlightColor];

  return (
    <div style={{ background: '#fff', color: '#1f2937', fontFamily: "'Inter',system-ui,sans-serif" }}>
      <Nav />

      <section style={{ borderBottom: '1px solid #eef0f3', padding: '60px 24px 40px', background: '#f9fafb' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#195ad7', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            <Link href="/legal" style={{ color: '#195ad7', textDecoration: 'none' }}>Legal</Link>
          </p>
          <h1 style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.025em', margin: '0 0 14px', color: '#111827' }}>{title}</h1>
          {(effectiveDate || lastUpdated) && (
            <p style={{ fontSize: 15, color: '#6b7280', margin: 0 }}>
              {lastUpdated && <>Last updated: {lastUpdated}</>}
              {lastUpdated && effectiveDate && ' · '}
              {effectiveDate && <>Effective: {effectiveDate}</>}
            </p>
          )}
        </div>
      </section>

      <section style={{ padding: '60px 24px 80px' }}>
        <div className="legal-body" style={{ maxWidth: 760, margin: '0 auto' }}>
          {tldr && (
            <div style={{
              fontSize: 15, color: '#4b5563', lineHeight: 1.7,
              background: hl.bg, border: `1px solid ${hl.border}`,
              borderRadius: 12, padding: '16px 20px', marginBottom: 36,
            }}>
              {tldr}
            </div>
          )}
          {children}
        </div>
      </section>

      <Footer />

      {/* Typography rules scoped to the legal body. Keeps every page
          looking the same without forcing inline styles on every element. */}
      <style>{`
        .legal-body h2 {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin: 36px 0 12px;
          letter-spacing: -0.01em;
        }
        .legal-body h2:first-child { margin-top: 0; }
        .legal-body h3 {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin: 24px 0 8px;
        }
        .legal-body p {
          font-size: 15px;
          color: #4b5563;
          line-height: 1.75;
          margin: 0 0 14px;
        }
        .legal-body ul, .legal-body ol {
          font-size: 15px;
          color: #4b5563;
          line-height: 1.75;
          margin: 0 0 14px;
          padding-left: 24px;
        }
        .legal-body li { margin-bottom: 6px; }
        .legal-body li::marker { color: #9ca3af; }
        .legal-body a { color: #195ad7; text-decoration: underline; text-underline-offset: 2px; }
        .legal-body strong { color: #111827; }
        .legal-body code {
          background: #f3f4f6;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 13px;
          color: #111827;
        }
        .legal-body .callout {
          background: #f9fafb;
          border-left: 3px solid #195ad7;
          padding: 12px 18px;
          margin: 18px 0;
          border-radius: 4px;
          font-size: 14px;
          color: #4b5563;
        }
        .legal-body .callout em { color: #6b7280; }
      `}</style>
    </div>
  );
}
