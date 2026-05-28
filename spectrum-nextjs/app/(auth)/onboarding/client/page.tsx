'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { profile } from '@/lib/api';

const CATEGORIES = ['Video Production', 'Photography', 'Graphic Design', 'Motion & Animation', 'Copywriting & Content', 'Music & Audio', 'Social Media', 'Branding', 'Web & App Design', 'Other'];
const BUDGETS = ['< $500', '$500–$2,000', '$2,000–$10,000', '$10,000–$50,000', '$50,000+'];
const TEAM_SIZES = ['Just me', '2–10 people', '11–50 people', '51–200 people', '200+ people'];

const steps = ['Company', 'Needs', 'Budget', 'Done'];

export default function ClientOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  // Step 0 — Company
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [website, setWebsite] = useState('');

  // Step 1 — Needs
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [projectDesc, setProjectDesc] = useState('');

  // Step 2 — Budget
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');

  const toggleCat = (c: string) => setSelectedCategories(prev =>
    prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
  );

  const canNext = [
    companyName.trim().length >= 2,
    selectedCategories.length >= 1,
    budget !== '',
  ];

  const onNext = () => {
    if (step < 2) { setStep(s => s + 1); return; }
    onSubmit();
  };

  const onSubmit = async () => {
    setErr('');
    setSubmitting(true);
    try {
      await profile.updateMe({
        profile: {
          display_name: companyName.trim(),
          headline: industry.trim() || undefined,
          website: website.trim() || undefined,
          bio: projectDesc.trim() || undefined,
        },
      });
      setStep(3);
      setTimeout(() => router.push('/client/dashboard'), 2000);
    } catch (e) {
      setErr((e as Error).message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page" data-screen-label="Client Onboarding">
      <aside className="brand">
        <div className="brand-mark">
          <div className="logo-tile">
            <Image src="/assets/spectrum-logo.svg" alt="Spectrum Connect" width={44} height={44} />
          </div>
          <div className="name">Spectrum Connect</div>
        </div>
        <div className="brand-hero">
          <h1>Set up your client profile</h1>
          <p>Tell us about your company so we can match you with the right creative talent.</p>
        </div>
        <div className="features">
          {steps.slice(0, 3).map((s, i) => (
            <div className="feature" key={s}>
              <div className="ic" style={{ background: i <= step ? 'rgba(25,90,215,0.9)' : 'rgba(255,255,255,0.12)' }}>
                {i < step ? (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{i + 1}</span>
                )}
              </div>
              <div className="txt">
                <div className="t" style={{ opacity: i <= step ? 1 : 0.6 }}>{s}</div>
                <div className="s" style={{ opacity: i < step ? 0.8 : 0.5 }}>{i < step ? 'Complete' : i === step ? 'In progress' : 'Upcoming'}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="right">
        <div style={{ width: '100%', maxWidth: 520 }}>
          {/* Progress bar */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
              <span>Step {Math.min(step + 1, 3)} of 3</span>
              <span>{steps[step]}</span>
            </div>
            <div style={{ height: 6, background: '#e5e7eb', borderRadius: 999 }}>
              <div style={{ height: '100%', width: `${Math.min((step / 2) * 100, 100)}%`, background: 'linear-gradient(90deg,#195ad7,#4178e7)', borderRadius: 999, transition: 'width 0.4s ease' }} />
            </div>
          </div>

          <div className="card">
            {step === 3 ? (
              <div className="success">
                <div className="check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L20 7"/>
                  </svg>
                </div>
                <h2>You&apos;re all set!</h2>
                <p>Your client profile is ready. Redirecting you to your dashboard…</p>
              </div>
            ) : (
              <form noValidate onSubmit={e => { e.preventDefault(); onNext(); }}>
                {/* Step 0 — Company */}
                {step === 0 && (
                  <>
                    <h2>Your company</h2>
                    <p className="lede">This helps creators understand who they&apos;re working with.</p>

                    {err && <div className="alert"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span>{err}</span></div>}

                    <div className="field">
                      <label htmlFor="companyName">Company / brand name <span style={{ color: '#ef4444' }}>*</span></label>
                      <input id="companyName" className="input" type="text" placeholder="e.g. Sunrise Media" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                    </div>

                    <div className="field">
                      <label htmlFor="industry">Industry</label>
                      <input id="industry" className="input" type="text" placeholder="e.g. Entertainment, Tech, Fashion" value={industry} onChange={e => setIndustry(e.target.value)} />
                    </div>

                    <div className="field">
                      <label>Team size</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {TEAM_SIZES.map(s => (
                          <button key={s} type="button" onClick={() => setTeamSize(s)}
                            style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${teamSize === s ? '#195ad7' : '#e5e7eb'}`, background: teamSize === s ? '#eef4ff' : '#fff', fontWeight: 600, fontSize: 13, color: teamSize === s ? '#195ad7' : '#374151', cursor: 'pointer' }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="field">
                      <label htmlFor="website">Company website</label>
                      <input id="website" className="input" type="url" placeholder="https://yourcompany.com" value={website} onChange={e => setWebsite(e.target.value)} />
                    </div>
                  </>
                )}

                {/* Step 1 — Needs */}
                {step === 1 && (
                  <>
                    <h2>What do you need?</h2>
                    <p className="lede">Select the types of creative work you typically hire for.</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                      {CATEGORIES.map(c => (
                        <button key={c} type="button" onClick={() => toggleCat(c)}
                          style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${selectedCategories.includes(c) ? '#195ad7' : '#e5e7eb'}`, background: selectedCategories.includes(c) ? '#eef4ff' : '#fff', color: selectedCategories.includes(c) ? '#195ad7' : '#374151', fontWeight: 500, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                          {c}
                        </button>
                      ))}
                    </div>

                    <div className="field">
                      <label htmlFor="projectDesc">Describe your typical project (optional)</label>
                      <textarea id="projectDesc" className="input" rows={3} placeholder="Tell creators about the kind of work you usually bring to the platform…" value={projectDesc} onChange={e => setProjectDesc(e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                  </>
                )}

                {/* Step 2 — Budget */}
                {step === 2 && (
                  <>
                    <h2>Budget &amp; timeline</h2>
                    <p className="lede">Give creators a sense of your typical project scope.</p>

                    <div className="field">
                      <label>Typical project budget <span style={{ color: '#ef4444' }}>*</span></label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {BUDGETS.map(b => (
                          <button key={b} type="button" onClick={() => setBudget(b)}
                            style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${budget === b ? '#195ad7' : '#e5e7eb'}`, background: budget === b ? '#eef4ff' : '#fff', fontWeight: 600, fontSize: 13, color: budget === b ? '#195ad7' : '#374151', cursor: 'pointer' }}>
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="field">
                      <label htmlFor="timeline">Typical project timeline</label>
                      <input id="timeline" className="input" type="text" placeholder="e.g. 2–4 weeks, ongoing, one-off" value={timeline} onChange={e => setTimeline(e.target.value)} />
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  {step > 0 && (
                    <button type="button" onClick={() => setStep(s => s - 1)}
                      style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontWeight: 600, fontSize: 15, color: '#374151', cursor: 'pointer' }}>
                      Back
                    </button>
                  )}
                  <button
                    className={`submit${submitting ? ' is-loading' : ''}`}
                    type="submit"
                    disabled={!canNext[step] || submitting}
                    style={{ flex: step > 0 ? 2 : 1, opacity: canNext[step] ? 1 : 0.5 }}
                  >
                    {step === 2 ? (submitting ? 'Setting up…' : 'Complete setup') : 'Continue'}
                  </button>
                </div>

                <div className="signin-prompt" style={{ marginTop: 16 }}>
                  <Link href="/client/dashboard">Skip for now</Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
