import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import type { Metadata } from 'next';
import MarketingEffects from '@/components/MarketingEffects';
import PageTransition from '@/components/PageTransition';

export const metadata: Metadata = {
  title: 'Spectrum Connect — Creative Marketplace',
  description: 'Find trusted creators, build amazing teams, and work better together with AI-powered matching.',
};

/* ─────────────────────────────────────────────────────────────
   Inline monochrome SVG icon set (inherits currentColor)
   ───────────────────────────────────────────────────────────── */
type IconProps = { size?: number };
const sw = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const Icon = {
  Target: ({ size = 26 }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} {...sw}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>,
  BadgeCheck: ({ size = 26 }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} {...sw}><path d="M12 2l2.4 1.8 3-.2 1 2.8 2.6 1.5-.8 2.9.8 2.9-2.6 1.5-1 2.8-3-.2L12 22l-2.4-1.8-3 .2-1-2.8L3 16.3l.8-2.9L3 10.5l2.6-1.5 1-2.8 3 .2z"/><path d="M9 12l2 2 4-4"/></svg>,
  Bolt: ({ size = 26 }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} {...sw}><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>,
  Shield: ({ size = 26 }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} {...sw}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>,
  Chat: ({ size = 26 }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} {...sw}><path d="M21 11.5a8.38 8.38 0 0 1-9 8.32 8.4 8.4 0 0 1-3.8-.9L3 20l1.1-4.2A8.38 8.38 0 0 1 12 3a8.38 8.38 0 0 1 9 8.5z"/></svg>,
  Rocket: ({ size = 26 }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} {...sw}><path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2 0-2.8a2 2 0 0 0-3 0z"/><path d="M12 15l-3-3a11 11 0 0 1 2-6c2-3 5-4 7-4 0 2-1 5-4 7a11 11 0 0 1-6 2z"/><path d="M9 12H5l3-4h3"/><path d="M12 15v4l4-3v-3"/></svg>,
  Palette: ({ size = 26 }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} {...sw}><path d="M12 2a10 10 0 1 0 0 20c1.7 0 2-1.5 1-2.5s-.8-2.5 1-2.5h2.5A4.5 4.5 0 0 0 22 12 10 10 0 0 0 12 2z"/><circle cx="7.5" cy="10.5" r="1" fill="currentColor"/><circle cx="12" cy="7.5" r="1" fill="currentColor"/><circle cx="16.5" cy="10.5" r="1" fill="currentColor"/></svg>,
  Users: ({ size = 26 }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} {...sw}><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Lock: ({ size = 26 }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} {...sw}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
  Dollar: ({ size = 26 }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} {...sw}><path d="M12 2v20"/><path d="M16 6.5C16 4.6 14.2 3.5 12 3.5S8 4.6 8 6.5s1.8 2.8 4 3.2 4 1.3 4 3.3-1.8 3-4 3-4-1.1-4-3"/></svg>,
  Star: ({ size = 26 }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} {...sw}><path d="M12 3l2.9 6 6.1.9-4.5 4.3 1.1 6L12 17.8 6.4 20.2l1.1-6L3 9.9 9.1 9z"/></svg>,
  Cpu: ({ size = 26 }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} {...sw}><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 9h6v6H9z"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>,
  Handshake: ({ size = 26 }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} {...sw}><path d="M11 17l2 2a1.5 1.5 0 0 0 2-2"/><path d="M13 19l1.5 1.5a1.5 1.5 0 0 0 2-2l.5-.5"/><path d="M16 17a1.5 1.5 0 0 0 2-2l1-1"/><path d="M2 9l3-3 5 1 2-1 2 2-3 3-2-1"/><path d="M22 9l-3-3-3 1"/><path d="M2 9l4 8M22 9l-4 8"/></svg>,
  ArrowRight: ({ size = 16 }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} {...sw}><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  Check: ({ size = 16 }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} {...sw}><path d="M5 12l5 5L20 7"/></svg>,
};

/* ── Data ── */
const creators = [
  { name: 'Alex Rivera', role: 'Cinematographer', tags: ['ARRI', 'Short Film', 'Color'], rating: 4.9, reviews: 38, initials: 'AR', color: '#6366f1' },
  { name: 'Mia Johnson', role: 'Motion Designer', tags: ['After Effects', 'Branding', '3D'], rating: 5.0, reviews: 54, initials: 'MJ', color: '#ec4899' },
  { name: 'Sam Torres', role: 'Sound Designer', tags: ['Pro Tools', 'Music', 'Podcast'], rating: 4.8, reviews: 29, initials: 'ST', color: '#f59e0b' },
  { name: 'Priya Nair', role: 'Film Director', tags: ['Documentary', 'Narrative', 'Script'], rating: 4.9, reviews: 47, initials: 'PN', color: '#10b981' },
];

const testimonials = [
  { name: 'Sarah Chen', role: 'Product Designer', quote: 'Found my perfect client within 48 hours. The AI matching is incredibly accurate.', rating: 5, initials: 'SC', color: '#6366f1' },
  { name: 'Marcus Williams', role: 'Brand Strategist', quote: 'Smart Connect changed how I work. Clients come to me pre-matched. My acceptance rate tripled.', rating: 5, initials: 'MW', color: '#f59e0b' },
  { name: 'Elena Rodriguez', role: 'Video Director', quote: 'The escrow system gave me confidence to take on bigger projects. I always get paid fairly.', rating: 5, initials: 'ER', color: '#ec4899' },
  { name: 'James Kim', role: 'Photographer', quote: 'The verification process sets this apart. Every client I work with is legitimate and professional.', rating: 5, initials: 'JK', color: '#10b981' },
  { name: 'Aisha Patel', role: 'Copywriter', quote: 'As a freelancer, reliable payments were always my biggest stress. Spectrum solved that completely.', rating: 5, initials: 'AP', color: '#3b82f6' },
  { name: 'Tom Wright', role: 'Animator', quote: 'The team-building feature is next-level. I assembled a full creative crew for a major campaign in one day.', rating: 5, initials: 'TW', color: '#8b5cf6' },
];

function StarRating({ n = 5 }: { n?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, color: '#f59e0b' }}>
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function Avatar({ initials, color, size = 44 }: { initials: string; color: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.35, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function HomePage() {
  return (
    <PageTransition>
    <MarketingEffects />
    <div style={{ background: '#fff', color: '#1f2937', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Nav />

      {/* ═══ HERO ═══ */}
      <section style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 40%, #7c3aed 80%, #9333ea 100%)', color: '#fff', padding: '80px 24px 100px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 50%, rgba(139,92,246,0.35), transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div>
            <h1 className="mk-reveal" style={{ fontSize: 'clamp(34px, 5vw, 58px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 20px' }}>
              Find trusted creators.<br />Build amazing teams.<br />Work better together.
            </h1>
            <p className="mk-reveal" style={{ fontSize: 17, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', margin: '0 0 36px', maxWidth: 480 }}>
              A creative marketplace built on trust — verified creators, fair payments, and projects matched to your needs.
            </p>
            <div className="mk-reveal" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/signup" className="home-btn-primary" style={{ background: '#fff', color: '#1e3a8a', padding: '14px 28px', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Find Creators <Icon.ArrowRight />
              </Link>
              <Link href="/signup" className="home-btn-ghost" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '14px 28px', borderRadius: 12, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
                Post a Project
              </Link>
            </div>
            <p className="mk-reveal" style={{ marginTop: 18, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Free to join · No credit card required</p>
          </div>
          {/* Floating profile cards */}
          <div style={{ position: 'relative', minHeight: 320, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-end' }}>
            {[
              { name: 'Mia Johnson', role: 'Motion Designer', tags: ['After Effects', '3D', 'Branding'], initials: 'MJ', color: '#ec4899', rating: '5.0', float: 'home-float-a' },
              { name: 'Alex Rivera', role: 'Cinematographer', tags: ['ARRI', 'Color', 'Short Film'], initials: 'AR', color: '#6366f1', rating: '4.9', float: 'home-float-b' },
            ].map((c, i) => (
              <div key={c.name} className={c.float} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '18px 22px', width: 280, transform: i === 0 ? 'translateX(20px)' : 'translateX(-10px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Avatar initials={c.initials} color={c.color} size={42} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{c.role}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '4px 8px', fontSize: 13, fontWeight: 700 }}>
                    <span style={{ color: '#fbbf24', display: 'inline-flex' }}><Icon.Star size={13} /></span>{c.rating}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {c.tags.map(t => <span key={t} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 500 }}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHY CHOOSE US ═══ */}
      <section style={{ padding: '90px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mk-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.025em', color: '#111827', margin: '0 0 14px' }}>Why Creators &amp; Clients Choose Us</h2>
            <p style={{ fontSize: 16, color: '#6b7280', maxWidth: 540, margin: '0 auto', lineHeight: 1.6 }}>Discover verified talent, build real teams, and deliver projects with confidence and fairness.</p>
          </div>
          <div className="mk-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { Ic: Icon.Target, bg: '#eff6ff', bd: '#bfdbfe', fg: '#2563eb', title: 'Get matched with the right people', desc: 'Our AI matches creators and clients based on skills, style, and project fit — not just keywords.' },
              { Ic: Icon.BadgeCheck, bg: '#f0fdf4', bd: '#bbf7d0', fg: '#16a34a', title: 'Work with verified creators and clients', desc: 'Every profile is identity-verified. Real reviews, real work history, real trust.' },
              { Ic: Icon.Bolt, bg: '#faf5ff', bd: '#e9d5ff', fg: '#9333ea', title: 'Build full teams fast', desc: 'Assemble multi-skill creative crews for any project in hours, not weeks.' },
              { Ic: Icon.Shield, bg: '#fff7ed', bd: '#fed7aa', fg: '#ea580c', title: 'Fair milestones for everyone', desc: 'Milestone-based escrow protects both sides — funds release only when work is approved.' },
              { Ic: Icon.Chat, bg: '#f0f9ff', bd: '#bae6fd', fg: '#0284c7', title: 'Everything you need to manage work', desc: 'Integrated messaging, file sharing, task tracking, and payments all in one place.' },
              { Ic: Icon.Rocket, bg: '#fdf2f8', bd: '#fbcfe8', fg: '#db2777', title: 'Long-term value for every project', desc: 'Build lasting working relationships with your best creative partners through reputation and reviews.' },
            ].map(f => (
              <div key={f.title} className="home-card" style={{ background: f.bg, border: `1px solid ${f.bd}`, borderRadius: 20, padding: '28px 28px 24px' }}>
                <div style={{ color: f.fg, marginBottom: 14 }}><f.Ic /></div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 10px', lineHeight: 1.35 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DISCOVER CREATORS ═══ */}
      <section style={{ padding: '80px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mk-reveal" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', color: '#111827', margin: '0 0 10px' }}>Discover Talented Creators</h2>
              <p style={{ fontSize: 15, color: '#6b7280', margin: 0 }}>Browse verified profiles across every creative discipline.</p>
            </div>
            <Link href="/signup" className="home-link" style={{ color: '#2563eb', fontWeight: 600, fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              Browse all creators <Icon.ArrowRight size={14} />
            </Link>
          </div>
          <div className="mk-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {creators.map(c => (
              <div key={c.name} className="home-card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, padding: 24, boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <Avatar initials={c.initials} color={c.color} size={48} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{c.role}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {c.tags.map(t => <span key={t} style={{ background: '#f3f4f6', color: '#374151', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 500 }}>{t}</span>)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <StarRating />
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{c.rating} ({c.reviews})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BUILD TEAMS ═══ */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mk-reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', color: '#111827', margin: '0 0 12px' }}>Or Build Complete Teams</h2>
            <p style={{ fontSize: 15, color: '#6b7280', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>Pre-assembled teams ready for any project. Find a matched crew in one click.</p>
          </div>
          <div className="mk-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { label: 'Brand Launch', bg: 'linear-gradient(135deg,#f43f5e,#ec4899)', members: ['MJ','AR','PN'], roles: ['Designer','Director','Writer'], desc: 'Full brand identity, launch campaign & content production team.' },
              { label: 'Film Production', bg: 'linear-gradient(135deg,#2563eb,#7c3aed)', members: ['AR','ST','TW'], roles: ['Cinematographer','Sound','VFX'], desc: 'End-to-end production crew from pre-prod to final cut.' },
              { label: 'Digital Campaign', bg: 'linear-gradient(135deg,#059669,#0ea5e9)', members: ['MJ','SC','PN'], roles: ['Motion','Strategy','Director'], desc: 'Creative campaign team for social, video and digital assets.' },
            ].map(team => (
              <div key={team.label} className="home-card" style={{ borderRadius: 22, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}>
                <div style={{ background: team.bg, padding: '28px 28px 22px', color: '#fff' }}>
                  <div style={{ display: 'flex', marginBottom: 14 }}>
                    {team.members.map((m, i) => (
                      <div key={i} style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, marginLeft: i > 0 ? -10 : 0, color: '#fff' }}>{m}</div>
                    ))}
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>{team.label}</h3>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {team.roles.map(r => <span key={r} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 500 }}>{r}</span>)}
                  </div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: 'none', padding: '18px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.5, flex: 1, paddingRight: 12 }}>{team.desc}</p>
                  <Link href="/signup" style={{ background: '#111827', color: '#fff', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>View Team</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section style={{ padding: '90px 24px', background: '#f0f4ff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mk-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', color: '#111827', margin: '0 0 12px' }}>How It Works</h2>
            <p style={{ fontSize: 15, color: '#6b7280', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>Four simple steps to get your creative project moving.</p>
          </div>
          <div className="mk-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, position: 'relative' }}>
            {[
              { Ic: Icon.Palette, fg: '#2563eb', title: 'Create Team', desc: 'Set up your project brief and define the creative skills you need.' },
              { Ic: Icon.Bolt, fg: '#9333ea', title: 'Get Matched', desc: 'Our AI instantly surfaces the best creators matched to your project.' },
              { Ic: Icon.Users, fg: '#ec4899', title: 'Build Your Team', desc: 'Review profiles, chat with creators, and confirm your crew.' },
              { Ic: Icon.Rocket, fg: '#16a34a', title: 'Collaborate & Complete', desc: 'Work together with tools, milestones and secure payments built in.' },
            ].map((step, i) => (
              <div key={step.title} className="home-card" style={{ background: '#fff', border: '1px solid #c7d2fe', borderRadius: 20, padding: '30px 24px', textAlign: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#2563eb', color: '#fff', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, boxShadow: '0 2px 8px rgba(37,99,235,0.4)' }}>{i + 1}</div>
                {i < 3 && <div style={{ position: 'absolute', top: '50%', right: -12, color: '#93c5fd', zIndex: 1, transform: 'translateY(-50%)' }}><Icon.ArrowRight size={18} /></div>}
                <div style={{ color: step.fg, margin: '12px auto 14px', width: 'fit-content' }}><step.Ic size={32} /></div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>{step.title}</h3>
                <p style={{ fontSize: 13.5, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST & FAIRNESS ═══ */}
      <section style={{ padding: '90px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div className="mk-reveal-x" style={{ background: 'linear-gradient(135deg, #f8faff, #eff6ff)', border: '1px solid #bfdbfe', borderRadius: 24, padding: 36 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trust Score</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 56, fontWeight: 800, color: '#1e40af', lineHeight: 1 }}>94</span>
                <span style={{ fontSize: 22, color: '#93c5fd', fontWeight: 600 }}>/100</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#10b981', fontWeight: 600, marginTop: 4 }}><Icon.Check size={14} /> Verified &amp; Trusted</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Identity Verified', val: 100, color: '#10b981' },
                { label: 'Payment Methods', val: 100, color: '#10b981' },
                { label: 'Portfolio Quality', val: 88, color: '#2563eb' },
                { label: 'Response Rate', val: 96, color: '#2563eb' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                    <span style={{ color: '#374151', fontWeight: 500 }}>{item.label}</span>
                    <span style={{ color: item.color, fontWeight: 700 }}>{item.val}%</span>
                  </div>
                  <div style={{ background: '#e0e7ff', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                    <div className="home-bar" style={{ ['--bar-w' as string]: `${item.val}%`, background: item.color, borderRadius: 999, height: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mk-reveal-r">
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', color: '#111827', margin: '0 0 16px', lineHeight: 1.2 }}>Built on Trust &amp; Fairness</h2>
            <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.7, margin: '0 0 32px' }}>
              Every transaction, profile, and review on Spectrum is backed by a transparent trust system. We verify identities, protect payments, and let real work speak for itself.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { Ic: Icon.Lock, fg: '#2563eb', title: 'Identity Verification', desc: 'Every creator and client undergoes ID verification before going live.' },
                { Ic: Icon.Dollar, fg: '#16a34a', title: 'Transparent Fees', desc: 'Simple, flat fees. No hidden charges — ever.' },
                { Ic: Icon.Shield, fg: '#ea580c', title: 'Escrow Protection', desc: 'Funds are held safely and released only on milestone approval.' },
                { Ic: Icon.Star, fg: '#d97706', title: 'Smart Reviews', desc: 'Two-way verified reviews build an accurate reputation over time.' },
              ].map(item => (
                <li key={item.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{ color: item.fg, marginTop: 2, flexShrink: 0 }}><item.Ic size={22} /></span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 3 }}>{item.title}</div>
                    <div style={{ fontSize: 13.5, color: '#6b7280', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section style={{ padding: '90px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div className="mk-reveal" style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', color: '#111827', margin: '0 0 12px' }}>Simple, Transparent Pricing</h2>
            <p style={{ fontSize: 15, color: '#6b7280', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>No surprises. Pay only for what you use.</p>
          </div>
          <div className="mk-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, alignItems: 'start' }}>
            {[
              { name: 'Free to Join', price: 'Free', sub: 'forever', highlight: false, features: ['Create your profile', 'Browse all projects', 'Apply to 3 projects/month', 'Basic messaging'], cta: 'Get Started', href: '/signup' },
              { name: 'Pro Plan', price: '$15', sub: 'per month', highlight: true, features: ['Unlimited applications', 'Smart Connect AI matching', 'Priority profile placement', 'Advanced analytics', 'Escrow payments'], cta: 'Start Free Trial', href: '/signup' },
              { name: 'Certification', price: '$20', sub: 'one-time', highlight: false, features: ['Verified badge on profile', 'Skill challenge access', 'Trust score boost', 'Featured in search results'], cta: 'Get Certified', href: '/signup' },
            ].map(plan => (
              <div key={plan.name} className="home-card" style={{ background: plan.highlight ? 'linear-gradient(135deg,#1e3a8a,#2563eb)' : '#fff', border: plan.highlight ? '2px solid #2563eb' : '1px solid #e5e7eb', borderRadius: 22, padding: '32px 28px', color: plan.highlight ? '#fff' : '#111827', boxShadow: plan.highlight ? '0 12px 40px rgba(37,99,235,0.25)' : '0 2px 12px rgba(0,0,0,0.05)', position: 'relative' }}>
                {plan.highlight && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#f59e0b', color: '#fff', borderRadius: 999, padding: '4px 14px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
                <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.8, marginBottom: 8 }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em' }}>{plan.price}</span>
                  <span style={{ fontSize: 13, opacity: 0.7 }}>{plan.sub}</span>
                </div>
                <div style={{ height: 1, background: plan.highlight ? 'rgba(255,255,255,0.2)' : '#f3f4f6', margin: '20px 0' }} />
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                      <span style={{ color: plan.highlight ? '#86efac' : '#10b981', flexShrink: 0, display: 'inline-flex' }}><Icon.Check /></span>{f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} style={{ display: 'block', textAlign: 'center', background: plan.highlight ? '#fff' : '#2563eb', color: plan.highlight ? '#1e3a8a' : '#fff', padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>{plan.cta}</Link>
              </div>
            ))}
          </div>
          <div className="mk-reveal" style={{ marginTop: 28, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 16, padding: '18px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <span style={{ fontWeight: 700, color: '#1e40af', fontSize: 15 }}>Small Project? We&apos;ve Got You Covered</span>
              <p style={{ fontSize: 13, color: '#3b82f6', margin: '4px 0 0' }}>For projects under $5k, use our lightweight fixed-fee plan — no monthly subscription needed.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href="/signup" style={{ background: '#2563eb', color: '#fff', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Start Free</Link>
              <Link href="/pricing" style={{ border: '1px solid #bfdbfe', color: '#2563eb', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>See Pricing</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COMMUNITY SAYS ═══ */}
      <section style={{ padding: '90px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mk-reveal" style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', color: '#111827', margin: '0 0 12px' }}>What Our Community Says</h2>
            <p style={{ fontSize: 15, color: '#6b7280', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>Real experiences from creators and clients across the Spectrum network.</p>
          </div>
          <div className="mk-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {testimonials.map(t => (
              <div key={t.name} className="home-card" style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 20, padding: '26px 26px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <StarRating n={t.rating} />
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.65, margin: 0, flex: 1 }}>&ldquo;{t.quote}&rdquo;</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar initials={t.initials} color={t.color} size={38} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#111827' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COMMUNITY STATS ═══ */}
      <section style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #7c3aed 100%)', padding: '70px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 className="mk-reveal" style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', margin: '0 0 48px', letterSpacing: '-0.02em' }}>Join a Thriving Creative Community</h2>
          <div className="mk-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
            {[
              { v: '15K+', l: 'Active Creators' },
              { v: '12K+', l: 'Projects Posted' },
              { v: '8K+', l: 'Teams Formed' },
              { v: '6K+', l: 'Clients Hiring' },
            ].map(s => (
              <div key={s.l}>
                <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 8, fontWeight: 500 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ EVERYTHING IN ONE PLACE ═══ */}
      <section style={{ padding: '90px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mk-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', color: '#111827', margin: '0 0 12px' }}>Everything You Need in One Place</h2>
            <p style={{ fontSize: 15, color: '#6b7280', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>From discovery to delivery — every tool your creative workflow needs.</p>
          </div>
          <div className="mk-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
            {[
              { Ic: Icon.Cpu, hbg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', hbd: '#e0e7ff', tfg: '#1e40af', sfg: '#3b82f6', cfg: '#2563eb', title: 'Smart Matchmaking', sub: 'AI surfaces the right people instantly — no endless scrolling.', items: ['Skill & style matching', 'Availability detection', 'Budget alignment', 'Project history weighting'] },
              { Ic: Icon.Users, hbg: 'linear-gradient(135deg,#fdf4ff,#f3e8ff)', hbd: '#e9d5ff', tfg: '#6b21a8', sfg: '#9333ea', cfg: '#9333ea', title: 'Team Building Made Easy', sub: 'Assemble full creative crews with one brief, not ten DMs.', items: ['Role-based team templates', 'Crew workload balancing', 'Shared workspace & files', 'Team performance tracking'] },
              { Ic: Icon.Bolt, hbg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', hbd: '#bbf7d0', tfg: '#166534', sfg: '#16a34a', cfg: '#10b981', title: 'All-In-One Workflow', sub: 'Chat, files, milestones, and payments in one seamless place.', items: ['Integrated messaging', 'Milestone tracking', 'Secure escrow payments', 'Invoice & contract tools'] },
            ].map(panel => (
              <div key={panel.title} className="home-card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 22, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ background: panel.hbg, padding: '28px 28px 22px', borderBottom: `1px solid ${panel.hbd}` }}>
                  <div style={{ color: panel.cfg, marginBottom: 12 }}><panel.Ic size={28} /></div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: panel.tfg, margin: '0 0 8px' }}>{panel.title}</h3>
                  <p style={{ fontSize: 13.5, color: panel.sfg, margin: 0, lineHeight: 1.5 }}>{panel.sub}</p>
                </div>
                <div style={{ padding: '20px 28px' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {panel.items.map(f => (
                      <li key={f} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5, color: '#374151' }}>
                        <span style={{ color: panel.cfg, display: 'inline-flex' }}><Icon.Check /></span>{f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #7c3aed 100%)', color: '#fff', padding: '100px 24px', textAlign: 'center' }}>
        <div className="mk-reveal" style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', width: 72, height: 72, borderRadius: 20, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}><Icon.Handshake size={34} /></div>
          <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 18px', lineHeight: 1.1 }}>Ready to Work Better Together?</h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.85)', maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.6 }}>
            Join thousands of creators and clients already building great work on Spectrum Connect.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
            <Link href="/signup" className="home-btn-primary" style={{ background: '#fff', color: '#1e3a8a', padding: '15px 32px', borderRadius: 12, fontWeight: 700, fontSize: 16, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Get Started Free <Icon.ArrowRight />
            </Link>
            <Link href="/how-it-works" className="home-btn-ghost" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '15px 32px', borderRadius: 12, fontWeight: 600, fontSize: 16, textDecoration: 'none' }}>
              See How It Works
            </Link>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Free to join · No credit card required · Start in minutes</p>
        </div>
      </section>

      <Footer />
    </div>
    </PageTransition>
  );
}
