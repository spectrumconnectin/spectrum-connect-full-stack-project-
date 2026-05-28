import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Avatar from '@/components/Avatar';
import Link from 'next/link';
import type { Metadata } from 'next';
import MarketingEffects from '@/components/MarketingEffects';
import PageTransition from '@/components/PageTransition';

export const metadata: Metadata = {
  title: 'Spectrum Connect — Creative Marketplace',
  description: 'Connect with talented creators, build amazing teams, and bring your projects to life with AI-powered matching.',
};

const Ic = {
  Check: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>,
  Star: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1L7.3 14 2.5 9.5l6.6-.9L12 2.5z"/></svg>,
  Bolt: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>,
  Shield: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>,
  Users: () => <svg viewBox="0 0 1024 1024" width="22" height="22" fill="currentColor"><path d="M764.077495 365.4687c25.787576-28.703601 41.628106-66.514662 41.628106-108.047547 0-89.337066-72.67538-162.023709-162.023709-162.02371S481.658182 168.084087 481.658182 257.421153h45.226039c0-64.405459 52.403475-116.797671 116.797671-116.797671s116.797671 52.392212 116.79767 116.797671-52.403475 116.797671-116.79767 116.79767c-20.647671 0-40.964628-5.4655-58.741325-15.822099l-22.745613 39.086822c24.666421 14.365111 52.844769 21.961316 81.486938 21.961316 31.034988 0 59.955653-8.924184 84.62105-24.116595 2.73275 4.021822 144.402643 55.220183 154.273921 292.470796 0.507847 12.15659 10.511207 21.674628 22.568481 21.674628 0.330715 0 0.639928-0.011263 0.971667-0.022526 12.477067-0.51911 22.171213-11.052842 21.641864-23.529908-9.692098-233.333227-126.929016-303.970051-163.68138-320.452557z"/><path d="M541.966052 518.12181c29.268786-33.91313 47.104868-77.952485 47.104868-126.15803 0-106.683731-86.809093-193.481562-193.492825-193.481562S202.107796 285.279025 202.107796 391.962756c0 48.204521 17.828915 92.240805 47.090534 126.153935-51.365255 30.577311-153.310445 121.144064-153.310445 358.758155 0 12.488329 10.113939 22.613531 22.613531 22.613531s22.613531-10.125202 22.613531-22.613531c0-244.454669 113.552978-312.788776 143.593774-326.583583 31.432256 22.083159 69.622154 35.163294 110.869374 35.163294 41.246196 0 79.440191-13.080135 110.876542-35.163294 30.045915 13.80607 143.609132 82.134033 143.609132 326.583583 0 12.488329 10.113939 22.613531 22.613531 22.613531 12.498568 0 22.613531-10.125202 22.613531-22.613531-0.001024-237.6059-101.951333-328.172653-153.324779-358.753036zM247.333835 391.962756c0-81.752124 66.492137-148.255523 148.24426-148.255523s148.265762 66.5034 148.265762 148.255523-66.514662 148.265762-148.265762 148.265762-148.244261-66.513638-148.24426-148.265762z"/></svg>,
  Lock: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
  Sparkle: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z"/><path d="M5 18l1 2.5L8 21l-2 1-1-2.5L3 18l2-1z"/><path d="M18 2l1 2.5L21 5l-2 1-1-2.5L16 2l2-1z"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  Chart: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M8 17l4-8 4 4 3-6"/></svg>,
};

function StarRow({ n = 5 }: { n?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, color: '#f59e0b' }}>
      {Array.from({ length: n }).map((_, i) => <Ic.Star key={i} />)}
    </span>
  );
}

const testimonials = [
  { name: 'Sarah Chen', role: 'Product Designer', quote: 'Found my perfect client within 48 hours. The AI matching is incredibly accurate — I only see projects that truly fit my skills.', rating: 5 },
  { name: 'Marcus Williams', role: 'Brand Strategist', quote: 'Smart Connect changed how I work. Instead of cold-pitching, clients come to me pre-matched. My acceptance rate tripled.', rating: 5 },
  { name: 'Elena Rodriguez', role: 'Video Director', quote: 'The escrow system gave me confidence to take on bigger projects. I know I\'ll get paid fairly, always.', rating: 5 },
];

const features = [
  { icon: 'Bolt', tile: 'tile-blue', title: 'AI Smart Connect', desc: 'Our matching engine learns your style and preferences to surface projects that fit perfectly — not just keyword matches.' },
  { icon: 'Shield', tile: 'tile-green', title: 'Verified & Trusted', desc: 'Every profile is identity-verified. See real work histories, track records, and authentic two-way reviews.' },
  { icon: 'Users', tile: 'tile-purple', title: 'Team Collaboration', desc: 'Build full creative teams, not just solo gigs. Assemble multi-skill crews and manage everyone in one workflow.' },
  { icon: 'Lock', tile: 'tile-orange', title: 'Escrow Payments', desc: 'Funds are held securely until milestones are approved. No more chasing invoices or worrying about non-payment.' },
];

export default function HomePage() {
  return (
    <PageTransition>
    <MarketingEffects />
    <div className="home" style={{ background: '#fff', color: '#1f2937', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Nav />

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #195ad7 0%, #2965df 45%, #5b3ae0 80%, #7c3aed 100%)',
        color: '#fff',
        padding: '100px 24px 120px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 30%, rgba(255,255,255,0.10), transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(255,255,255,0.07), transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto' }}>
          <div className="mk-reveal" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '6px 16px', fontSize: 13, fontWeight: 600, marginBottom: 28 }}>
            <span className="hero-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
            AI-Powered Creative Marketplace
          </div>
          <h1 className="mk-reveal" style={{ fontSize: 'clamp(40px, 7vw, 72px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 24px' }}>
            Where Creators<br />and Clients Connect
          </h1>
          <p className="mk-reveal" style={{ fontSize: 20, lineHeight: 1.55, color: 'rgba(255,255,255,0.9)', maxWidth: 620, margin: '0 auto 40px' }}>
            AI-powered matching. Verified talent. Secure payments. Build creative teams, manage projects, and collaborate — all in one place.
          </p>
          <div className="mk-reveal" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" className="btn btn-white btn-lg">Get Started Free</Link>
            <Link href="/how-it-works" className="btn btn-ghost-light btn-lg">See How It Works</Link>
          </div>
          <p style={{ marginTop: 20, fontSize: 13.5, color: 'rgba(255,255,255,0.7)' }}>Free to join · No credit card required · Start in minutes</p>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ background: '#f8fafc', borderBottom: '1px solid #eef0f3', padding: '40px 24px' }}>
        <div className="mk-stagger" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
          {[
            { v: '18,400+', l: 'Verified Creators' },
            { v: '5,200+', l: 'Projects Completed' },
            { v: '$4.2M+', l: 'Paid to Creators' },
            { v: '98%', l: 'Satisfaction Rate' },
          ].map(({ v, l }) => (
            <div key={l}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#111827', letterSpacing: '-0.025em', lineHeight: 1.1 }}>{v}</div>
              <div style={{ fontSize: 14, color: '#6b7280', marginTop: 6, fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '90px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mk-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', width: 54, height: 54, borderRadius: 14, background: 'linear-gradient(135deg,#195ad7,#4178e7)', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 22 }}>
              <Ic.Sparkle />
            </div>
            <h2 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.025em', color: '#111827', margin: '0 0 16px' }}>Everything You Need to Create</h2>
            <p style={{ fontSize: 17, color: '#6b7280', maxWidth: 580, margin: '0 auto', lineHeight: 1.6 }}>One platform, every tool — from finding work to getting paid.</p>
          </div>
          <div className="mk-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            {features.map(({ icon, tile, title, desc }) => {
              const I = Ic[icon as keyof typeof Ic];
              return (
                <div key={title} style={{ background: '#f9fafb', border: '1px solid #eef0f3', borderRadius: 18, padding: '32px 36px', display: 'flex', gap: 22, alignItems: 'flex-start' }}>
                  <div className={`tile ${tile}`} style={{ flex: 'none', width: 52, height: 52, borderRadius: 14 }}><I /></div>
                  <div>
                    <h3 style={{ fontSize: 19, fontWeight: 700, color: '#111827', margin: '0 0 10px', letterSpacing: '-0.01em' }}>{title}</h3>
                    <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.6, margin: 0 }}>{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: '#f0f4ff', padding: '90px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mk-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.025em', color: '#111827', margin: '0 0 16px' }}>Get Started in Three Steps</h2>
            <p style={{ fontSize: 17, color: '#6b7280', maxWidth: 540, margin: '0 auto', lineHeight: 1.6 }}>From signup to your first collaboration — it takes minutes, not weeks.</p>
          </div>
          <div className="mk-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28, position: 'relative' }}>
            {[
              { num: '01', tile: 'tile-blue', icon: 'Search', title: 'Create Your Profile', desc: 'Sign up, add your skills or project details, and let our AI build your match profile. Takes under 5 minutes.' },
              { num: '02', tile: 'tile-purple', icon: 'Bolt', title: 'Get Smart Matches', desc: 'Our AI surfaces the best creators or projects for you — no endless scrolling, no cold outreach.' },
              { num: '03', tile: 'tile-green', icon: 'Chart', title: 'Collaborate & Get Paid', desc: 'Work together with integrated chat, milestone tracking, and escrow payments built in.' },
            ].map(({ num, tile, icon, title, desc }, i) => {
              const I = Ic[icon as keyof typeof Ic];
              return (
                <div key={num} className="step-card" style={{ background: '#fff', border: '1px solid #e0e7ff', borderRadius: 20, padding: '36px 32px', textAlign: 'center', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#195ad7', color: '#fff', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{i + 1}</div>
                  <div className={`tile ${tile}`} style={{ margin: '20px auto 20px', width: 56, height: 56, borderRadius: 16 }}><I /></div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 12px', letterSpacing: '-0.01em' }}>{title}</h3>
                  <p style={{ fontSize: 14.5, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>{desc}</p>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Link href="/how-it-works" className="btn btn-primary btn-lg">See the Full Journey</Link>
          </div>
        </div>
      </section>

      {/* For creators + clients */}
      <section style={{ padding: '90px 24px', background: '#fff' }}>
        <div className="mk-stagger" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Creators */}
          <div style={{ background: 'linear-gradient(135deg, #eef4ff, #dbeafe)', border: '1px solid #bfdbfe', borderRadius: 24, padding: 40 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#195ad7', display: 'grid', placeItems: 'center', color: '#fff', marginBottom: 22 }}>
              <Ic.Sparkle />
            </div>
            <h3 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 14px', letterSpacing: '-0.015em' }}>For Creators</h3>
            <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.6, margin: '0 0 24px' }}>Stop hunting for work. Let Smart Connect bring the right projects to you, matched to your skills and availability.</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['AI-powered project matching', 'Verified client profiles', 'Milestone-based escrow payments', 'Portfolio showcase & reviews'].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14.5, color: '#1e40af' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#dbeafe', color: '#195ad7', display: 'grid', placeItems: 'center', flex: 'none', marginTop: 1 }}><Ic.Check /></span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn btn-primary">Join as a Creator</Link>
          </div>
          {/* Clients */}
          <div style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: '1px solid #a7f3d0', borderRadius: 24, padding: 40 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#10b981', display: 'grid', placeItems: 'center', color: '#fff', marginBottom: 22 }}>
              <Ic.Users />
            </div>
            <h3 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 14px', letterSpacing: '-0.015em' }}>For Clients</h3>
            <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.6, margin: '0 0 24px' }}>Find the right creative talent in minutes, not weeks. Post a project, review matches, and start collaborating immediately.</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Instant AI-matched creator recommendations', 'Verified portfolios and reviews', 'Secure escrow project payments', 'Integrated messaging & file sharing'].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14.5, color: '#065f46' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#d1fae5', color: '#059669', display: 'grid', placeItems: 'center', flex: 'none', marginTop: 1 }}><Ic.Check /></span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn" style={{ background: '#10b981', color: '#fff' }}>Post a Project</Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '90px 24px', background: '#f9fafb' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mk-reveal" style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.025em', color: '#111827', margin: '0 0 14px' }}>Loved by Thousands of Creators</h2>
            <p style={{ fontSize: 17, color: '#6b7280', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>Don&apos;t take our word for it.</p>
          </div>
          <div className="mk-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
            {testimonials.map(({ name, role, quote, rating }) => (
              <div key={name} className="testi-card" style={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: 20, padding: 32, boxShadow: '0 4px 16px rgba(15,23,42,0.05)', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <StarRow n={rating} />
                <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.65, margin: 0, flex: 1 }}>&ldquo;{quote}&rdquo;</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={name} size={44} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{name}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{
        background: 'linear-gradient(135deg, #195ad7 0%, #2965df 50%, #5b3ae0 100%)',
        color: '#fff',
        padding: '100px 24px',
        textAlign: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        <div className="mk-reveal" style={{ maxWidth: 700, margin: '0 auto', position: 'relative' }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)', display: 'grid', placeItems: 'center', margin: '0 auto 24px' }}>
            <Ic.Bolt />
          </div>
          <h2 style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 18px', lineHeight: 1.1 }}>Start Creating Together</h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.55 }}>Join 18,000+ creators and clients already building great work on Spectrum Connect.</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
            <Link href="/signup" className="btn btn-white btn-lg">Get Started Free</Link>
            <Link href="/how-it-works" className="btn btn-ghost-light btn-lg">Learn More</Link>
          </div>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)' }}>Free to join · No credit card required</p>
        </div>
      </section>

      <Footer />
    </div>
    </PageTransition>
  );
}
