import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Avatar from '@/components/Avatar';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — Spectrum Connect',
  description: 'The story behind Spectrum Connect — why we built a better creative marketplace.',
};

const Ic = {
  Check: () => <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>,
  Bolt: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>,
  Shield: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>,
  Users: () => <svg viewBox="0 0 1024 1024" width="22" height="22" fill="currentColor"><path d="M764.077495 365.4687c25.787576-28.703601 41.628106-66.514662 41.628106-108.047547 0-89.337066-72.67538-162.023709-162.023709-162.02371S481.658182 168.084087 481.658182 257.421153h45.226039c0-64.405459 52.403475-116.797671 116.797671-116.797671s116.797671 52.392212 116.79767 116.797671-52.403475 116.797671-116.79767 116.79767c-20.647671 0-40.964628-5.4655-58.741325-15.822099l-22.745613 39.086822c24.666421 14.365111 52.844769 21.961316 81.486938 21.961316 31.034988 0 59.955653-8.924184 84.62105-24.116595 2.73275 4.021822 144.402643 55.220183 154.273921 292.470796 0.507847 12.15659 10.511207 21.674628 22.568481 21.674628 0.330715 0 0.639928-0.011263 0.971667-0.022526 12.477067-0.51911 22.171213-11.052842 21.641864-23.529908-9.692098-233.333227-126.929016-303.970051-163.68138-320.452557z"/><path d="M541.966052 518.12181c29.268786-33.91313 47.104868-77.952485 47.104868-126.15803 0-106.683731-86.809093-193.481562-193.492825-193.481562S202.107796 285.279025 202.107796 391.962756c0 48.204521 17.828915 92.240805 47.090534 126.153935-51.365255 30.577311-153.310445 121.144064-153.310445 358.758155 0 12.488329 10.113939 22.613531 22.613531 22.613531s22.613531-10.125202 22.613531-22.613531c0-244.454669 113.552978-312.788776 143.593774-326.583583 31.432256 22.083159 69.622154 35.163294 110.869374 35.163294 41.246196 0 79.440191-13.080135 110.876542-35.163294 30.045915 13.80607 143.609132 82.134033 143.609132 326.583583 0 12.488329 10.113939 22.613531 22.613531 22.613531 12.498568 0 22.613531-10.125202 22.613531-22.613531-0.001024-237.6059-101.951333-328.172653-153.324779-358.753036zM247.333835 391.962756c0-81.752124 66.492137-148.255523 148.24426-148.255523s148.265762 66.5034 148.265762 148.255523-66.514662 148.265762-148.265762 148.265762-148.244261-66.513638-148.24426-148.265762z"/></svg>,
  Heart: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Globe: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Scale: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M5 6h14"/><path d="M5 6l-3 6h6l-3-6zM19 6l-3 6h6l-3-6z"/></svg>,
  Rocket: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>,
};

export default function AboutPage() {
  return (
    <div className="about">
      <Nav />

      {/* Hero */}
      <section className="ab-hero">
        <div className="ic-tile">
          <Ic.Heart />
        </div>
        <h1>Built for Creators,<br/>Designed for Trust</h1>
        <p>We started Spectrum Connect because creative work deserves better — better matching, better payments, better collaboration. Here&apos;s our story.</p>
      </section>

      {/* Problem */}
      <section className="ab-sec">
        <div className="ab-inner">
          <div className="ab-head">
            <div className="ic-tile"><Ic.Globe /></div>
            <h2>The Problem We Saw</h2>
            <p>The existing tools for creative collaboration were broken. We set out to fix them.</p>
          </div>
          <div className="prob-grid">
            {[
              { c: 'orange', grad: 'linear-gradient(135deg,#f97316,#ef4444)', title: 'Race to the Bottom', desc: 'Platforms pitting creators against each other on price, destroying the value of craft and expertise.' },
              { c: 'yellow', grad: 'linear-gradient(135deg,#f59e0b,#f97316)', title: 'Payment Anxiety', desc: 'Creators chasing invoices. Clients unsure of quality before paying. A fundamental trust deficit on both sides.' },
              { c: 'pink', grad: 'linear-gradient(135deg,#a855f7,#ec4899)', title: 'Bad Matching', desc: 'Keyword-based search returning hundreds of irrelevant results. Hours wasted scrolling, cold-pitching, and getting ignored.' },
              { c: 'blue', grad: 'linear-gradient(135deg,#3b82f6,#195ad7)', title: 'Scattered Tools', desc: 'Chat in one app, files in another, payments in a third. No single place to run a creative project start to finish.' },
            ].map(({ c, grad, title, desc }) => (
              <div key={title} className={`prob-card ${c}`}>
                <div className="ic" style={{ background: grad }}><Ic.Globe /></div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we believe */}
      <section className="ab-sec tinted-blue">
        <div className="ab-inner">
          <div className="ab-head">
            <div className="ic-tile"><Ic.Heart /></div>
            <h2>What We Believe</h2>
            <p>These convictions shaped every product decision we&apos;ve made.</p>
          </div>
          <div className="believe-list">
            {[
              { grad: 'linear-gradient(135deg,#195ad7,#4178e7)', title: 'Creative work has real value', body: 'Design, video, writing, and production are skilled crafts. Platforms should amplify that value, not commoditize it.' },
              { grad: 'linear-gradient(135deg,#10b981,#059669)', title: 'Trust is built, not assumed', body: 'Verified identities, transparent histories, and two-way accountability create the foundation for great work.' },
              { grad: 'linear-gradient(135deg,#a855f7,#ec4899)', title: 'Fair access for everyone', body: 'Whether you\'re an up-and-coming creator or a large brand, the platform should work equitably for both sides.' },
              { grad: 'linear-gradient(135deg,#f97316,#ef4444)', title: 'Collaboration should be seamless', body: 'Every tool you need — messaging, files, payments, milestones — belongs in one integrated workspace.' },
            ].map(({ grad, title, body }) => (
              <div key={title} className="believe-row">
                <div className="ic" style={{ background: grad }}><Ic.Check /></div>
                <div className="body">
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we built */}
      <section className="ab-sec">
        <div className="ab-inner">
          <div className="ab-head">
            <div className="ic-tile"><Ic.Bolt /></div>
            <h2>What We Built</h2>
            <p>Spectrum Connect isn&apos;t just another job board. It&apos;s a complete creative collaboration platform.</p>
          </div>
          <div className="build-grid">
            {[
              { c: 'blue', grad: 'linear-gradient(135deg,#195ad7,#4178e7)', icon: 'Bolt', title: 'Smart Connect AI', body: 'Our matching engine learns from every project to surface the right collaborators — not just keyword matches.' },
              { c: 'green', grad: 'linear-gradient(135deg,#10b981,#059669)', icon: 'Shield', title: 'Escrow Payments', body: 'Funds held securely in escrow, released on milestone approval. No more invoice chasing.' },
              { c: 'pink', grad: 'linear-gradient(135deg,#a855f7,#ec4899)', icon: 'Users', title: 'Team Builder', body: 'Assemble full creative crews — directors, designers, editors — and manage them in one workspace.' },
              { c: 'orange', grad: 'linear-gradient(135deg,#f97316,#ef4444)', icon: 'Scale', title: 'Fair Pricing', body: 'Transparent 12% platform fee, split between both parties. No hidden charges, ever.' },
            ].map(({ c, grad, icon, title, body }) => {
              const I = Ic[icon as keyof typeof Ic];
              return (
                <div key={title} className={`build-card ${c}`}>
                  <div className="ic" style={{ background: grad }}><I /></div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="ab-sec tinted-violet">
        <div className="ab-inner">
          <div className="ab-head">
            <div className="ic-tile"><Ic.Users /></div>
            <h2>The Team</h2>
            <p>A small team with deep roots in creative work, product design, and trust & safety.</p>
          </div>
          <div className="people-grid">
            {[
              { name: 'Jamie Rivera', role: 'Co-founder & CEO', bio: 'Former freelance director turned product builder. Spent 8 years on set before building Spectrum.', av: 'blue' },
              { name: 'Priya Nair', role: 'Co-founder & CPO', bio: 'Ex-product lead at a major freelance platform. Saw every pain point from the inside and decided to fix them.', av: 'purple' },
              { name: 'Tom Osei', role: 'Head of Engineering', bio: 'Distributed systems engineer with a passion for payments infrastructure and trust systems.', av: 'green' },
            ].map(({ name, role, bio, av }) => (
              <div key={name} className={`person-card ${av}`}>
                <div className={`person-av ${av}`}>
                  <div className="ring" />
                  <div className="inner">
                    <Avatar name={name} size={78} />
                  </div>
                  <div className="star">✓</div>
                </div>
                <h4>{name}</h4>
                <div className="role">{role}</div>
                <p>{bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="ab-sec">
        <div className="ab-inner">
          <div className="ab-head">
            <div className="ic-tile"><Ic.Scale /></div>
            <h2>Our Values</h2>
            <p>The principles that guide how we build and how we operate.</p>
          </div>
          <div className="values-grid">
            {[
              { c: 'blue', grad: 'linear-gradient(135deg,#195ad7,#4178e7)', icon: 'Shield', title: 'Trust first', desc: 'Every feature starts with the question: does this make the platform safer and more trustworthy?' },
              { c: 'green', grad: 'linear-gradient(135deg,#10b981,#059669)', icon: 'Scale', title: 'Fairness always', desc: 'Fees, matching, and policies should work equitably for creators and clients at every level.' },
              { c: 'pink', grad: 'linear-gradient(135deg,#a855f7,#ec4899)', icon: 'Heart', title: 'Creator respect', desc: 'Creative work is skilled, valuable work. Our platform reflects that in how it talks about and treats creators.' },
              { c: 'orange', grad: 'linear-gradient(135deg,#f97316,#ef4444)', icon: 'Rocket', title: 'Ship & learn', desc: 'We release, listen, and iterate fast. The best product is built in conversation with the people using it.' },
            ].map(({ c, grad, icon, title, desc }) => {
              const I = Ic[icon as keyof typeof Ic];
              return (
                <div key={title} className={`value-card ${c}`}>
                  <div className="ic" style={{ background: grad }}><I /></div>
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What's ahead */}
      <section className="ahead">
        <div className="ic-tile"><Ic.Rocket /></div>
        <h2>What&apos;s Ahead</h2>
        <p className="lead">We&apos;re just getting started. Here&apos;s what we&apos;re building next.</p>
        <p className="desc">Video collaboration rooms, AI-assisted creative briefs, team analytics, expanded payment methods, and a mentorship program for emerging creators. Spectrum Connect is growing into the complete creative OS.</p>
      </section>

      {/* Final CTA */}
      <section className="ab-final">
        <div className="ic-tile"><Ic.Heart /></div>
        <h2>Be Part of the Story</h2>
        <p>Join 18,000+ creators and clients already building great work on Spectrum Connect.</p>
        <div className="btns">
          <Link href="/signup" className="btn btn-primary btn-lg">Get Started Free</Link>
          <Link href="/how-it-works" className="btn btn-outline btn-lg">How It Works</Link>
        </div>
        <p className="meta">Free to join · No credit card required · Start in minutes</p>
      </section>

      <Footer />
    </div>
  );
}
