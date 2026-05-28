import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Avatar from '@/components/Avatar';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Journey — How It Works — Spectrum Connect',
  description: 'A step-by-step walkthrough of how Spectrum Connect works for creators and clients.',
};

const Ic = {
  Check: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>,
  Bolt: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>,
  User: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  Chat: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12c0 4.4-4 8-9 8a10 10 0 0 1-3-.5L3 21l1.5-5A8 8 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8z"/></svg>,
  Lock: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
  Star: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1L7.3 14 2.5 9.5l6.6-.9L12 2.5z"/></svg>,
};

function MockCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 22, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', border: '1px solid #eef0f3', ...style }}>
      {children}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13.5 }}>
      <span style={{ color: '#374151' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || '#111827' }}>{value}</span>
    </div>
  );
}

const steps = [
  {
    num: '01',
    tile: 'tile-blue',
    icon: 'User',
    title: 'Create Your Profile',
    desc: 'Whether you\'re a creator or a client, setting up your profile takes under 5 minutes. Tell us about your skills, your work style, and what you\'re looking for.',
    bullets: ['Identity verification included', 'Portfolio upload with showcase tools', 'Skill tagging and expertise levels', 'Availability calendar sync'],
    mockBg: 'linear-gradient(140deg,#eff6ff,#fff)',
    mock: (
      <MockCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Avatar name="Maya Chen" size={48} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Maya Chen</div>
            <div style={{ fontSize: 12.5, color: '#6b7280' }}>Senior UI/UX Designer · Verified ✓</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {['Figma', 'UX Research', 'Prototyping', 'Design Systems'].map(s => (
            <span key={s} style={{ fontSize: 11.5, padding: '3px 9px', background: 'rgba(25,90,215,0.08)', color: '#103a8c', borderRadius: 999, fontWeight: 500 }}>{s}</span>
          ))}
        </div>
        <Row label="Projects Completed" value="42" />
        <Row label="Success Rate" value="98%" color="#059669" />
        <Row label="Response Time" value="< 2 hrs" />
      </MockCard>
    ),
    reverse: false,
  },
  {
    num: '02',
    tile: 'tile-purple',
    icon: 'Search',
    title: 'Smart Connect Finds Your Matches',
    desc: 'Our AI immediately starts matching you with relevant projects or creators. The more you interact, the smarter it gets.',
    bullets: ['AI analyzes 50+ compatibility signals', 'Live matches refresh daily', 'Match score breakdown for transparency', 'Save and filter matches easily'],
    mockBg: 'linear-gradient(140deg,#f5f3ff,#fff)',
    mock: (
      <MockCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, fontWeight: 600, fontSize: 14 }}>
          <span>Smart Match Found</span>
          <span style={{ background: '#10b981', color: '#fff', padding: '3px 10px', borderRadius: 999, fontSize: 11.5 }}>97% Match</span>
        </div>
        {[['Skills Match', '98%', '#f5a623'], ['Available', '100%', '#195ad7'], ['Style Fit', '92%', '#10b981']].map(([l, v, c]) => (
          <div key={l as string} style={{ background: '#f9fafb', padding: '10px 14px', borderRadius: 10, border: '1px solid #eef0f3', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: '#6b7280' }}>{l as string}</span>
            <span style={{ fontWeight: 700, color: c as string }}>{v as string}</span>
          </div>
        ))}
      </MockCard>
    ),
    reverse: true,
  },
  {
    num: '03',
    tile: 'tile-cyan',
    icon: 'Chat',
    title: 'Connect and Collaborate',
    desc: 'Once matched, you have all the tools to kick off a project — built-in chat, shared files, milestone boards, and task tracking.',
    bullets: ['Integrated messaging with file sharing', 'Project milestone & task board', 'Video call links with one click', 'Activity feed for full visibility'],
    mockBg: 'linear-gradient(140deg,#ecfeff,#fff)',
    mock: (
      <MockCard>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Brand Video Project</div>
        {[
          { label: '✓ Brief Approved', color: '#059669', status: '2 days ago' },
          { label: '✓ Filming Complete', color: '#059669', status: '1 day ago' },
          { label: '⟳ Editing in Progress', color: '#195ad7', status: 'Active' },
          { label: '○ Final Review', color: '#9ca3af', status: 'Upcoming' },
        ].map(({ label, color, status }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
            <span style={{ color }}>{label}</span>
            <span style={{ color: '#9ca3af', fontSize: 12 }}>{status}</span>
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
            <span>Progress</span><span style={{ color: '#195ad7', fontWeight: 600 }}>65%</span>
          </div>
          <div style={{ height: 6, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '65%', background: 'linear-gradient(90deg,#195ad7,#4178e7)', borderRadius: 999 }} />
          </div>
        </div>
      </MockCard>
    ),
    reverse: false,
  },
  {
    num: '04',
    tile: 'tile-green',
    icon: 'Lock',
    title: 'Secure Milestone Payments',
    desc: 'Funds are held in escrow before work begins and released as milestones are approved. Both parties are always protected.',
    bullets: ['Escrow holds funds at project start', 'Client approves each milestone', 'Automatic release after 7-day window', 'Dispute resolution if needed'],
    mockBg: 'linear-gradient(140deg,#ecfdf5,#fff)',
    mock: (
      <MockCard>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#d1fae5', color: '#059669', display: 'grid', placeItems: 'center', margin: '0 auto 10px' }}><Ic.Check /></div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Milestone Approved</div>
        </div>
        <Row label="Milestone Value" value="$1,400" />
        <Row label="Platform Fee (8%)" value="−$112" />
        <Row label="You Receive" value="$1,288" color="#059669" />
        <button style={{ marginTop: 14, width: '100%', padding: '12px', background: '#195ad7', color: '#fff', border: 0, borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>View Payment</button>
      </MockCard>
    ),
    reverse: true,
  },
  {
    num: '05',
    tile: 'tile-orange',
    icon: 'Star',
    title: 'Review and Grow',
    desc: 'After every project, both parties leave reviews. Your track record builds your reputation and unlocks better opportunities.',
    bullets: ['Two-way review system', 'Verified outcomes only', 'Portfolio automatically updated', 'Reviews boost match priority'],
    mockBg: 'linear-gradient(140deg,#fff7ed,#fff)',
    mock: (
      <MockCard>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Leave a Review</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <svg key={n} viewBox="0 0 24 24" width="28" height="28" fill="#f59e0b"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1L7.3 14 2.5 9.5l6.6-.9L12 2.5z"/></svg>
          ))}
        </div>
        <textarea style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px', fontSize: 13, color: '#374151', resize: 'none', height: 72 }} defaultValue="Maya's work exceeded expectations — fast, creative, and easy to work with." />
        <button style={{ marginTop: 10, width: '100%', padding: '10px', background: '#195ad7', color: '#fff', border: 0, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Submit Review</button>
      </MockCard>
    ),
    reverse: false,
  },
];

export default function FlowStepsPage() {
  return (
    <div className="flow">
      <Nav />

      <section className="flow-hero">
        <h1>The Journey, Step by Step</h1>
        <p>Everything that happens from signup to your first completed project — made transparent, so there are no surprises.</p>
      </section>

      <div className="flow-intro">
        <h2>Five Steps to Great Work</h2>
        <p>Every successful Spectrum Connect collaboration follows the same five stages, with trust and clarity built into each one.</p>
      </div>

      <div className="flow-steps">
        {steps.map(({ num, tile, icon, title, desc, bullets, mockBg, mock, reverse }) => {
          const I = Ic[icon as keyof typeof Ic];
          return (
            <div key={num} className={`flow-step${reverse ? ' reverse' : ''}`}>
              <div>
                <div className={`tile ${tile}`} style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 20 }}><I /></div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Step {num}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
                <ul>
                  {bullets.map(b => (
                    <li key={b}>
                      <span className="chk"><Ic.Check /></span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ background: mockBg, padding: 24, borderRadius: 20 }}>
                {mock}
              </div>
            </div>
          );
        })}
      </div>

      <section className="flow-diff">
        <h2>What Makes This Different</h2>
        <div className="sub">Most platforms stop at the transaction. We optimize every step for trust, fairness, and real outcomes.</div>
        <div className="diff-grid">
          {[
            { tile: 'tile-blue', icon: 'Search', title: 'AI-First Matching', desc: 'No endless browsing. Our algorithm does the heavy lifting so every connection starts with high compatibility.' },
            { tile: 'tile-green', icon: 'Lock', title: 'Money Is Always Safe', desc: 'Escrow on every project. Funds never leave without approval. Disputes handled fairly and fast.' },
            { tile: 'tile-orange', icon: 'Star', title: 'Reputation Is Real', desc: 'Verified two-way reviews mean profiles reflect genuine performance — no gaming, no fake stars.' },
          ].map(({ tile, icon, title, desc }) => {
            const I = Ic[icon as keyof typeof Ic];
            return (
              <div key={title} className="diff-card">
                <div className={`ic ${tile}`}><I /></div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flow-final">
        <h2>Ready to Start Your Journey?</h2>
        <p>Join thousands of creators and clients already building great work on Spectrum Connect.</p>
        <div className="btns">
          <Link href="/signup" className="btn btn-white btn-lg">Get Started Free</Link>
          <Link href="/how-it-works" className="btn btn-ghost-light btn-lg">Full How It Works</Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
