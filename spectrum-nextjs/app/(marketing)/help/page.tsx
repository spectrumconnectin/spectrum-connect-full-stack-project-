import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Help & FAQ — Spectrum Connect',
  description: 'Find answers to common questions about Spectrum Connect.',
};

const sections = [
  {
    title: 'Getting Started',
    icon: 'fa-rocket',
    color: 'bg-blue-100 text-cobalt',
    faqs: [
      { q: 'What is Spectrum Connect?', a: 'Spectrum Connect is a creative marketplace that connects freelance creators — designers, videographers, illustrators, and more — with clients who need their expertise. We use AI-powered matching to pair the right people for every project.' },
      { q: 'Is it free to join?', a: 'Yes! Creating an account is completely free for both creators and clients. We only charge a small platform fee (12% split between both parties) when a project is successfully completed.' },
      { q: 'How do I create an account?', a: 'Click "Get Started" on the homepage, choose whether you\'re a Creator or Client, fill in your basic details, and follow the onboarding steps. The whole process takes less than 5 minutes.' },
      { q: 'Can I use Spectrum as both a creator and a client?', a: 'Absolutely. You can switch between Creator and Client mode from the navigation menu at any time. Your profile, earnings, and projects are all tracked separately for each role.' },
    ],
  },
  {
    title: 'For Creators',
    icon: 'fa-paintbrush',
    color: 'bg-purple-100 text-purple-600',
    faqs: [
      { q: 'How does Smart Connect work?', a: 'Smart Connect uses your skills, experience, portfolio, and availability to automatically surface projects that are a great fit for you. The more complete your profile, the better your matches.' },
      { q: 'How do I get paid?', a: 'Payments are held in escrow by Spectrum until the client approves your milestone. Once approved, funds transfer to your Spectrum wallet. You can withdraw to your bank account at any time — withdrawals typically settle within 2–3 business days.' },
      { q: 'What is the platform fee for creators?', a: 'Creators pay 8% of the project value. So on a $1,000 project, you keep $920. The client also pays 4% on their end, making the total platform fee 12%.' },
      { q: 'What is the Verification Badge?', a: 'The Verified badge signals to clients that your identity and professional credentials have been reviewed by the Spectrum team. It\'s a one-time $20 fee and the badge is permanent on your profile.' },
    ],
  },
  {
    title: 'For Clients',
    icon: 'fa-briefcase',
    color: 'bg-green-100 text-green-600',
    faqs: [
      { q: 'How do I post a project?', a: 'Go to Post a Project from your dashboard, describe what you need, set a budget and timeline, and choose whether to accept applications or use Smart Connect to let the AI surface the best matches for you.' },
      { q: 'How do milestone payments work?', a: 'When you fund a milestone, the money goes into secure escrow — not directly to the creator. Once the creator delivers the work, you review it and choose to release the funds. If the work isn\'t satisfactory, you can request revisions or open a dispute.' },
      { q: 'What happens if I\'m not happy with the work?', a: 'You have several options: request a revision (most creators include 2–3 rounds), negotiate a partial refund, or open a formal dispute. Spectrum\'s dispute team will review the case and mediate a fair resolution for both sides.' },
      { q: 'What is the platform fee for clients?', a: 'Clients pay 4% of the project value. On a $1,000 project, you pay $1,040 in total. This fee covers escrow protection, dispute resolution, and platform maintenance.' },
    ],
  },
  {
    title: 'Payments & Billing',
    icon: 'fa-wallet',
    color: 'bg-amber-100 text-amber-600',
    faqs: [
      { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards (Visa, Mastercard, American Express), as well as bank transfers for larger projects. More payment options are coming soon.' },
      { q: 'Is my payment information secure?', a: 'Yes. All payment information is encrypted with 256-bit SSL and processed through our payment partner. Spectrum never stores raw card numbers on our servers.' },
      { q: 'Can I get a refund?', a: 'Escrowed funds that have not yet been released to a creator can be returned through the dispute process. Released funds are generally non-refundable, but our team will always review extenuating circumstances.' },
      { q: 'How do subscription upgrades work?', a: 'Pro Plan subscriptions are billed monthly and can be cancelled any time from your Settings page. Profile Boosts and Verification Badges are one-time charges with no recurring billing.' },
    ],
  },
  {
    title: 'Disputes & Safety',
    icon: 'fa-shield-halved',
    color: 'bg-red-100 text-red-600',
    faqs: [
      { q: 'How do I open a dispute?', a: 'Go to your Disputes page (in your dashboard) and click "New Dispute". Describe the issue, attach any relevant evidence, and submit. Our team aims to respond within 24–48 business hours.' },
      { q: 'How long does a dispute take to resolve?', a: 'Most disputes are resolved within 5–10 business days. Complex cases may take longer. Both parties are kept informed at every step.' },
      { q: 'What counts as a violation of community guidelines?', a: 'Asking for off-platform payments, fake reviews, harassment, sharing work without permission, and misrepresenting your skills are all violations that can result in account suspension.' },
      { q: 'How do I report a user?', a: 'Use the "..." menu on any profile or message thread to report a user. All reports are reviewed by our trust & safety team within 48 hours.' },
    ],
  },
];

export default function HelpPage() {
  return (
    <div style={{ background: '#fff', color: '#1f2937', fontFamily: "'Inter',system-ui,sans-serif" }}>
      <Nav />

      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg,#195ad7,#4178e7)', color: '#fff', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
            <i className="fa-solid fa-circle-question text-3xl"></i>
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.025em', margin: '0 0 16px', lineHeight: 1.05 }}>Help & FAQ</h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)', lineHeight: 1.55, margin: 0 }}>Everything you need to know about Spectrum Connect.</p>
        </div>
      </section>

      {/* FAQ sections */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
            {sections.map(section => (
              <div key={section.title}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                  <div className={`${section.color}`} style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <i className={`fa-solid ${section.icon} text-lg`}></i>
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>{section.title}</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {section.faqs.map((faq, i) => (
                    <details key={i} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff', borderRadius: 14, border: '1px solid #eef0f3', overflow: 'hidden' }}>
                      <summary style={{ padding: '18px 24px', fontWeight: 600, fontSize: 15, color: '#111827', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {faq.q}
                        <i className="fa-solid fa-chevron-down" style={{ color: '#9ca3af', fontSize: 12, flexShrink: 0, marginLeft: 12 }}></i>
                      </summary>
                      <div style={{ padding: '0 24px 20px', fontSize: 14, color: '#4b5563', lineHeight: 1.7 }}>{faq.a}</div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section style={{ background: '#f9fafb', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Still have questions?</h2>
          <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 28, lineHeight: 1.6 }}>Our support team is available Monday–Friday, 9am–6pm EST. We typically reply within a few hours.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="mailto:support@spectrumconnect.co" style={{ padding: '12px 24px', background: '#195ad7', color: '#fff', borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              <i className="fa-solid fa-envelope mr-2"></i>Email Support
            </a>
            <a href="#" style={{ padding: '12px 24px', background: '#fff', color: '#195ad7', border: '1px solid #195ad7', borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              <i className="fa-solid fa-comments mr-2"></i>Live Chat
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
