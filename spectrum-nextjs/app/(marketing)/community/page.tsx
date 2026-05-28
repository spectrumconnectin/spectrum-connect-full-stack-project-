import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Avatar from '@/components/Avatar';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community — Spectrum Connect',
  description: 'Join the Spectrum Connect community of creators and clients building great work together.',
};

const Ic = {
  Check: () => <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>,
  Users: () => <svg viewBox="0 0 1024 1024" width="22" height="22" fill="currentColor"><path d="M764.077495 365.4687c25.787576-28.703601 41.628106-66.514662 41.628106-108.047547 0-89.337066-72.67538-162.023709-162.023709-162.02371S481.658182 168.084087 481.658182 257.421153h45.226039c0-64.405459 52.403475-116.797671 116.797671-116.797671s116.797671 52.392212 116.79767 116.797671-52.403475 116.797671-116.79767 116.79767c-20.647671 0-40.964628-5.4655-58.741325-15.822099l-22.745613 39.086822c24.666421 14.365111 52.844769 21.961316 81.486938 21.961316 31.034988 0 59.955653-8.924184 84.62105-24.116595 2.73275 4.021822 144.402643 55.220183 154.273921 292.470796 0.507847 12.15659 10.511207 21.674628 22.568481 21.674628 0.330715 0 0.639928-0.011263 0.971667-0.022526 12.477067-0.51911 22.171213-11.052842 21.641864-23.529908-9.692098-233.333227-126.929016-303.970051-163.68138-320.452557z"/><path d="M541.966052 518.12181c29.268786-33.91313 47.104868-77.952485 47.104868-126.15803 0-106.683731-86.809093-193.481562-193.492825-193.481562S202.107796 285.279025 202.107796 391.962756c0 48.204521 17.828915 92.240805 47.090534 126.153935-51.365255 30.577311-153.310445 121.144064-153.310445 358.758155 0 12.488329 10.113939 22.613531 22.613531 22.613531s22.613531-10.125202 22.613531-22.613531c0-244.454669 113.552978-312.788776 143.593774-326.583583 31.432256 22.083159 69.622154 35.163294 110.869374 35.163294 41.246196 0 79.440191-13.080135 110.876542-35.163294 30.045915 13.80607 143.609132 82.134033 143.609132 326.583583 0 12.488329 10.113939 22.613531 22.613531 22.613531 12.498568 0 22.613531-10.125202 22.613531-22.613531-0.001024-237.6059-101.951333-328.172653-153.324779-358.753036zM247.333835 391.962756c0-81.752124 66.492137-148.255523 148.24426-148.255523s148.265762 66.5034 148.265762 148.255523-66.514662 148.265762-148.265762 148.265762-148.244261-66.513638-148.24426-148.265762z"/></svg>,
  Chat: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12c0 4.4-4 8-9 8a10 10 0 0 1-3-.5L3 21l1.5-5A8 8 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8z"/></svg>,
  Star: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1L7.3 14 2.5 9.5l6.6-.9L12 2.5z"/></svg>,
  Bolt: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>,
  Heart: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Globe: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Megaphone: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l17-9-9 17-2-8-6-0z"/></svg>,
  Book: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z"/></svg>,
  Video: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  Shield: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>,
};

const testimonials = [
  { name: 'Aisha Patel', role: 'Motion Graphics Designer', quote: 'The community forums helped me navigate my first big contract. The advice I got from experienced creators was priceless.', grad: 'from-blue-500 to-purple-500' },
  { name: 'Carlos Mendez', role: 'Brand Strategist', quote: 'Met my best collaborator through a Spectrum community event. We\'ve now completed 6 projects together.', grad: 'from-purple-500 to-pink-500' },
  { name: 'Nina Johansson', role: 'UX Researcher', quote: 'The resource library alone is worth joining. Case studies, contract templates, rate guides — everything I needed.', grad: 'from-emerald-500 to-teal-500' },
];

export default function CommunityPage() {
  return (
    <div className="community">
      <Nav />

      {/* Hero */}
      <section className="cm-hero">
        <div className="ic-tile">
          <Ic.Users />
        </div>
        <h1>A Community Built<br/>on Craft</h1>
        <p>18,000+ creators and clients learning, collaborating, and building careers together on Spectrum Connect.</p>
      </section>

      {/* Who's here */}
      <section className="cm-sec">
        <div className="cm-inner">
          <div className="cm-head">
            <div className="ic-tile"><Ic.Globe /></div>
            <h2>Who&apos;s in the Community</h2>
            <p>A diverse, skilled, and welcoming group of creative professionals from around the world.</p>
          </div>
          <div className="who-grid">
            {[
              { name: 'Marcus H.', role: 'Film Director', grad: 'from-blue-500 to-cyan-500', badge: true },
              { name: 'Priya K.', role: 'Brand Designer', grad: 'from-purple-500 to-pink-500', badge: true },
              { name: 'James T.', role: 'Audio Engineer', grad: 'from-emerald-500 to-teal-500', badge: false },
              { name: 'Leila M.', role: 'UX Strategist', grad: 'from-amber-500 to-orange-500', badge: true },
            ].map(({ name, role, grad, badge }) => (
              <div key={name} className="who-card">
                <div className="portrait" style={{ margin: '0 auto 14px', position: 'relative', width: 64, height: 64 }}>
                  <Avatar name={name} size={64} />
                  {badge && (
                    <div className="badge" style={{ position: 'absolute', bottom: -3, right: -3 }}>
                      <Ic.Check />
                    </div>
                  )}
                </div>
                <h4>{name}</h4>
                <p>{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community journey */}
      <section className="cm-sec tinted-grey">
        <div className="cm-inner">
          <div className="cm-head">
            <div className="ic-tile"><Ic.Bolt /></div>
            <h2>Your Community Journey</h2>
            <p>From newcomer to trusted veteran — here&apos;s how creators grow on Spectrum Connect.</p>
          </div>
          <div className="timeline" style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
            <div className="tl-line" />
            {[
              { side: 'right', color: '#195ad7', icon: 'Users', title: 'Join & Get Verified', desc: 'Create your profile, complete identity verification, and unlock your first Smart Connect matches.' },
              { side: 'left', color: '#a855f7', icon: 'Bolt', title: 'Land Your First Project', desc: 'Apply to matched projects or respond to direct invitations. Complete your first milestone and build your review record.' },
              { side: 'right', color: '#10b981', icon: 'Star', title: 'Build Your Reputation', desc: 'Consistent five-star reviews earn you a Verified badge, boosting your profile visibility and match priority.' },
              { side: 'left', color: '#ef4444', icon: 'Heart', title: 'Give Back to the Community', desc: 'Mentor newcomers, contribute to forums, and join community events to strengthen the network for everyone.' },
            ].map(({ side, color, icon, title, desc }, i) => {
              const I = Ic[icon as keyof typeof Ic];
              const isLeft = side === 'left';
              return (
                <div key={title} className={`tl-row ${isLeft ? 'left' : ''}`}>
                  {isLeft ? (
                    <>
                      <div className="tl-card left-side">
                        <div className="top">
                          <div className="ic" style={{ background: color }}><I /></div>
                          <h3>{title}</h3>
                        </div>
                        <p>{desc}</p>
                      </div>
                      <div className="tl-dot" style={{ background: color }} />
                      <div />
                    </>
                  ) : (
                    <>
                      <div />
                      <div className="tl-dot" style={{ background: color }} />
                      <div className="tl-card">
                        <div className="top">
                          <div className="ic" style={{ background: color }}><I /></div>
                          <h3>{title}</h3>
                        </div>
                        <p>{desc}</p>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How we&apos;re different */}
      <section className="cm-sec">
        <div className="cm-inner">
          <div className="cm-head">
            <div className="ic-tile"><Ic.Shield /></div>
            <h2>How This Community Is Different</h2>
            <p>We didn&apos;t build a forum. We built a living, working ecosystem.</p>
          </div>
          <div className="diff-grid">
            {[
              { c: 'blue', grad: 'linear-gradient(135deg,#195ad7,#4178e7)', icon: 'Users', title: 'Real Professionals', desc: 'Every member is identity-verified. No bots, no fake profiles, no spam. Just real creative professionals.' },
              { c: 'green', grad: 'linear-gradient(135deg,#10b981,#059669)', icon: 'Shield', title: 'Work-Integrated', desc: 'Community discussions link directly to your projects. Ask for advice in context, not in a disconnected forum.' },
              { c: 'purple', grad: 'linear-gradient(135deg,#a855f7,#ec4899)', icon: 'Heart', title: 'Mutual Accountability', desc: 'Two-way reviews mean everyone shows up with intention. Great behavior is rewarded, poor behavior has consequences.' },
              { c: 'orange', grad: 'linear-gradient(135deg,#f97316,#ef4444)', icon: 'Globe', title: 'Global but Personal', desc: 'Members worldwide, but community channels organized by discipline, region, and interest so it always feels like your crowd.' },
            ].map(({ c, grad, icon, title, desc }) => {
              const I = Ic[icon as keyof typeof Ic];
              return (
                <div key={title} className={`diff-card ${c}`}>
                  <div className="ic" style={{ background: grad }}><I /></div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ways to engage */}
      <section className="cm-sec tinted-violet">
        <div className="cm-inner">
          <div className="cm-head">
            <div className="ic-tile"><Ic.Chat /></div>
            <h2>Ways to Get Involved</h2>
            <p>There are as many ways to participate as there are types of creators.</p>
          </div>
          <div className="ways-grid">
            {[
              { grad: 'linear-gradient(135deg,#195ad7,#4178e7)', icon: 'Chat', title: 'Community Forums', desc: 'Discuss rates, contracts, tools, and best practices with peers who get it.' },
              { grad: 'linear-gradient(135deg,#a855f7,#ec4899)', icon: 'Video', title: 'Live Events', desc: 'Monthly virtual meetups, portfolio reviews, and skill-sharing workshops.' },
              { grad: 'linear-gradient(135deg,#10b981,#059669)', icon: 'Book', title: 'Resource Library', desc: 'Free templates, rate guides, contract examples, and project management tools.' },
              { grad: 'linear-gradient(135deg,#f97316,#ef4444)', icon: 'Star', title: 'Mentorship Program', desc: 'Get paired with an experienced creator for guidance on growing your practice.' },
            ].map(({ grad, icon, title, desc }) => {
              const I = Ic[icon as keyof typeof Ic];
              return (
                <div key={title} className="way-card">
                  <div className="ic" style={{ background: grad, color: '#fff' }}><I /></div>
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="cm-sec">
        <div className="cm-inner">
          <div className="cm-head">
            <div className="ic-tile"><Ic.Heart /></div>
            <h2>What Members Say</h2>
            <p>The community isn&apos;t just a feature. It&apos;s the foundation.</p>
          </div>
          <div className="tg-grid">
            {testimonials.map(({ name, role, quote }) => (
              <div key={name} className="tg-card">
                <div className="who">
                  <Avatar name={name} size={44} />
                  <div>
                    <div className="nm">{name}</div>
                    <div className="ro">{role}</div>
                  </div>
                </div>
                <p className="quote">&ldquo;{quote}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our promise */}
      <section className="promise">
        <div className="ic-tile"><Ic.Shield /></div>
        <h2>Our Community Promise</h2>
        <p className="sub">We take the health of this community seriously. Here&apos;s what we commit to every member.</p>
        <div className="promise-grid">
          {[
            { icon: 'Shield', title: 'Safe Participation', desc: 'Zero tolerance for harassment, discrimination, or bad-faith behaviour. Moderation that actually works.' },
            { icon: 'Heart', title: 'Your Privacy', desc: 'We never sell member data. Your community activity is yours, not a product to be monetized.' },
            { icon: 'Star', title: 'Quality Over Scale', desc: 'We\'d rather have 18,000 engaged members than 1,000,000 inactive ones. Growth follows quality, not the reverse.' },
          ].map(({ icon, title, desc }) => {
            const I = Ic[icon as keyof typeof Ic];
            return (
              <div key={title} className="promise-card">
                <div className="ic"><I /></div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="cm-final">
        <div className="ic-tile"><Ic.Users /></div>
        <h2>Join the Community</h2>
        <p>Find your people. Build your reputation. Do your best work.</p>
        <div className="btns">
          <Link href="/signup" className="btn btn-primary btn-lg">Join for Free</Link>
          <Link href="/about" className="btn btn-outline btn-lg">About Us</Link>
        </div>
        <p className="meta">Free to join · No credit card required · Start in minutes</p>
      </section>

      <Footer />
    </div>
  );
}
