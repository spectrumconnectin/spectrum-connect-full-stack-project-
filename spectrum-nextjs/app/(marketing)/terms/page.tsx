import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Terms of Service — Spectrum Connect',
  description: 'Read the Spectrum Connect Terms of Service.',
};

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using Spectrum Connect ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, you may not use the Platform. Spectrum Connect reserves the right to update these Terms at any time. Continued use of the Platform following any changes constitutes acceptance of those changes.`,
  },
  {
    title: '2. Eligibility',
    body: `You must be at least 18 years old to use Spectrum Connect. By creating an account, you represent and warrant that you are at least 18 years of age, have the legal capacity to enter into a binding agreement, and are not prohibited from using the Platform under applicable law.`,
  },
  {
    title: '3. User Accounts',
    body: `You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to notify Spectrum Connect immediately of any unauthorized use of your account. Spectrum Connect will not be liable for any loss or damage arising from your failure to protect your account credentials. Each person may only maintain one creator account and one client account.`,
  },
  {
    title: '4. Platform Services',
    body: `Spectrum Connect provides a marketplace that connects freelance creators with clients seeking creative services. The Platform facilitates introductions, project management, and payments, but is not a party to any contract between creators and clients. All contracts for services are directly between creators and clients. Spectrum Connect does not guarantee the quality, timing, or outcome of any project.`,
  },
  {
    title: '5. Fees and Payments',
    body: `Spectrum Connect charges a platform fee of 8% to creators and 4% to clients on completed projects, for a combined total of 12%. For projects under $20, the total fee is capped at $2. Fees are non-refundable unless required by applicable law or as determined through the dispute resolution process. Payments are processed through our secure escrow system and disbursed to creators upon milestone approval by the client.`,
  },
  {
    title: '6. Escrow and Milestone Releases',
    body: `Client funds are held in escrow by Spectrum Connect upon project commencement. Funds are released to creators only upon explicit approval by the client. Clients have 5 business days to review delivered work and either approve payment or request revisions. Failure to take action within this window may result in automatic release as determined by project terms. Clients are solely responsible for reviewing deliverables before releasing escrow funds. Released funds cannot be clawed back except through the formal dispute process.`,
  },
  {
    title: '7. Intellectual Property',
    body: `Upon full payment for a project, creators assign all intellectual property rights in the deliverables to the client, unless otherwise agreed in writing. Creators retain the right to display completed work in their portfolio unless the client requests confidentiality in writing. Spectrum Connect does not claim ownership of any content created on the Platform. By posting content on Spectrum Connect (e.g. portfolio work, profile information), you grant Spectrum Connect a non-exclusive licence to display such content for platform purposes.`,
  },
  {
    title: '8. Prohibited Conduct',
    body: `Users may not: circumvent the Platform to pay or receive payments outside of Spectrum Connect; post false, misleading, or defamatory content; harass, abuse, or threaten other users; attempt to gain unauthorized access to any part of the Platform; use the Platform to distribute malware or engage in fraudulent activity; create multiple accounts to manipulate the review system; or violate any applicable law or regulation. Violations may result in immediate account suspension or termination.`,
  },
  {
    title: '9. Dispute Resolution',
    body: `Spectrum Connect provides a dispute resolution process for project-related disagreements. Either party may open a dispute within 30 days of a milestone delivery. Spectrum Connect's dispute team will review the case and make a binding determination. Spectrum Connect's decisions are final and binding within the Platform, though nothing in these Terms limits your rights under applicable consumer protection law.`,
  },
  {
    title: '10. Limitation of Liability',
    body: `To the maximum extent permitted by applicable law, Spectrum Connect shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill. Spectrum Connect's total liability to you for any claim shall not exceed the greater of (a) the amount of platform fees paid by you in the 12 months preceding the claim, or (b) $100.`,
  },
  {
    title: '11. Termination',
    body: `Either party may terminate their Spectrum Connect account at any time. Upon termination, any pending escrow funds will be resolved according to the dispute resolution process if contested. Obligations that accrued prior to termination (including payment obligations) survive termination of these Terms. Spectrum Connect may terminate or suspend any account that violates these Terms without prior notice.`,
  },
  {
    title: '12. Governing Law',
    body: `These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to conflict of law principles. You agree to submit to the personal jurisdiction of the courts located in Delaware for the resolution of any disputes. This does not affect any mandatory consumer protection rights you may have under the laws of your country of residence.`,
  },
  {
    title: '13. Contact',
    body: `If you have questions about these Terms, please contact us at legal@spectrumconnect.co or write to: Spectrum Connect, Inc., Legal Department, 340 Pine Street, Suite 800, San Francisco, CA 94104.`,
  },
];

export default function TermsPage() {
  return (
    <div style={{ background: '#fff', color: '#1f2937', fontFamily: "'Inter',system-ui,sans-serif" }}>
      <Nav />

      {/* Header */}
      <section style={{ borderBottom: '1px solid #eef0f3', padding: '60px 24px 40px', background: '#f9fafb' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#195ad7', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Legal</p>
          <h1 style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.025em', margin: '0 0 14px', color: '#111827' }}>Terms of Service</h1>
          <p style={{ fontSize: 15, color: '#6b7280', margin: 0 }}>Last updated: May 1, 2026 · Effective: May 1, 2026</p>
        </div>
      </section>

      {/* Body */}
      <section style={{ padding: '60px 24px 80px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 36 }}>
          <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.75, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 12, padding: '16px 20px' }}>
            <strong>Summary:</strong> Use our platform fairly, pay through the platform, and treat other users with respect. Full details below.
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
