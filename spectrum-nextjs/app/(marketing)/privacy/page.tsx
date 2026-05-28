import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Privacy Policy — Spectrum Connect',
  description: 'Learn how Spectrum Connect collects, uses, and protects your data.',
};

const sections = [
  {
    title: '1. Information We Collect',
    body: `We collect information you provide directly (name, email, password, profile details, portfolio content, billing information), information generated through platform use (project history, messages, reviews, payment transactions), and technical information (IP address, browser type, device identifiers, cookies, and usage analytics). We do not sell your personal information to third parties.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use your information to: operate and improve the Platform; match creators with relevant projects; process payments and prevent fraud; communicate with you about your account and projects; personalise your experience; comply with legal obligations; and enforce our Terms of Service. We may also use aggregated, anonymised data for research and product development.`,
  },
  {
    title: '3. Sharing Your Information',
    body: `We share your information with: other users as necessary for project collaboration (e.g. your profile is visible to clients reviewing applications); payment processors to handle transactions; cloud service providers that host our infrastructure; analytics providers (only anonymised or aggregated data); and law enforcement when required by law. We do not share your personal information with advertisers.`,
  },
  {
    title: '4. Cookies and Tracking',
    body: `We use cookies and similar tracking technologies to maintain your session, remember your preferences, and measure how the Platform is used. Essential cookies are required for the Platform to function. You can disable non-essential cookies in your browser settings, though this may affect Platform functionality. We do not use cookies to serve third-party advertising.`,
  },
  {
    title: '5. Data Retention',
    body: `We retain your account data for as long as your account is active. After account deletion, we may retain certain records for up to 7 years for fraud prevention, legal compliance, and dispute resolution purposes. Backups may persist for up to 90 days after deletion. You may request a copy of your data at any time by contacting privacy@spectrumconnect.co.`,
  },
  {
    title: '6. Data Security',
    body: `We implement industry-standard security measures including TLS encryption in transit, AES-256 encryption at rest for sensitive data, access controls and least-privilege principles for our team, regular security audits, and intrusion detection systems. However, no system is 100% secure. We encourage you to use a strong, unique password and enable two-factor authentication when available.`,
  },
  {
    title: '7. Your Rights',
    body: `Depending on your location, you may have the right to: access the personal information we hold about you; correct inaccurate information; request deletion of your information ("right to be forgotten"); object to or restrict certain processing; receive your data in a portable format; and withdraw consent where processing is based on consent. To exercise any of these rights, email privacy@spectrumconnect.co. We will respond within 30 days.`,
  },
  {
    title: '8. Children\'s Privacy',
    body: `Spectrum Connect is not directed at children under 18. We do not knowingly collect personal information from anyone under 18. If you believe a minor has created an account, please contact us immediately and we will delete the account and associated data.`,
  },
  {
    title: '9. International Transfers',
    body: `Spectrum Connect is based in the United States. If you access the Platform from outside the US, your information may be transferred to and processed in the US, where data protection laws may differ from those in your country. By using the Platform, you consent to this transfer. Where required, we implement appropriate safeguards such as standard contractual clauses.`,
  },
  {
    title: '10. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of material changes by email or by a prominent notice on the Platform at least 14 days before changes take effect. Continued use of the Platform after changes become effective constitutes acceptance of the revised policy.`,
  },
  {
    title: '11. Contact Us',
    body: `If you have questions, concerns, or requests regarding this Privacy Policy, contact our Data Privacy team at: privacy@spectrumconnect.co, or by post at: Spectrum Connect, Inc., Data Privacy Officer, 340 Pine Street, Suite 800, San Francisco, CA 94104, United States.`,
  },
];

export default function PrivacyPage() {
  return (
    <div style={{ background: '#fff', color: '#1f2937', fontFamily: "'Inter',system-ui,sans-serif" }}>
      <Nav />

      {/* Header */}
      <section style={{ borderBottom: '1px solid #eef0f3', padding: '60px 24px 40px', background: '#f9fafb' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#195ad7', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Legal</p>
          <h1 style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.025em', margin: '0 0 14px', color: '#111827' }}>Privacy Policy</h1>
          <p style={{ fontSize: 15, color: '#6b7280', margin: 0 }}>Last updated: May 1, 2026 · Effective: May 1, 2026</p>
        </div>
      </section>

      {/* Body */}
      <section style={{ padding: '60px 24px 80px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 36 }}>
          <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.75, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '16px 20px' }}>
            <strong>The short version:</strong> We collect what we need to run the platform, we don&apos;t sell your data, and you can ask us to delete it at any time.
          </p>

          {sections.map(s => (
            <div key={s.title}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>{s.title}</h2>
              <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.75, margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
