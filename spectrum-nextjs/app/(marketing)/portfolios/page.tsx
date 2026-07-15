import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Portfolio Builder — Show Your Work, Get Hired',
  description: 'Turn your best work into a portfolio that gets you hired. Rich case studies, 5 designer templates, drag-and-drop reordering, view analytics, password-protected links, and one-click PDF export — free for every creator.',
  openGraph: {
    title: 'Show your work. Get hired faster.',
    description: 'A free portfolio builder for creators — rich case studies, 5 templates, analytics, and a link you’re proud to send.',
    url: 'https://spectrumconect.com/portfolios',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Show your work. Get hired faster.',
    description: 'A free portfolio builder for creators — rich case studies, 5 templates, analytics, and a link you’re proud to send.',
  },
  alternates: {
    canonical: 'https://spectrumconect.com/portfolios',
  },
};

const FEATURES = [
  {
    icon: 'fa-images',
    title: 'Rich case studies',
    desc: 'Text, images, video, before/after comparisons, and quotes — turn a single project into a real story.',
    grad: 'from-cobalt to-blue-500',
  },
  {
    icon: 'fa-arrows-up-down-left-right',
    title: 'Drag-and-drop, everywhere',
    desc: 'Reorder projects, media, and case study blocks exactly how you want. Changes go live instantly.',
    grad: 'from-violet-500 to-purple-600',
  },
  {
    icon: 'fa-swatchbook',
    title: '5 designer templates',
    desc: 'Visual, Motion, Minimal, Editorial, or Grid. Switch anytime — your projects stay the same, the look doesn’t.',
    grad: 'from-amber-400 to-orange-500',
  },
  {
    icon: 'fa-chart-line',
    title: 'Built-in analytics',
    desc: 'See total views and which projects actually get attention, right from your dashboard.',
    grad: 'from-emerald-500 to-teal-600',
  },
  {
    icon: 'fa-lock',
    title: 'Password protection',
    desc: 'Keep it private by default, or share a passcode with only the clients you choose.',
    grad: 'from-slate-600 to-slate-800',
  },
  {
    icon: 'fa-file-arrow-down',
    title: 'One-click PDF export',
    desc: 'Clients can download a clean, print-ready PDF of your portfolio straight from the page.',
    grad: 'from-pink-500 to-rose-600',
  },
];

const STEPS = [
  { n: '01', title: 'Add your best work', desc: 'Upload images and video, write a case study, tag the category and client.' },
  { n: '02', title: 'Pick your look', desc: 'Choose from 5 templates built for different kinds of creative work. Switch anytime.' },
  { n: '03', title: 'Share your link', desc: 'spectrumconect.com/portfolio/yourname — clean, memorable, and yours.' },
];

const TEMPLATES = [
  { name: 'Visual', desc: 'Image-forward masonry', grad: 'from-blue-100 to-blue-50' },
  { name: 'Motion', desc: 'Video-first showcase', grad: 'from-purple-200 to-purple-50' },
  { name: 'Minimal', desc: 'Clean text-forward list', grad: 'from-slate-200 to-slate-50' },
  { name: 'Editorial', desc: 'Magazine-style stories', grad: 'from-amber-100 to-amber-50' },
  { name: 'Grid', desc: 'Dense square grid', grad: 'from-emerald-100 to-emerald-50' },
];

export default function PortfoliosLandingPage() {
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Portfolio Builder — Spectrum Connect',
    description: 'A free portfolio builder for creators — rich case studies, 5 templates, analytics, and password-protected sharing.',
    url: 'https://spectrumconect.com/portfolios',
  };

  return (
    <div className="bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      <Nav />

      <style>{`
        @keyframes pfFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        .pf-float { animation: pfFloat 5s ease-in-out infinite; }
        @keyframes pfIn { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        .pf-in { animation: pfIn .6s cubic-bezier(.22,.9,.36,1) both; }
      `}</style>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-cobalt-deep to-cobalt text-white">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-20 w-[34rem] h-[34rem] bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-20 pb-24 grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
          <div className="pf-in">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Free for every creator
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Show your work.<br />Get hired faster.
            </h1>
            <p className="mt-6 text-base sm:text-lg text-blue-100/90 max-w-xl leading-relaxed">
              Build a portfolio that actually shows what you can do — rich case studies, a template that
              fits your craft, and a clean link you&apos;re proud to put in your bio.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup"
                className="inline-flex items-center gap-2 bg-white text-cobalt-deep font-bold px-6 py-3.5 rounded-xl hover:shadow-2xl hover:shadow-blue-900/40 hover:-translate-y-0.5 transition-all">
                Build your portfolio — free <i className="fa-solid fa-arrow-right text-sm" />
              </Link>
              <a href="#templates"
                className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/15 transition-all">
                See the templates
              </a>
            </div>
          </div>

          {/* Mock portfolio preview card */}
          <div className="pf-in flex justify-center lg:justify-end" style={{ animationDelay: '.12s' }}>
            <div className="pf-float w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden text-slate-900">
              <div className="h-24 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900" />
              <div className="px-5 -mt-9">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cobalt to-blue-500 border-4 border-white shadow-lg" />
              </div>
              <div className="px-5 pt-3 pb-5">
                <p className="font-bold text-lg">Jordan Lee</p>
                <p className="text-sm text-slate-500">Motion designer &amp; editor</p>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 border border-slate-100" />
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-purple-100 to-purple-50 border border-slate-100" />
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-amber-100 to-amber-50 border border-slate-100" />
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-50 border border-slate-100" />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><i className="fa-solid fa-eye" /> 1,204 views</span>
                  <span className="flex items-center gap-1.5 font-semibold text-cobalt">spectrumconect.com/portfolio/jordan <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" /></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Everything a great portfolio needs</h2>
            <p className="mt-3 text-slate-500 max-w-xl mx-auto">
              Built for creators, not designers — no code, no fuss, updates live the second you save.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title}
                className="group bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300">
                <span className={`flex w-12 h-12 rounded-2xl bg-gradient-to-br ${f.grad} text-white items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <i className={`fa-solid ${f.icon} text-lg`} />
                </span>
                <h3 className="mt-4 font-bold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEMPLATES ── */}
      <section id="templates" className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Five looks, one portfolio</h2>
          <p className="mt-3 text-slate-500 max-w-xl mx-auto">
            Switch instantly — your projects stay exactly as you wrote them.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {TEMPLATES.map(t => (
            <div key={t.name} className="rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className={`h-28 bg-gradient-to-br ${t.grad} p-3 flex flex-col gap-1.5`}>
                <div className="h-2.5 w-3/4 rounded bg-white/70" />
                <div className="h-2.5 w-1/2 rounded bg-white/50" />
                <div className="flex-1" />
                <div className="grid grid-cols-3 gap-1">
                  <div className="h-5 rounded bg-white/60" />
                  <div className="h-5 rounded bg-white/40" />
                  <div className="h-5 rounded bg-white/60" />
                </div>
              </div>
              <div className="p-4 bg-white">
                <p className="font-bold text-sm text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Live in three steps</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map(s => (
              <div key={s.n}>
                <span className="text-4xl font-black text-cobalt/20">{s.n}</span>
                <h3 className="mt-2 font-bold text-lg text-slate-900">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gradient-to-br from-cobalt-deep to-cobalt text-white">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-16 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Your work deserves a home.</h2>
          <p className="mt-4 text-blue-100/85 max-w-xl mx-auto">
            Free to build, yours to share — on your resume, in your bio, or straight to a client.
          </p>
          <Link href="/signup"
            className="mt-8 inline-flex items-center gap-2 bg-white text-cobalt-deep font-bold px-7 py-4 rounded-xl hover:shadow-2xl hover:shadow-blue-900/40 hover:-translate-y-0.5 transition-all">
            Create your portfolio <i className="fa-solid fa-arrow-right text-sm" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
