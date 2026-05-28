'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { profile } from '@/lib/api';

const SKILLS = ['Video Editing', 'Photography', 'Graphic Design', 'Motion Graphics', 'Copywriting', 'Social Media', 'Music Production', 'Voiceover', 'Animation', 'Web Design', 'Brand Strategy', 'Illustration'];
const RATES = ['< $25/hr', '$25–$50/hr', '$50–$100/hr', '$100–$150/hr', '$150+/hr'];
const AVAILABILITY = ['Full-time (40+ hrs/week)', 'Part-time (20–40 hrs/week)', 'Flexible (10–20 hrs/week)', 'Project-based only'];

const steps = ['Profile', 'Skills', 'Availability', 'Done'];

export default function CreatorOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  // Step 0 — Profile
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');

  // Step 1 — Skills
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');

  // Step 2 — Availability
  const [rate, setRate] = useState('');
  const [availability, setAvailability] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);

  const toggleSkill = (s: string) => setSelectedSkills(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  );

  const addCustomSkill = () => {
    const t = customSkill.trim();
    if (t && !selectedSkills.includes(t)) {
      setSelectedSkills(p => [...p, t]);
      setCustomSkill('');
    }
  };

  const canNext = [
    displayName.trim().length >= 2 && bio.trim().length >= 20,
    selectedSkills.length >= 1,
    rate !== '' && availability !== '',
  ];

  const onNext = () => {
    if (step < 2) { setStep(s => s + 1); return; }
    onSubmit();
  };

  function parseRate(r: string): { hourly_rate_min?: number; hourly_rate_max?: number } {
    if (r === '< $25/hr')    return { hourly_rate_min: 0,   hourly_rate_max: 25 };
    if (r === '$150+/hr')    return { hourly_rate_min: 150 };
    const m = r.match(/\$(\d+)[–-]\$(\d+)/);
    if (m) return { hourly_rate_min: parseInt(m[1]), hourly_rate_max: parseInt(m[2]) };
    return {};
  }

  const onSubmit = async () => {
    setErr('');
    setSubmitting(true);
    try {
      const { hourly_rate_min, hourly_rate_max } = parseRate(rate);
      await profile.updateMe({
        profile: {
          display_name: displayName.trim(),
          bio: bio.trim(),
          website: website.trim() || undefined,
          location: location.trim() ? { city: location.trim() } : undefined,
          hourly_rate_min,
          hourly_rate_max,
        },
      });
      if (selectedSkills.length > 0) {
        await Promise.all(selectedSkills.map(s => profile.addSkill({ name: s })));
      }
      setStep(3);
      setTimeout(() => router.push('/creator/dashboard'), 2000);
    } catch (e) {
      setErr((e as Error).message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page" data-screen-label="Creator Onboarding">
      <aside className="brand">
        <div className="brand-mark">
          <div className="logo-tile">
            <Image src="/assets/spectrum-logo.svg" alt="Spectrum Connect" width={44} height={44} />
          </div>
          <div className="name">Spectrum Connect</div>
        </div>
        <div className="brand-hero">
          <h1>Set up your creator profile</h1>
          <p>Tell clients who you are and what you do. A great profile gets you hired faster.</p>
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
                <h2>Profile ready!</h2>
                <p>Your creator profile is live. Taking you to your dashboard now…</p>
              </div>
            ) : (
              <form noValidate onSubmit={e => { e.preventDefault(); onNext(); }}>
                {/* Step 0 — Profile */}
                {step === 0 && (
                  <>
                    <h2>Your profile</h2>
                    <p className="lede">This is what clients see first. Make it count.</p>

                    {err && <div className="alert"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span>{err}</span></div>}

                    <div className="field">
                      <label htmlFor="displayName">Display name <span style={{ color: '#ef4444' }}>*</span></label>
                      <input id="displayName" className="input" type="text" placeholder="e.g. Alex Rivera" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                    </div>

                    <div className="field">
                      <label htmlFor="bio">Bio <span style={{ color: '#ef4444' }}>*</span></label>
                      <textarea id="bio" className="input" rows={4} placeholder="Describe your experience, style, and what you bring to projects…" value={bio} onChange={e => setBio(e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                      <div className="help" style={{ color: bio.length < 20 ? '#9ca3af' : '#10b981' }}>{bio.length}/200 characters {bio.length < 20 ? '(min 20)' : '✓'}</div>
                    </div>

                    <div className="field">
                      <label htmlFor="location">Location</label>
                      <input id="location" className="input" type="text" placeholder="e.g. Los Angeles, CA" value={location} onChange={e => setLocation(e.target.value)} />
                    </div>

                    <div className="field">
                      <label htmlFor="website">Portfolio / website</label>
                      <input id="website" className="input" type="url" placeholder="https://yourportfolio.com" value={website} onChange={e => setWebsite(e.target.value)} />
                    </div>
                  </>
                )}

                {/* Step 1 — Skills */}
                {step === 1 && (
                  <>
                    <h2>Your skills</h2>
                    <p className="lede">Select all that apply. You can update these anytime.</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                      {SKILLS.map(s => (
                        <button key={s} type="button" onClick={() => toggleSkill(s)}
                          style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${selectedSkills.includes(s) ? '#195ad7' : '#e5e7eb'}`, background: selectedSkills.includes(s) ? '#eef4ff' : '#fff', color: selectedSkills.includes(s) ? '#195ad7' : '#374151', fontWeight: 500, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                          {s}
                        </button>
                      ))}
                      {selectedSkills.filter(s => !SKILLS.includes(s)).map(s => (
                        <button key={s} type="button" onClick={() => toggleSkill(s)}
                          style={{ padding: '7px 14px', borderRadius: 20, border: '1.5px solid #195ad7', background: '#eef4ff', color: '#195ad7', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                          {s} ×
                        </button>
                      ))}
                    </div>

                    <div className="field">
                      <label htmlFor="customSkill">Add a custom skill</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input id="customSkill" className="input" type="text" placeholder="e.g. Podcast editing" value={customSkill}
                          onChange={e => setCustomSkill(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); } }} />
                        <button type="button" onClick={addCustomSkill}
                          style={{ padding: '0 16px', borderRadius: 10, border: '1.5px solid #195ad7', background: '#195ad7', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Add
                        </button>
                      </div>
                    </div>

                    {selectedSkills.length === 0 && (
                      <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>Select at least one skill to continue.</p>
                    )}
                  </>
                )}

                {/* Step 2 — Availability */}
                {step === 2 && (
                  <>
                    <h2>Your availability</h2>
                    <p className="lede">Help clients understand your schedule and pricing.</p>

                    <div className="field">
                      <label>Hourly rate <span style={{ color: '#ef4444' }}>*</span></label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {RATES.map(r => (
                          <button key={r} type="button" onClick={() => setRate(r)}
                            style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${rate === r ? '#195ad7' : '#e5e7eb'}`, background: rate === r ? '#eef4ff' : '#fff', fontWeight: 600, fontSize: 13, color: rate === r ? '#195ad7' : '#374151', cursor: 'pointer' }}>
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="field">
                      <label>Availability <span style={{ color: '#ef4444' }}>*</span></label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {AVAILABILITY.map(a => (
                          <button key={a} type="button" onClick={() => setAvailability(a)}
                            style={{ padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${availability === a ? '#195ad7' : '#e5e7eb'}`, background: availability === a ? '#eef4ff' : '#fff', fontWeight: 500, fontSize: 14, color: availability === a ? '#195ad7' : '#374151', cursor: 'pointer', textAlign: 'left' }}>
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="field">
                      <label className="remember">
                        <input type="checkbox" checked={remoteOnly} onChange={e => setRemoteOnly(e.target.checked)} />
                        <span>Available for remote work only</span>
                      </label>
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
                  <Link href="/creator/dashboard">Skip for now</Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
