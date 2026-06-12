'use client';

import { useState } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { ceoCalls } from '@/lib/api';
import type { CeoCallPayload } from '@/lib/api';

const PURPOSES = [
  { value: 'partnership', label: 'Partnership' },
  { value: 'investment',  label: 'Investment' },
  { value: 'business',    label: 'Business Opportunity' },
  { value: 'enterprise',  label: 'Enterprise Inquiry' },
  { value: 'feedback',    label: 'Platform Feedback' },
  { value: 'media',       label: 'Media Request' },
  { value: 'other',       label: 'Other' },
];

const MEETING_TYPES = [
  { value: 'google_meet', label: 'Google Meet', icon: 'fa-video' },
  { value: 'zoom',        label: 'Zoom',        icon: 'fa-display' },
  { value: 'phone',       label: 'Phone Call',  icon: 'fa-phone' },
];

const WHY_CARDS = [
  { icon: 'fa-handshake',     title: 'Partnerships',        desc: 'Explore ways to collaborate with Spectrum Connect.',           grad: 'from-violet-500 to-purple-600' },
  { icon: 'fa-chart-line',    title: 'Investors',           desc: 'Discuss the future vision and growth of the platform.',         grad: 'from-cobalt to-blue-500' },
  { icon: 'fa-building',      title: 'Enterprise Solutions',desc: 'Find creative talent at scale for your organization.',          grad: 'from-emerald-500 to-teal-600' },
  { icon: 'fa-lightbulb',     title: 'Platform Feedback',   desc: 'Share ideas and suggestions directly with leadership.',         grad: 'from-amber-400 to-orange-500' },
];

const EMPTY: CeoCallPayload = {
  full_name: '', email: '', company_name: '', phone: '', country: '',
  subject: '', purpose: 'partnership', message: '',
  meeting_type: 'google_meet', preferred_date: '', preferred_time: '',
};

export default function CallTheCeoPage() {
  const [form, setForm] = useState<CeoCallPayload>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof CeoCallPayload, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.full_name.trim() || !form.email.trim()) {
      setError('Please fill in your name and email.');
      return;
    }
    setSubmitting(true);
    try {
      await ceoCalls.submit(form);
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToForm = () => {
    document.getElementById('request-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="bg-white text-slate-900">
      <Nav />

      <style>{`
        @keyframes ceoFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        .ceo-float { animation: ceoFloat 4s ease-in-out infinite; }
        @keyframes ceoIn { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        .ceo-in { animation: ceoIn .6s cubic-bezier(.22,.9,.36,1) both; }
      `}</style>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-cobalt-deep to-cobalt text-white">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-20 w-[34rem] h-[34rem] bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-20 pb-24 grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
          <div className="ceo-in">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Direct line to the founder
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Talk Directly With<br />the Founder
            </h1>
            <p className="mt-6 text-base sm:text-lg text-blue-100/90 max-w-xl leading-relaxed">
              Building Spectrum Connect is a long-term mission. If you have a partnership opportunity,
              business proposal, investor inquiry, or valuable feedback, you can request a direct
              conversation with the founder.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={scrollToForm}
                className="inline-flex items-center gap-2 bg-white text-cobalt-deep font-bold px-6 py-3.5 rounded-xl hover:shadow-2xl hover:shadow-blue-900/40 hover:-translate-y-0.5 transition-all">
                Request a Call <i className="fa-solid fa-arrow-right text-sm" />
              </button>
              <a href="#why"
                className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/15 transition-all">
                Why book a call?
              </a>
            </div>
          </div>

          {/* Founder card */}
          <div className="ceo-in flex justify-center lg:justify-end" style={{ animationDelay: '.12s' }}>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-7 text-center w-full max-w-xs shadow-2xl">
              <div className="ceo-float mx-auto w-28 h-28 rounded-3xl bg-gradient-to-br from-violet-400 via-blue-300 to-cyan-300 flex items-center justify-center shadow-xl">
                <span className="text-5xl font-black text-cobalt-deep">P</span>
              </div>
              <p className="mt-5 text-xl font-bold">Pulindu</p>
              <p className="text-sm text-blue-100/80 mt-0.5">Founder &amp; CEO</p>
              <p className="text-xs text-blue-200/60">Spectrum Connect</p>
              <div className="mt-5 pt-5 border-t border-white/15 flex justify-center gap-5 text-blue-100/80 text-sm">
                <span><i className="fa-solid fa-globe mr-1.5" />Global</span>
                <span><i className="fa-solid fa-shield-halved mr-1.5" />Verified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT FOUNDER ── */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 py-16 sm:py-20 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-cobalt mb-3">About the Founder</p>
        <p className="text-lg sm:text-xl text-slate-600 leading-relaxed">
          Pulindu is the founder of Spectrum Connect, a platform built to help creators and clients
          collaborate more effectively. His vision is to create a trusted global ecosystem where creative
          professionals and businesses can connect, build projects, and grow together.
        </p>
      </section>

      {/* ── WHY BOOK A CALL ── */}
      <section id="why" className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Why Book a Call?</h2>
            <p className="mt-3 text-slate-500 max-w-xl mx-auto">
              A direct line to leadership — reserved for opportunities that move the ecosystem forward.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHY_CARDS.map(c => (
              <div key={c.title}
                className="group bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300">
                <span className={`flex w-12 h-12 rounded-2xl bg-gradient-to-br ${c.grad} text-white items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <i className={`fa-solid ${c.icon} text-lg`} />
                </span>
                <h3 className="mt-4 font-bold text-slate-900">{c.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REQUEST FORM ── */}
      <section id="request-form" className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
        {done ? (
          <div className="text-center bg-emerald-50 border border-emerald-200 rounded-3xl p-10 ceo-in">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-5">
              <i className="fa-solid fa-check text-2xl" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Request received</h2>
            <p className="mt-3 text-slate-600 max-w-md mx-auto">
              Thanks, {form.full_name.split(' ')[0] || 'there'}. Your request is now under review.
              If it&apos;s a fit, we&apos;ll reach out to <strong>{form.email}</strong> to schedule.
            </p>
            <button onClick={() => { setForm(EMPTY); setDone(false); }}
              className="mt-6 text-sm font-semibold text-cobalt hover:underline">
              Submit another request
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Request a Call</h2>
              <p className="mt-3 text-slate-500">Tell us about the opportunity. The more detail, the better.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-8 space-y-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Full Name" required>
                  <input className="ceo-input" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your full name" />
                </Field>
                <Field label="Company Name">
                  <input className="ceo-input" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Your company" />
                </Field>
                <Field label="Email Address" required>
                  <input type="email" className="ceo-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@company.com" />
                </Field>
                <Field label="Phone Number">
                  <input className="ceo-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+94 7X XXX XXXX" />
                </Field>
                <Field label="Country">
                  <input className="ceo-input" value={form.country} onChange={e => set('country', e.target.value)} placeholder="Country" />
                </Field>
                <Field label="Purpose of Meeting" required>
                  <select className="ceo-input" value={form.purpose} onChange={e => set('purpose', e.target.value)}>
                    {PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Subject">
                <input className="ceo-input" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="A one-line summary" />
              </Field>

              <Field label="Message">
                <textarea rows={5} className="ceo-input resize-none" value={form.message} onChange={e => set('message', e.target.value)}
                  placeholder="Share the details — context, goals, and what you'd like to discuss." />
              </Field>

              {/* Meeting details */}
              <div className="pt-2">
                <p className="text-sm font-semibold text-slate-700 mb-2.5">Preferred Meeting Type</p>
                <div className="grid grid-cols-3 gap-3">
                  {MEETING_TYPES.map(m => (
                    <button type="button" key={m.value} onClick={() => set('meeting_type', m.value)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 text-sm font-medium transition-all ${
                        form.meeting_type === m.value
                          ? 'border-cobalt bg-blue-50 text-cobalt'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}>
                      <i className={`fa-solid ${m.icon} text-lg`} />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Preferred Date">
                  <input type="date" className="ceo-input" value={form.preferred_date} onChange={e => set('preferred_date', e.target.value)} />
                </Field>
                <Field label="Preferred Time">
                  <input className="ceo-input" value={form.preferred_time} onChange={e => set('preferred_time', e.target.value)} placeholder="e.g. 3:00 PM (GMT+5:30)" />
                </Field>
              </div>

              {/* Priority notice */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3.5 text-sm text-amber-800 flex gap-3">
                <i className="fa-solid fa-circle-info mt-0.5 shrink-0" />
                <p>
                  Due to the volume of requests, not all meeting requests can be accepted. Priority is given to
                  partnerships, investors, enterprise clients, and opportunities that can help grow the Spectrum ecosystem.
                </p>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-cobalt text-white font-bold py-4 rounded-xl hover:bg-cobalt-2 active:scale-[.99] transition-all disabled:opacity-60">
                {submitting ? <><i className="fa-solid fa-spinner animate-spin" /> Sending…</> : <>Request a Call <i className="fa-solid fa-arrow-right text-sm" /></>}
              </button>
            </form>
          </>
        )}
      </section>

      {/* ── CTA ── */}
      <section className="bg-gradient-to-br from-cobalt-deep to-cobalt text-white">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-16 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Let&apos;s Build Something Meaningful Together</h2>
          <p className="mt-4 text-blue-100/85 max-w-xl mx-auto">
            Whether it&apos;s a partnership, an investment, or a bold idea — the founder is listening.
          </p>
          <button onClick={scrollToForm}
            className="mt-8 inline-flex items-center gap-2 bg-white text-cobalt-deep font-bold px-7 py-4 rounded-xl hover:shadow-2xl hover:shadow-blue-900/40 hover:-translate-y-0.5 transition-all">
            Request a Call <i className="fa-solid fa-arrow-right text-sm" />
          </button>
        </div>
      </section>

      <Footer />

      <style>{`
        .ceo-input {
          width: 100%;
          padding: 11px 14px;
          font-size: 14px;
          color: #0f172a;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          outline: none;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .ceo-input:focus { border-color: #195ad7; box-shadow: 0 0 0 3px rgba(25,90,215,.12); }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
