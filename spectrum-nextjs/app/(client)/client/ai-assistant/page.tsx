'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  aiChat, talent, jobs, profile as profileApi, etfPoints, notifications as notifApi,
} from '@/lib/api';
import type { TalentItem, JobPostItem, EtfBalance, NotificationItem } from '@/lib/api';

/* ────────────────────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────────────────── */

type RichCard =
  | { kind: 'creators'; items: TalentItem[] }
  | { kind: 'projects'; items: JobPostItem[] }
  | { kind: 'etf' }
  | { kind: 'payments' };

type Message = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  time: string;
  card?: RichCard;
};

type Conversation = {
  id: string;
  title: string;
  saved: boolean;
  updatedAt: number;
  messages: Message[];
};

type Mode = 'general' | 'project' | 'creator' | 'help';

const STORAGE_KEY = 'miya_conversations_v1';

/* ────────────────────────────────────────────────────────────────────────────
   Mode metadata + suggested actions
──────────────────────────────────────────────────────────────────────────── */

const MODES: Record<Mode, { label: string; icon: string; hint: string }> = {
  general: { label: 'Miya',              icon: 'fa-sparkles',        hint: 'General assistant' },
  project: { label: 'Project Assistant', icon: 'fa-briefcase',       hint: 'Briefs, budgets, timelines' },
  creator: { label: 'Creator Assistant', icon: 'fa-users',           hint: 'Find & evaluate creators' },
  help:    { label: 'Platform Help',     icon: 'fa-circle-question', hint: 'How Spectrum works' },
};

const SUGGESTED_ACTIONS: { label: string; icon: string; prompt: string; gradient: string }[] = [
  { label: 'Find a Video Editor',  icon: 'fa-clapperboard',   prompt: 'Find me a video editor',                        gradient: 'from-violet-500 to-purple-600' },
  { label: 'Create a New Project', icon: 'fa-wand-magic-sparkles', prompt: 'Help me create a new project',             gradient: 'from-cobalt to-blue-500' },
  { label: 'Recommend Creators',   icon: 'fa-star',           prompt: 'Recommend some top creators for me',            gradient: 'from-amber-400 to-orange-500' },
  { label: 'Explain ETF',          icon: 'fa-shield-halved',  prompt: 'Explain how ETF points work',                   gradient: 'from-emerald-500 to-teal-600' },
  { label: 'Help With Payments',   icon: 'fa-credit-card',    prompt: 'How do payments and escrow work?',              gradient: 'from-rose-500 to-pink-600' },
  { label: 'Review My Project',    icon: 'fa-list-check',     prompt: 'Review my current projects',                    gradient: 'from-sky-500 to-cyan-600' },
];

const MODE_PROMPTS: Record<Mode, string[]> = {
  general: [
    'What can you help me with?',
    'How do I get started on Spectrum?',
  ],
  project: [
    'Help me write a great project brief',
    'What budget should I set for a logo design?',
    'Suggest a timeline for a brand video',
    'Review my current projects',
  ],
  creator: [
    'Find me a video editor',
    'Recommend top-rated creators',
    'How do I evaluate creator proposals?',
    'What makes a good creator profile?',
  ],
  help: [
    'Explain how ETF points work',
    'How do payments and escrow work?',
    'How do disputes get resolved?',
    'What is Smart Connect?',
  ],
};

/* ────────────────────────────────────────────────────────────────────────────
   Local fallback brain (used when the AI API is unavailable)
──────────────────────────────────────────────────────────────────────────── */

function getMiyaFallback(input: string): string {
  const q = input.toLowerCase();

  if (q.includes('find') || q.includes('editor') || q.includes('recommend') || q.includes('creator')) {
    return `Here are some creators that match what you're looking for. Each one is verified on Spectrum with real project history and reviews — tap a card to see their full portfolio, or message them directly to discuss your project.`;
  }
  if (q.includes('etf') || q.includes('trust') || q.includes('points')) {
    return `**ETF — Earn Trust Framework** is Spectrum's trust system. You earn points for genuine platform activity:\n\n• **Post a project** — +5 pts\n• **Hire a creator** — +20 pts\n• **Fund a milestone** — +10 pts\n• **Release a milestone** — +15 pts\n• **Complete a project** — +50 pts\n• **Leave a review** — +15 pts\n\nPoints move you through levels: **Bronze → Silver (250) → Gold (1,000) → Platinum (5,000)**. Higher levels unlock better creator matching, priority support, and at Platinum — cash-out eligibility.`;
  }
  if (q.includes('payment') || q.includes('escrow') || q.includes('pay') || q.includes('milestone')) {
    return `Spectrum protects every payment with **milestone escrow**:\n\n1. **You fund a milestone** — money is held in secure escrow, not sent to the creator.\n2. **Creator delivers** — they upload work and request release.\n3. **You review** — approve, or request revisions within 5 business days.\n4. **Funds release** — payment transfers only when you approve.\n\nIf anything goes wrong, you can open a dispute and our resolution team steps in. Never pay outside the platform — you lose all protection.\n\nFor larger projects, break the budget into 3+ milestones: kickoff, draft, and final delivery.`;
  }
  if (q.includes('project') && (q.includes('create') || q.includes('new') || q.includes('post') || q.includes('brief') || q.includes('write'))) {
    return `Let's set your project up for success. A great brief includes:\n\n**1. Project overview** — what you're making and why.\n**2. Deliverables** — exact files, formats, durations.\n**3. Budget range** — creators propose within it; leave 10–15% buffer.\n**4. Timeline** — key dates with breathing room.\n**5. References** — examples of styles you love.\n**6. Brand assets** — logo, colors, fonts, tone.\n\nReady to start? Hit **Post a Project** and I'll be right here if you need help with any field.`;
  }
  if (q.includes('review my') || q.includes('my project') || q.includes('track')) {
    return `Here's a snapshot of your current projects. Tap any card to open the full workspace — milestones, escrow, deliverables, and your team are all there.`;
  }
  if (q.includes('budget') || q.includes('cost') || q.includes('price')) {
    return `Rough benchmarks on Spectrum:\n\n• **Logo design** — $300–$2,500\n• **Brand identity** — $1,500–$8,000\n• **Event photography** — $200–$1,500/day\n• **Video editing** — $500–$5,000 per piece\n• **Full event coverage** — $800–$5,000\n\nPost with a budget *range* and let creators propose — you're never locked in until you accept. I'd suggest a 10–15% buffer for revisions.`;
  }
  if (q.includes('proposal') || q.includes('evaluate')) {
    return `When comparing proposals, look beyond price:\n\n1. **Portfolio relevance** — similar work before?\n2. **Proposal quality** — did they actually read your brief?\n3. **Questions asked** — smart questions signal experience.\n4. **Timeline realism** — overpromising speed is a red flag.\n5. **ETF level & reviews** — platform-verified track record.\n\nShortlist 3–5, message each, and trust your instinct on communication fit.`;
  }
  if (q.includes('dispute')) {
    return `If a project goes sideways:\n\n1. **Open a dispute** from the project page — describe the issue and attach evidence.\n2. **Both sides respond** — the creator gets a chance to reply with their evidence.\n3. **Resolution team reviews** — typically within 3–5 business days.\n4. **Funds are awarded** — to whichever side the evidence supports, or split.\n\nEscrowed funds stay frozen during a dispute, so your money is never released without a ruling.`;
  }
  if (q.includes('smart connect')) {
    return `**Smart Connect** is Spectrum's matching engine. Instead of browsing hundreds of profiles, you describe what you need and it ranks the best-fit creators using skills, availability, ratings, ETF trust level, and past project success.\n\nHigher ETF levels get you priority matching — another reason to keep collaborating on-platform.`;
  }
  if (q.includes('hello') || q.includes('hi ') || q === 'hi' || q.includes('hey')) {
    return `Hey! I'm Miya — your project copilot on Spectrum. I can find creators, help you write briefs, explain payments and ETF, track your projects, and answer anything about the platform.\n\nWhat are we working on today?`;
  }
  if (q.includes('what can you')) {
    return `Here's what I can do for you:\n\n• **Find creators** — search and recommend by skill, rating, and trust level\n• **Create projects** — help write briefs, suggest budgets and timelines\n• **Track projects** — progress, milestones, escrow at a glance\n• **Explain the platform** — ETF, Smart Connect, disputes, payments\n• **Evaluate proposals** — frameworks to pick the right creator\n\nTry one of the suggestions below, or just ask in your own words.`;
  }
  return `Good question! I can help with finding creators, writing project briefs, budgets, timelines, payments & escrow, ETF points, and anything else on Spectrum.\n\nTell me a bit more about what you're trying to do — the more context, the better my answer.`;
}

/* Detect which rich card (if any) a user message should trigger */
function detectCard(input: string): RichCard['kind'] | null {
  const q = input.toLowerCase();
  if (q.includes('find') && (q.includes('editor') || q.includes('creator') || q.includes('photographer') || q.includes('videographer') || q.includes('designer'))) return 'creators';
  if (q.includes('recommend') && q.includes('creator')) return 'creators';
  if (q.includes('review my') || q.includes('my project') || (q.includes('track') && q.includes('project'))) return 'projects';
  if (q.includes('etf') || (q.includes('trust') && q.includes('point'))) return 'etf';
  if (q.includes('payment') || q.includes('escrow')) return 'payments';
  return null;
}

function extractSkill(input: string): string | undefined {
  const q = input.toLowerCase();
  const skills = ['video editor', 'editor', 'photographer', 'videographer', 'designer', 'animator', 'colorist', 'director'];
  for (const s of skills) if (q.includes(s)) return s.replace('video editor', 'editing').replace('editor', 'editing');
  return undefined;
}

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const newConvId = () => `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

/* ────────────────────────────────────────────────────────────────────────────
   ETF level chip colors
──────────────────────────────────────────────────────────────────────────── */
const ETF_CHIP: Record<string, string> = {
  bronze:   'bg-orange-50 text-orange-700 border-orange-200',
  silver:   'bg-slate-100 text-slate-600 border-slate-300',
  gold:     'bg-amber-50 text-amber-700 border-amber-300',
  platinum: 'bg-violet-50 text-violet-700 border-violet-300',
  diamond:  'bg-cyan-50 text-cyan-700 border-cyan-300',
};

/* ────────────────────────────────────────────────────────────────────────────
   Sub-components
──────────────────────────────────────────────────────────────────────────── */

function MiyaAvatar({ size = 'md', floating = false }: { size?: 'sm' | 'md' | 'lg'; floating?: boolean }) {
  const px = size === 'sm' ? 'w-8 h-8 rounded-xl text-xs' : size === 'lg' ? 'w-16 h-16 rounded-3xl text-2xl' : 'w-10 h-10 rounded-2xl text-sm';
  return (
    <div className={`${px} bg-gradient-to-br from-violet-600 via-cobalt to-blue-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-200/60 ${floating ? 'miya-float' : ''}`}>
      <span className="text-white font-bold">✦</span>
    </div>
  );
}

function CreatorCard({ c }: { c: TalentItem }) {
  const chip = ETF_CHIP[(c.etf_level || 'bronze').toLowerCase()] ?? ETF_CHIP.bronze;
  return (
    <div className="miya-card-in group bg-white border border-gray-200 rounded-2xl p-4 hover:border-cobalt/40 hover:shadow-lg hover:shadow-blue-100/60 transition-all duration-200">
      <div className="flex items-start gap-3">
        {c.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.avatar} alt={c.name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-gray-100" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-bold">
            {c.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
            {c.is_online && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online now" />}
          </div>
          {c.title && <p className="text-xs text-gray-500 truncate">{c.title}</p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {typeof c.rating === 'number' && c.rating > 0 && (
              <span className="text-xs text-amber-500 font-semibold">
                <i className="fa-solid fa-star text-[10px]" /> {c.rating.toFixed(1)}
                {c.review_count ? <span className="text-gray-400 font-normal"> ({c.review_count})</span> : null}
              </span>
            )}
            {c.etf_level && (
              <span className={`text-[10px] font-semibold uppercase tracking-wide border px-1.5 py-0.5 rounded-md ${chip}`}>
                {c.etf_level}
              </span>
            )}
          </div>
        </div>
      </div>
      {c.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {c.skills.slice(0, 4).map(s => (
            <span key={s} className="text-[11px] bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-lg">{s}</span>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-3.5">
        <Link
          href={`/client/collaborators/${c.id}`}
          className="flex-1 text-center text-xs font-semibold bg-gradient-to-r from-cobalt to-blue-500 text-white py-2 rounded-xl hover:shadow-md hover:shadow-blue-200 transition-all"
        >
          <i className="fa-solid fa-handshake mr-1.5" />Hire
        </Link>
        <Link
          href={`/client/messaging?userId=${c.id}`}
          className="flex-1 text-center text-xs font-semibold bg-white border border-gray-200 text-gray-700 py-2 rounded-xl hover:border-cobalt/40 hover:text-cobalt transition-all"
        >
          <i className="fa-regular fa-comment mr-1.5" />Message
        </Link>
      </div>
    </div>
  );
}

function ProjectCard({ p }: { p: JobPostItem }) {
  const statusColor: Record<string, string> = {
    active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    published: 'bg-blue-50 text-blue-700 border-blue-200',
    draft:     'bg-gray-50 text-gray-600 border-gray-200',
    completed: 'bg-violet-50 text-violet-700 border-violet-200',
    closed:    'bg-gray-100 text-gray-500 border-gray-200',
  };
  const chip = statusColor[p.status] ?? statusColor.draft;
  return (
    <Link
      href={`/client/projects/${p.id}`}
      className="miya-card-in block bg-white border border-gray-200 rounded-2xl p-4 hover:border-cobalt/40 hover:shadow-lg hover:shadow-blue-100/60 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-gray-900 text-sm leading-snug">{p.title}</p>
        <span className={`text-[10px] font-semibold uppercase tracking-wide border px-2 py-0.5 rounded-md shrink-0 ${chip}`}>
          {p.status}
        </span>
      </div>
      <div className="flex items-center gap-4 mt-2.5 text-xs text-gray-500 flex-wrap">
        {p.budget?.min != null && (
          <span><i className="fa-solid fa-coins text-amber-500 mr-1" />
            {p.budget.currency || 'USD'} {p.budget.min?.toLocaleString()}{p.budget.max ? `–${p.budget.max.toLocaleString()}` : ''}
          </span>
        )}
        <span><i className="fa-regular fa-file-lines mr-1" />{p.proposal_count} proposals</span>
        {p.deadline && <span><i className="fa-regular fa-clock mr-1" />{new Date(p.deadline).toLocaleDateString()}</span>}
      </div>
    </Link>
  );
}

function EtfExplainCard() {
  const rows = [
    { icon: 'fa-bullhorn',     label: 'Post a project',     pts: '+5'  },
    { icon: 'fa-handshake',    label: 'Hire a creator',     pts: '+20' },
    { icon: 'fa-lock',         label: 'Fund a milestone',   pts: '+10' },
    { icon: 'fa-unlock',       label: 'Release a milestone',pts: '+15' },
    { icon: 'fa-flag-checkered', label: 'Complete a project', pts: '+50' },
    { icon: 'fa-star',         label: 'Leave a review',     pts: '+15' },
  ];
  return (
    <div className="miya-card-in bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center"><i className="fa-solid fa-shield-halved text-sm" /></span>
        <p className="font-bold text-gray-900 text-sm">How you earn ETF Points</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2 text-xs">
            <span className="text-gray-700"><i className={`fa-solid ${r.icon} text-emerald-600 mr-1.5`} />{r.label}</span>
            <span className="font-bold text-emerald-700">{r.pts}</span>
          </div>
        ))}
      </div>
      <Link href="/client/etf" className="mt-3 inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800">
        View my ETF status <i className="fa-solid fa-arrow-right ml-1.5 text-[10px]" />
      </Link>
    </div>
  );
}

function PaymentsCard() {
  const steps = [
    { n: 1, t: 'Fund milestone', d: 'Money goes to secure escrow' },
    { n: 2, t: 'Creator delivers', d: 'Work uploaded for your review' },
    { n: 3, t: 'You approve', d: '5 business days to review' },
    { n: 4, t: 'Funds release', d: 'Creator gets paid — only then' },
  ];
  return (
    <div className="miya-card-in bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-xl bg-cobalt text-white flex items-center justify-center"><i className="fa-solid fa-vault text-sm" /></span>
        <p className="font-bold text-gray-900 text-sm">Escrow in 4 steps</p>
      </div>
      <div className="space-y-2">
        {steps.map(s => (
          <div key={s.n} className="flex items-center gap-3 bg-white/70 rounded-xl px-3 py-2">
            <span className="w-6 h-6 rounded-full bg-cobalt/10 text-cobalt text-xs font-bold flex items-center justify-center shrink-0">{s.n}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800">{s.t}</p>
              <p className="text-[11px] text-gray-500">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
      <Link href="/client/payments" className="mt-3 inline-flex items-center text-xs font-semibold text-cobalt hover:text-cobalt-deep">
        Go to payments <i className="fa-solid fa-arrow-right ml-1.5 text-[10px]" />
      </Link>
    </div>
  );
}

/* Markdown-lite renderer: **bold** + newlines + bullets */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, li) => (
        <p key={li} className={li > 0 ? 'mt-1.5' : ''}>
          {line.split('**').map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part))}
        </p>
      ))}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Main page
──────────────────────────────────────────────────────────────────────────── */

export default function ClientAiAssistantPage() {
  /* conversations */
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('general');

  /* chat */
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  /* panels (mobile) */
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  /* context-panel data */
  const [me, setMe] = useState<{ name: string; avatar: string; type: string } | null>(null);
  const [myProjects, setMyProjects] = useState<JobPostItem[]>([]);
  const [recommended, setRecommended] = useState<TalentItem[]>([]);
  const [etf, setEtf] = useState<EtfBalance | null>(null);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const active = convs.find(c => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];

  /* ── persistence ─────────────────────────────────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Conversation[] = JSON.parse(raw);
        setConvs(parsed);
      }
    } catch { /* corrupt storage — start fresh */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(convs.slice(0, 50))); } catch { /* quota */ }
  }, [convs]);

  /* ── context panel data ──────────────────────────────────────────────── */
  useEffect(() => {
    profileApi.getMe().then(u => {
      setMe({
        name: u.profile?.display_name || [u.profile?.first_name, u.profile?.last_name].filter(Boolean).join(' ') || u.username,
        avatar: u.profile?.profile_picture || '',
        type: u.account_type,
      });
    }).catch(() => {});
    jobs.getMe().then(list => setMyProjects(list.slice(0, 3))).catch(() => {});
    talent.search({ limit: 3 }).then(r => setRecommended(r.talent.slice(0, 3))).catch(() => {});
    etfPoints.me().then(setEtf).catch(() => {});
    notifApi.getAll(4).then(r => setNotifs(r.notifications.slice(0, 4))).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* ── conversation ops ────────────────────────────────────────────────── */
  const newChat = useCallback(() => {
    setActiveId(null);
    setLeftOpen(false);
    setInput('');
    textareaRef.current?.focus();
  }, []);

  const openConv = (id: string) => { setActiveId(id); setLeftOpen(false); };

  const toggleSave = (id: string) =>
    setConvs(prev => prev.map(c => (c.id === id ? { ...c, saved: !c.saved } : c)));

  const deleteConv = (id: string) => {
    setConvs(prev => prev.filter(c => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const clearChat = () => {
    if (!activeId) return;
    deleteConv(activeId);
  };

  /* ── send ────────────────────────────────────────────────────────────── */
  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isTyping) return;

    const userMsg: Message = { id: Date.now(), role: 'user', text: content, time: nowTime() };

    /* create conversation lazily on first message */
    let convId = activeId;
    if (!convId) {
      convId = newConvId();
      const title = content.length > 42 ? content.slice(0, 42) + '…' : content;
      setConvs(prev => [{ id: convId!, title, saved: false, updatedAt: Date.now(), messages: [userMsg] }, ...prev]);
      setActiveId(convId);
    } else {
      setConvs(prev => prev.map(c => (c.id === convId ? { ...c, updatedAt: Date.now(), messages: [...c.messages, userMsg] } : c)));
    }

    setInput('');
    setIsTyping(true);

    /* rich card lookup runs in parallel with the AI call */
    const cardKind = detectCard(content);
    let card: RichCard | undefined;
    const cardPromise = (async () => {
      try {
        if (cardKind === 'creators') {
          const skill = extractSkill(content);
          const r = await talent.search({ q: skill, limit: 4 });
          if (r.talent.length) card = { kind: 'creators', items: r.talent.slice(0, 4) };
        } else if (cardKind === 'projects') {
          const list = await jobs.getMe();
          if (list.length) card = { kind: 'projects', items: list.slice(0, 4) };
        } else if (cardKind === 'etf') {
          card = { kind: 'etf' };
        } else if (cardKind === 'payments') {
          card = { kind: 'payments' };
        }
      } catch { /* card is optional */ }
    })();

    let replyText: string;
    try {
      const historyBase = (convs.find(c => c.id === convId)?.messages ?? []);
      const history = [...historyBase, userMsg].map(m => ({ role: m.role, content: m.text }));
      const res = await aiChat.send(history);
      replyText = res.response;
    } catch {
      await new Promise(r => setTimeout(r, 700));
      replyText = getMiyaFallback(content);
    }
    await cardPromise;

    const aiMsg: Message = { id: Date.now() + 1, role: 'assistant', text: replyText, time: nowTime(), card };
    setIsTyping(false);
    setConvs(prev => prev.map(c => (c.id === convId ? { ...c, updatedAt: Date.now(), messages: [...c.messages, aiMsg] } : c)));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const recent = convs.filter(c => !c.saved);
  const saved = convs.filter(c => c.saved);

  /* ── sidebar conversation row ────────────────────────────────────────── */
  const ConvRow = ({ c }: { c: Conversation }) => (
    <div
      className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all text-sm ${
        c.id === activeId ? 'bg-cobalt/10 text-cobalt font-medium' : 'text-gray-600 hover:bg-gray-100'
      }`}
      onClick={() => openConv(c.id)}
    >
      <i className={`fa-regular fa-message text-xs shrink-0 ${c.id === activeId ? 'text-cobalt' : 'text-gray-400'}`} />
      <span className="truncate flex-1">{c.title}</span>
      <button
        onClick={e => { e.stopPropagation(); toggleSave(c.id); }}
        className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs ${c.saved ? 'text-amber-500 opacity-100' : 'text-gray-400 hover:text-amber-500'}`}
        title={c.saved ? 'Unsave' : 'Save'}
      >
        <i className={`${c.saved ? 'fa-solid' : 'fa-regular'} fa-bookmark`} />
      </button>
      <button
        onClick={e => { e.stopPropagation(); deleteConv(c.id); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-400 hover:text-red-500"
        title="Delete"
      >
        <i className="fa-regular fa-trash-can" />
      </button>
    </div>
  );

  /* ── left sidebar content (shared desktop + mobile drawer) ───────────── */
  const LeftSidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <MiyaAvatar size="md" />
        <div>
          <p className="font-bold text-gray-900 leading-tight">Miya</p>
          <p className="text-[11px] text-gray-400 leading-tight">AI Assistant</p>
        </div>
      </div>

      {/* New chat */}
      <div className="px-3 pb-3">
        <button
          onClick={newChat}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cobalt to-blue-500 text-white text-sm font-semibold py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-200/80 active:scale-[0.98] transition-all"
        >
          <i className="fa-solid fa-plus text-xs" /> New Chat
        </button>
      </div>

      {/* Modes */}
      <div className="px-3 pb-2">
        <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Assistants</p>
        <div className="space-y-0.5">
          {(Object.keys(MODES) as Mode[]).filter(m => m !== 'general').map(m => (
            <button
              key={m}
              onClick={() => { setMode(prev => (prev === m ? 'general' : m)); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                mode === m ? 'bg-violet-50 text-violet-700 font-medium border border-violet-200' : 'text-gray-600 hover:bg-gray-100 border border-transparent'
              }`}
            >
              <i className={`fa-solid ${MODES[m].icon} text-xs w-4 ${mode === m ? 'text-violet-600' : 'text-gray-400'}`} />
              <span className="flex-1 text-left">{MODES[m].label}</span>
              {mode === m && <i className="fa-solid fa-check text-[10px] text-violet-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {saved.length > 0 && (
          <div>
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Saved</p>
            <div className="space-y-0.5">{saved.map(c => <ConvRow key={c.id} c={c} />)}</div>
          </div>
        )}
        <div>
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Recent</p>
          {recent.length === 0 ? (
            <p className="px-2 text-xs text-gray-400">No conversations yet</p>
          ) : (
            <div className="space-y-0.5">{recent.map(c => <ConvRow key={c.id} c={c} />)}</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-3 py-3">
        <Link href="/client/profile" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors">
          <i className="fa-solid fa-gear text-xs w-4 text-gray-400" /> Settings
        </Link>
      </div>
    </div>
  );

  /* ── right context panel content ─────────────────────────────────────── */
  const RightPanel = (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      {/* Profile */}
      {me && (
        <div className="bg-gradient-to-br from-gray-50 to-blue-50/50 border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            {me.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatar} alt={me.name} className="w-11 h-11 rounded-xl object-cover ring-2 ring-white shadow-sm" />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cobalt to-blue-500 text-white font-bold flex items-center justify-center shadow-sm">
                {me.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{me.name}</p>
              <p className="text-xs text-gray-400 capitalize">{me.type === 'producer' ? 'Client' : me.type}</p>
            </div>
          </div>
          {etf && (
            <div className="mt-3 bg-white/80 rounded-xl p-3 border border-gray-100">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-gray-700 capitalize">
                  <i className="fa-solid fa-medal mr-1.5" style={{ color: etf.level.color }} />
                  {etf.level.label}
                </span>
                <span className="font-bold text-cobalt">{etf.balance.toLocaleString()} pts</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cobalt to-blue-400 rounded-full transition-all duration-700" style={{ width: `${etf.level.progress_pct}%` }} />
              </div>
              {etf.level.next_min_points != null && (
                <p className="text-[10px] text-gray-400 mt-1">{(etf.level.next_min_points - etf.lifetime_points).toLocaleString()} pts to next level</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Current projects */}
      {myProjects.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Current Projects</p>
          <div className="space-y-2">
            {myProjects.map(p => (
              <Link key={p.id} href={`/client/projects/${p.id}`} className="block bg-white border border-gray-200 rounded-xl px-3 py-2.5 hover:border-cobalt/40 transition-colors">
                <p className="text-xs font-semibold text-gray-800 truncate">{p.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{p.status} · {p.proposal_count} proposals</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recommended creators */}
      {recommended.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Recommended Creators</p>
          <div className="space-y-2">
            {recommended.map(c => (
              <Link key={c.id} href={`/client/collaborators/${c.id}`} className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-3 py-2.5 hover:border-cobalt/40 transition-colors">
                {c.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatar} alt={c.name} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center">{c.name.charAt(0)}</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 truncate">{c.name}</p>
                  <p className="text-[11px] text-gray-400 truncate">{c.title || c.skills?.[0] || 'Creator'}</p>
                </div>
                {typeof c.rating === 'number' && c.rating > 0 && (
                  <span className="text-[11px] text-amber-500 font-semibold shrink-0"><i className="fa-solid fa-star text-[9px]" /> {c.rating.toFixed(1)}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      {notifs.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Recent Activity</p>
          <div className="space-y-1.5">
            {notifs.map(n => (
              <div key={n.id} className="bg-white border border-gray-100 rounded-xl px-3 py-2">
                <p className="text-[11px] font-medium text-gray-700 leading-snug">{n.title}</p>
                {n.message && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <div className="h-[calc(100vh-9.5rem)] md:h-[calc(100vh-11rem)] -mx-4 md:mx-0">
      {/* Page-scoped animations */}
      <style>{`
        @keyframes miyaFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        .miya-float { animation: miyaFloat 3.5s ease-in-out infinite; }
        @keyframes miyaIn { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        .miya-msg-in { animation: miyaIn .28s ease-out both; }
        .miya-card-in { animation: miyaIn .4s ease-out both; }
        @keyframes miyaPulse { 0%,100% { opacity: .4 } 50% { opacity: 1 } }
        .miya-dot { animation: miyaPulse 1.2s ease-in-out infinite; }
        @keyframes miyaGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(25,90,215,.18) } 50% { box-shadow: 0 0 0 6px rgba(25,90,215,0) } }
        .miya-online { animation: miyaGlow 2.4s ease-in-out infinite; }
      `}</style>

      <div className="flex h-full gap-0 lg:gap-4">

        {/* ── LEFT SIDEBAR (desktop) ─────────────────────────────────── */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {LeftSidebar}
        </aside>

        {/* ── LEFT DRAWER (mobile) ───────────────────────────────────── */}
        {leftOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setLeftOpen(false)} />
            <aside className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden shadow-2xl flex flex-col">
              <button onClick={() => setLeftOpen(false)} className="absolute top-3 right-3 w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 flex items-center justify-center">
                <i className="fa-solid fa-xmark" />
              </button>
              {LeftSidebar}
            </aside>
          </>
        )}

        {/* ── MAIN CHAT ──────────────────────────────────────────────── */}
        <section className="flex-1 min-w-0 flex flex-col bg-white lg:border lg:border-gray-200 lg:rounded-2xl lg:shadow-sm overflow-hidden">

          {/* Header — glassmorphism */}
          <div className="flex items-center justify-between gap-3 px-4 lg:px-5 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setLeftOpen(true)} className="lg:hidden w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-bars-staggered" />
              </button>
              <div className="relative shrink-0">
                <MiyaAvatar size="md" />
                <span className="miya-online absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{active?.title ?? MODES[mode].label}</p>
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Online · {MODES[mode].hint}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {active && (
                <button
                  onClick={clearChat}
                  className="h-9 px-3 rounded-xl text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Clear chat"
                >
                  <i className="fa-regular fa-trash-can mr-1.5" /><span className="hidden sm:inline">Clear</span>
                </button>
              )}
              <button onClick={() => setRightOpen(o => !o)} className="xl:hidden w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 flex items-center justify-center" title="Context panel">
                <i className="fa-solid fa-sidebar-flip fa-table-columns" />
              </button>
            </div>
          </div>

          {/* Messages / welcome */}
          <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 bg-gradient-to-b from-gray-50/80 to-white">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-full text-center py-6">
                <MiyaAvatar size="lg" floating />
                <h2 className="mt-5 text-2xl font-bold text-gray-900">Hi, I&apos;m Miya 👋</h2>
                <p className="mt-2 text-sm text-gray-500 max-w-md">
                  I can help you find creators, manage projects, answer platform questions, and streamline your workflow.
                </p>

                {/* Suggested actions grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl mt-8">
                  {SUGGESTED_ACTIONS.map((a, i) => (
                    <button
                      key={a.label}
                      onClick={() => sendMessage(a.prompt)}
                      className="miya-card-in group flex flex-col items-start gap-2.5 bg-white border border-gray-200 rounded-2xl p-4 text-left hover:border-cobalt/40 hover:shadow-lg hover:shadow-blue-100/50 hover:-translate-y-0.5 transition-all duration-200"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${a.gradient} text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                        <i className={`fa-solid ${a.icon} text-sm`} />
                      </span>
                      <span className="text-xs font-semibold text-gray-800 leading-snug">{a.label}</span>
                    </button>
                  ))}
                </div>

                {/* Mode prompts */}
                {mode !== 'general' && (
                  <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-xl">
                    {MODE_PROMPTS[mode].map(p => (
                      <button
                        key={p}
                        onClick={() => sendMessage(p)}
                        className="text-xs bg-violet-50 border border-violet-200 text-violet-700 px-3 py-1.5 rounded-full hover:bg-violet-100 transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5 max-w-3xl mx-auto">
                {messages.map(m => (
                  <div key={m.id} className={`miya-msg-in flex items-end gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {m.role === 'assistant' && <MiyaAvatar size="sm" />}
                    <div className={`min-w-0 max-w-[85%] sm:max-w-lg flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-gradient-to-br from-cobalt to-blue-500 text-white rounded-br-md shadow-md shadow-blue-200/50'
                          : 'bg-white text-gray-800 rounded-bl-md border border-gray-200 shadow-sm'
                      }`}>
                        <RichText text={m.text} />
                      </div>

                      {/* Rich cards */}
                      {m.card?.kind === 'creators' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 w-full">
                          {m.card.items.map(c => <CreatorCard key={c.id} c={c} />)}
                        </div>
                      )}
                      {m.card?.kind === 'projects' && (
                        <div className="space-y-2.5 mt-3 w-full">
                          {m.card.items.map(p => <ProjectCard key={p.id} p={p} />)}
                        </div>
                      )}
                      {m.card?.kind === 'etf' && <div className="mt-3 w-full"><EtfExplainCard /></div>}
                      {m.card?.kind === 'payments' && <div className="mt-3 w-full"><PaymentsCard /></div>}

                      <p className="text-[10px] text-gray-400 mt-1.5 px-1">{m.time}</p>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="miya-msg-in flex items-end gap-2.5">
                    <MiyaAvatar size="sm" />
                    <div className="bg-white rounded-2xl rounded-bl-md border border-gray-200 shadow-sm px-4 py-3.5">
                      <div className="flex gap-1.5 items-center">
                        {[0, 1, 2].map(i => (
                          <span key={i} className="miya-dot w-2 h-2 bg-cobalt rounded-full" style={{ animationDelay: `${i * 0.2}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 lg:px-6 py-3.5 bg-white border-t border-gray-100">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-2.5 bg-gray-50 rounded-2xl border border-gray-200 p-2.5 pl-4 focus-within:border-cobalt/50 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-100/40 transition-all duration-200">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Miya anything…"
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-gray-900 outline-none resize-none placeholder-gray-400 leading-relaxed py-1.5 max-h-32"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isTyping}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    input.trim() && !isTyping
                      ? 'bg-gradient-to-r from-cobalt to-blue-500 text-white hover:shadow-md hover:shadow-blue-200 active:scale-95'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  aria-label="Send"
                >
                  <i className="fa-solid fa-paper-plane text-sm" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                Miya can make mistakes. Always verify important decisions independently.
              </p>
            </div>
          </div>
        </section>

        {/* ── RIGHT CONTEXT PANEL (desktop ≥xl) ──────────────────────── */}
        <aside className="hidden xl:block w-72 shrink-0 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {RightPanel}
        </aside>

        {/* ── RIGHT DRAWER (below xl) ────────────────────────────────── */}
        {rightOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40 xl:hidden" onClick={() => setRightOpen(false)} />
            <aside className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white z-50 xl:hidden shadow-2xl">
              <button onClick={() => setRightOpen(false)} className="absolute top-3 right-3 w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 flex items-center justify-center z-10">
                <i className="fa-solid fa-xmark" />
              </button>
              {RightPanel}
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
