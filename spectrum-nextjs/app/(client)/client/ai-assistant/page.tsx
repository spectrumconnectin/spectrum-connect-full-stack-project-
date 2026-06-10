'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MiyaMark from '@/components/MiyaIcon';
import {
  aiChat, talent, jobs, profile as profileApi, etfPoints, notifications as notifApi,
} from '@/lib/api';
import type { TalentItem, JobPostItem, EtfBalance, EtfEvent, NotificationItem } from '@/lib/api';

/* ────────────────────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────────────────── */

type RichCard =
  | { kind: 'creators'; items: TalentItem[] }
  | { kind: 'projects'; items: JobPostItem[] }
  | { kind: 'etf' }
  | { kind: 'payments' };

type QuickReply = { label: string; prompt?: string; href?: string };

type Message = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  time: string;
  card?: RichCard;
  quickReplies?: QuickReply[];
};

type Conversation = {
  id: string;
  title: string;
  saved: boolean;
  updatedAt: number;
  messages: Message[];
};

type Mode = 'project' | 'creator' | 'help';

type ProjectContext = {
  project: JobPostItem;
  progressPct: number;
  fundedActive: number;     // funded but not yet released milestones
  totalMilestones: number;
};

const STORAGE_KEY = 'miya_conversations_v1';

/* ────────────────────────────────────────────────────────────────────────────
   Static metadata
──────────────────────────────────────────────────────────────────────────── */

const MODES: Record<Mode, { label: string; icon: string }> = {
  project: { label: 'Project Assistant', icon: 'fa-compass' },
  creator: { label: 'Creator Assistant', icon: 'fa-users' },
  help:    { label: 'Platform Help',     icon: 'fa-circle-question' },
};

const SUGGESTED_ACTIONS: { label: string; sub: string; icon: string; prompt: string }[] = [
  { label: 'Find a Video Editor',  sub: 'Search top-rated creators', icon: 'fa-video',          prompt: 'Find me a video editor' },
  { label: 'Create a New Project', sub: 'Draft a project brief',     icon: 'fa-square-plus',    prompt: 'Help me create a new project' },
  { label: 'Recommend Creators',   sub: 'Based on your past work',   icon: 'fa-star',           prompt: 'Recommend some top creators for me' },
  { label: 'Explain ETF',          sub: 'Understand escrow terms',   icon: 'fa-file-invoice-dollar', prompt: 'Explain how ETF points work' },
  { label: 'Help With Payments',   sub: 'Billing and invoices',      icon: 'fa-wallet',         prompt: 'How do payments and escrow work?' },
  { label: 'Review My Project',    sub: 'Analyze project health',    icon: 'fa-chart-line',     prompt: 'Review my current projects' },
];

const MODE_PROMPTS: Record<Mode, string[]> = {
  project: [
    'Help me write a great project brief',
    'What budget should I set for a brand video?',
    'Suggest a timeline for event coverage',
    'Review my current projects',
  ],
  creator: [
    'Find me a video editor',
    'Recommend top-rated creators',
    'How do I evaluate creator proposals?',
  ],
  help: [
    'Explain how ETF points work',
    'How do payments and escrow work?',
    'How do disputes get resolved?',
    'What is Smart Connect?',
  ],
};

const ETF_CHIP: Record<string, string> = {
  bronze:   'bg-orange-50 text-orange-600 border-orange-200',
  silver:   'bg-slate-100 text-slate-600 border-slate-300',
  gold:     'bg-amber-50 text-amber-600 border-amber-300',
  platinum: 'bg-violet-50 text-violet-600 border-violet-300',
  diamond:  'bg-cyan-50 text-cyan-600 border-cyan-300',
};

/* ────────────────────────────────────────────────────────────────────────────
   Smart query parsing — role / budget / duration extraction
──────────────────────────────────────────────────────────────────────────── */

const KNOWN_ROLES = [
  'motion graphics designer', 'video editor', 'graphic designer', 'sound designer',
  'photographer', 'videographer', 'cinematographer', 'animator', 'colorist',
  'editor', 'designer', 'director', 'producer', 'writer', 'composer',
];

function parseCreatorQuery(input: string): { role?: string; budget?: number; duration?: string } {
  const q = input.toLowerCase();
  const out: { role?: string; budget?: number; duration?: string } = {};

  for (const r of KNOWN_ROLES) {
    if (q.includes(r)) { out.role = r; break; }
  }

  const budgetMatch = q.match(/\$\s?([\d,]+)(?:\s?k)?/) || q.match(/([\d,]+)\s?(?:usd|dollars|lkr|rupees)/);
  if (budgetMatch) {
    const n = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(n)) out.budget = q.includes('k') && n < 1000 ? n * 1000 : n;
  }

  const durMatch = q.match(/(\d+)[\s-]?(week|day|month)s?/);
  if (durMatch) out.duration = `${durMatch[1]}-${durMatch[2]}`;

  return out;
}

function detectCard(input: string): RichCard['kind'] | null {
  const q = input.toLowerCase();
  const creatorWords = ['editor', 'creator', 'photographer', 'videographer', 'designer', 'animator', 'colorist', 'director', 'freelancer'];
  if ((q.includes('find') || q.includes('recommend') || q.includes('search') || q.includes('show me') || q.includes('more options') || q.includes('more creators')) && creatorWords.some(w => q.includes(w))) return 'creators';
  if (q.includes('show more options') || q.includes('show more creators')) return 'creators';
  if (q.includes('review my') || q.includes('my project') || (q.includes('track') && q.includes('project')) || q.includes('project health')) return 'projects';
  if (q.includes('etf') || (q.includes('trust') && q.includes('point'))) return 'etf';
  if (q.includes('payment') || q.includes('escrow') || q.includes('billing') || q.includes('invoice')) return 'payments';
  return null;
}

function quickRepliesFor(kind: RichCard['kind'] | null): QuickReply[] | undefined {
  switch (kind) {
    case 'creators':
      return [
        { label: 'Show more options', prompt: 'Show more creator options' },
        { label: 'Create job posting instead', href: '/client/projects/create' },
      ];
    case 'projects':
      return [
        { label: 'Post a new project', href: '/client/projects/create' },
        { label: 'Explain escrow', prompt: 'How does escrow protect my payments?' },
      ];
    case 'etf':
      return [
        { label: 'View my ETF status', href: '/client/etf' },
        { label: 'How do I earn more points?', prompt: 'What is the fastest way to earn more ETF points?' },
      ];
    case 'payments':
      return [
        { label: 'Open payments', href: '/client/payments' },
        { label: 'How do disputes work?', prompt: 'How do disputes get resolved?' },
      ];
    default:
      return undefined;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   Local fallback brain
──────────────────────────────────────────────────────────────────────────── */

function getMiyaFallback(input: string, parsed?: { role?: string; budget?: number; duration?: string }, found = 0): string {
  const q = input.toLowerCase();

  if (detectCard(input) === 'creators') {
    if (found > 0) {
      const bits: string[] = [];
      if (parsed?.duration) bits.push(`a ${parsed.duration.replace('-', ' ')} engagement`);
      if (parsed?.budget) bits.push(`within your $${parsed.budget.toLocaleString()} budget`);
      const tail = bits.length ? ` available for ${bits.join(' ')}` : '';
      const role = parsed?.role ? `${parsed.role}s` : 'creators';
      return `I found ${found} highly-rated ${role}${tail}. Here are my top recommendations based on ratings, ETF trust level, and availability:`;
    }
    return `I couldn't find an exact match for that search right now. Try broadening the role, or post the project publicly — creators apply within hours and you can compare proposals side by side.`;
  }
  if (q.includes('etf') || (q.includes('trust') && q.includes('point'))) {
    return `**ETF — Earn Trust Framework** is Spectrum's trust system. You earn points for genuine platform activity:\n\n• **Post a project** — +5 pts\n• **Hire a creator** — +20 pts\n• **Fund a milestone** — +10 pts\n• **Release a milestone** — +15 pts\n• **Complete a project** — +50 pts\n• **Leave a review** — +15 pts\n\nPoints move you through levels: **Bronze → Silver (250) → Gold (1,000) → Platinum (5,000)**. Higher levels unlock better creator matching, priority support, and at Platinum — cash-out eligibility.`;
  }
  if (q.includes('earn more') || q.includes('fastest way')) {
    return `The fastest path to more ETF points:\n\n1. **Complete projects end-to-end** (+50) — the single biggest award\n2. **Release milestones promptly** (+15 each) — split projects into 3+ milestones\n3. **Leave reviews** (+15) — takes 2 minutes after every project\n4. **Hire repeat creators** — repeat collaborations earn bonus points\n\nConsistent, genuine activity beats anything else — self-jobs and fake projects never earn points.`;
  }
  if (q.includes('payment') || q.includes('escrow') || q.includes('billing')) {
    return `Spectrum protects every payment with **milestone escrow**:\n\n1. **You fund a milestone** — money is held in secure escrow, not sent to the creator.\n2. **Creator delivers** — they upload work and request release.\n3. **You review** — approve, or request revisions within 5 business days.\n4. **Funds release** — payment transfers only when you approve.\n\nIf anything goes wrong, open a dispute and our resolution team steps in. Never pay outside the platform — you lose all protection.`;
  }
  if (q.includes('project') && (q.includes('create') || q.includes('new') || q.includes('post') || q.includes('brief') || q.includes('write'))) {
    return `Let's set your project up for success. A great brief includes:\n\n**1. Project overview** — what you're making and why.\n**2. Deliverables** — exact files, formats, durations.\n**3. Budget range** — creators propose within it; leave 10–15% buffer.\n**4. Timeline** — key dates with breathing room.\n**5. References** — examples of styles you love.\n**6. Brand assets** — logo, colors, fonts, tone.\n\nReady to start? Hit **Create job posting** below and I'll be right here if you need help with any field.`;
  }
  if (q.includes('review my') || q.includes('my project') || q.includes('project health') || q.includes('track')) {
    return `Here's a snapshot of your current projects. Tap any card to open the full workspace — milestones, escrow, deliverables, and your team are all there.`;
  }
  if (q.includes('budget') || q.includes('cost') || q.includes('price')) {
    return `Rough benchmarks on Spectrum:\n\n• **Logo design** — $300–$2,500\n• **Brand identity** — $1,500–$8,000\n• **Event photography** — $200–$1,500/day\n• **Video editing** — $500–$5,000 per piece\n• **Full event coverage** — $800–$5,000\n\nPost with a budget *range* and let creators propose — you're never locked in until you accept. I'd suggest a 10–15% buffer for revisions.`;
  }
  if (q.includes('proposal') || q.includes('evaluate')) {
    return `When comparing proposals, look beyond price:\n\n1. **Portfolio relevance** — similar work before?\n2. **Proposal quality** — did they actually read your brief?\n3. **Questions asked** — smart questions signal experience.\n4. **Timeline realism** — overpromising speed is a red flag.\n5. **ETF level & reviews** — platform-verified track record.\n\nShortlist 3–5, message each, and trust your instinct on communication fit.`;
  }
  if (q.includes('dispute')) {
    return `If a project goes sideways:\n\n1. **Open a dispute** from the project page — describe the issue and attach evidence.\n2. **Both sides respond** — the creator replies with their evidence.\n3. **Resolution team reviews** — typically within 3–5 business days.\n4. **Funds are awarded** — to whichever side the evidence supports, or split.\n\nEscrowed funds stay frozen during a dispute, so your money is never released without a ruling.`;
  }
  if (q.includes('smart connect')) {
    return `**Smart Connect** is Spectrum's matching engine. Describe what you need and it ranks the best-fit creators using skills, availability, ratings, ETF trust level, and past project success.\n\nHigher ETF levels get you priority matching — another reason to keep collaborating on-platform.`;
  }
  if (q.includes('hello') || q.includes('hi ') || q === 'hi' || q.includes('hey')) {
    return `Hey! I'm Miya — your intelligent assistant on Spectrum. I can find creators, draft project briefs, explain payments and ETF, track project health, and answer anything about the platform.\n\nWhat are we working on today?`;
  }
  if (q.includes('what can you')) {
    return `Here's what I can do:\n\n• **Find creators** — search by role, budget, and trust level\n• **Create projects** — briefs, budgets, timelines\n• **Track project health** — progress, milestones, escrow at a glance\n• **Explain the platform** — ETF, Smart Connect, disputes, payments\n• **Evaluate proposals** — frameworks to pick the right creator\n\nTry a suggestion below, or just ask in your own words.`;
  }
  return `Good question! I can help with finding creators, writing briefs, budgets, timelines, payments & escrow, ETF points, and anything else on Spectrum.\n\nTell me a bit more about what you're trying to do — the more context, the better my answer.`;
}

/* ────────────────────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────────────────────── */

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const newConvId = () => `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function activityIcon(action: string): { icon: string; bg: string } {
  if (action.includes('milestone.released')) return { icon: 'fa-dollar-sign',   bg: 'bg-emerald-100 text-emerald-600' };
  if (action.includes('milestone'))          return { icon: 'fa-lock',          bg: 'bg-blue-100 text-blue-600' };
  if (action.includes('project.completed'))  return { icon: 'fa-flag-checkered',bg: 'bg-violet-100 text-violet-600' };
  if (action.includes('project'))            return { icon: 'fa-briefcase',     bg: 'bg-blue-100 text-cobalt' };
  if (action.includes('review'))             return { icon: 'fa-star',          bg: 'bg-amber-100 text-amber-600' };
  if (action.includes('hire'))               return { icon: 'fa-handshake',     bg: 'bg-indigo-100 text-indigo-600' };
  return { icon: 'fa-bolt', bg: 'bg-gray-100 text-gray-500' };
}

/* ────────────────────────────────────────────────────────────────────────────
   Sub-components
──────────────────────────────────────────────────────────────────────────── */

function BotAvatar({ size = 'md', online = false }: { size?: 'sm' | 'md'; online?: boolean }) {
  return (
    <div className="relative shrink-0">
      <MiyaMark size={size === 'sm' ? 32 : 40} className="drop-shadow-sm" />
      {online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />}
    </div>
  );
}

function CreatorCard({ c }: { c: TalentItem }) {
  const chip = ETF_CHIP[(c.etf_level || 'bronze').toLowerCase()] ?? ETF_CHIP.bronze;
  const rate = c.hourly_rate_min ? `$${c.hourly_rate_min}/hr` : null;
  return (
    <div className="miya-card-in bg-white border border-gray-200 rounded-2xl p-4 hover:border-cobalt/40 hover:shadow-md transition-all duration-200">
      <div className="flex items-start gap-3">
        {c.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.avatar} alt={c.name} className="w-11 h-11 rounded-full object-cover ring-1 ring-gray-200" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
            {c.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
            {c.etf_level && (
              <span className={`text-[9px] font-bold uppercase tracking-wide border px-1.5 py-px rounded ${chip}`}>
                <i className="fa-solid fa-shield-halved mr-0.5" />ETF
              </span>
            )}
            {c.is_online && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online now" />}
          </div>
          {c.title && <p className="text-xs text-gray-500 truncate mt-0.5">{c.title}</p>}
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
            {typeof c.rating === 'number' && c.rating > 0 && (
              <>
                <i className="fa-solid fa-star text-amber-400 text-[10px]" />
                <span className="font-semibold text-gray-700">{c.rating.toFixed(1)}</span>
                {c.review_count ? <span className="text-gray-400">({c.review_count})</span> : null}
              </>
            )}
            {rate && <><span className="text-gray-300">·</span><span>{rate}</span></>}
          </div>
        </div>
      </div>
      {c.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {c.skills.slice(0, 3).map(s => (
            <span key={s} className="text-[11px] bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-md">{s}</span>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-3.5">
        <Link
          href={`/client/collaborators/${c.id}`}
          className="flex-1 text-center text-xs font-semibold bg-cobalt text-white py-2.5 rounded-lg hover:bg-cobalt-2 transition-colors"
        >
          Hire
        </Link>
        <Link
          href={`/client/messaging?userId=${c.id}`}
          className="flex-1 text-center text-xs font-semibold bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:border-cobalt hover:text-cobalt transition-colors"
        >
          Message
        </Link>
      </div>
    </div>
  );
}

function ProjectCard({ p }: { p: JobPostItem }) {
  const statusColor: Record<string, string> = {
    active:    'bg-emerald-50 text-emerald-600 border-emerald-200',
    published: 'bg-blue-50 text-blue-600 border-blue-200',
    draft:     'bg-gray-50 text-gray-500 border-gray-200',
    completed: 'bg-violet-50 text-violet-600 border-violet-200',
    closed:    'bg-gray-100 text-gray-500 border-gray-200',
  };
  const chip = statusColor[p.status] ?? statusColor.draft;
  return (
    <Link
      href={`/client/projects/${p.id}`}
      className="miya-card-in block bg-white border border-gray-200 rounded-2xl p-4 hover:border-cobalt/40 hover:shadow-md transition-all duration-200"
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
    { icon: 'fa-bullhorn',       label: 'Post a project',      pts: '+5'  },
    { icon: 'fa-handshake',      label: 'Hire a creator',      pts: '+20' },
    { icon: 'fa-lock',           label: 'Fund a milestone',    pts: '+10' },
    { icon: 'fa-unlock',         label: 'Release a milestone', pts: '+15' },
    { icon: 'fa-flag-checkered', label: 'Complete a project',  pts: '+50' },
    { icon: 'fa-star',           label: 'Leave a review',      pts: '+15' },
  ];
  return (
    <div className="miya-card-in bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-8 h-8 rounded-lg bg-blue-50 text-cobalt flex items-center justify-center"><i className="fa-solid fa-shield-halved text-sm" /></span>
        <p className="font-bold text-gray-900 text-sm">How you earn ETF Points</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
            <span className="text-gray-700"><i className={`fa-solid ${r.icon} text-cobalt mr-1.5 w-4`} />{r.label}</span>
            <span className="font-bold text-cobalt">{r.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentsCard() {
  const steps = [
    { n: 1, t: 'Fund milestone',   d: 'Money goes to secure escrow' },
    { n: 2, t: 'Creator delivers', d: 'Work uploaded for your review' },
    { n: 3, t: 'You approve',      d: '5 business days to review' },
    { n: 4, t: 'Funds release',    d: 'Creator gets paid — only then' },
  ];
  return (
    <div className="miya-card-in bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-8 h-8 rounded-lg bg-blue-50 text-cobalt flex items-center justify-center"><i className="fa-solid fa-vault text-sm" /></span>
        <p className="font-bold text-gray-900 text-sm">Escrow in 4 steps</p>
      </div>
      <div className="space-y-2">
        {steps.map(s => (
          <div key={s.n} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
            <span className="w-6 h-6 rounded-full bg-cobalt/10 text-cobalt text-xs font-bold flex items-center justify-center shrink-0">{s.n}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800">{s.t}</p>
              <p className="text-[11px] text-gray-500">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const router = useRouter();

  /* conversations */
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('project');

  /* chat */
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [shared, setShared] = useState(false);

  /* panels (mobile) */
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  /* context-panel data */
  const [me, setMe] = useState<{ name: string; avatar: string; type: string } | null>(null);
  const [projCtx, setProjCtx] = useState<ProjectContext | null>(null);
  const [etf, setEtf] = useState<EtfBalance | null>(null);
  const [events, setEvents] = useState<EtfEvent[]>([]);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastQueryRef = useRef<{ role?: string; budget?: number; duration?: string }>({});

  const active = convs.find(c => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];

  /* ── persistence ─────────────────────────────────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setConvs(JSON.parse(raw));
    } catch { /* corrupt storage — start fresh */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(convs.slice(0, 50))); } catch { /* quota */ }
  }, [convs]);

  /* ── ⌘K new chat ─────────────────────────────────────────────────────── */
  const newChat = useCallback(() => {
    setActiveId(null);
    setLeftOpen(false);
    setInput('');
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        newChat();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [newChat]);

  /* ── workspace context data ──────────────────────────────────────────── */
  useEffect(() => {
    profileApi.getMe().then(u => {
      setMe({
        name: u.profile?.display_name || [u.profile?.first_name, u.profile?.last_name].filter(Boolean).join(' ') || u.username,
        avatar: u.profile?.profile_picture || '',
        type: u.account_type,
      });
    }).catch(() => {});

    /* current project + real escrow-derived progress */
    jobs.getMe().then(async list => {
      const current = list.find(p => p.status === 'active') || list.find(p => p.status === 'published') || list[0];
      if (!current) return;
      let progressPct = 0, fundedActive = 0, totalMilestones = 0;
      try {
        const team = await jobs.getTeam(current.id);
        let released = 0, funded = 0;
        for (const t of team) {
          if (!t.escrow) continue;
          totalMilestones += t.escrow.milestone_count;
          released += t.escrow.released_milestones;
          funded   += t.escrow.funded_milestones;
        }
        progressPct = totalMilestones > 0 ? Math.round((released / totalMilestones) * 100) : 0;
        fundedActive = Math.max(0, funded - released);
      } catch { /* escrow info optional */ }
      setProjCtx({ project: current, progressPct, fundedActive, totalMilestones });
    }).catch(() => {});

    etfPoints.me().then(setEtf).catch(() => {});
    etfPoints.events({ limit: 4 }).then(r => setEvents(r.events ?? [])).catch(() => {});
    notifApi.getAll(4).then(r => { setNotifs(r.notifications.slice(0, 4)); setUnread(r.unread_count); }).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* ── conversation ops ────────────────────────────────────────────────── */
  const openConv = (id: string) => { setActiveId(id); setLeftOpen(false); };

  const toggleSave = (id: string) =>
    setConvs(prev => prev.map(c => (c.id === id ? { ...c, saved: !c.saved } : c)));

  const deleteConv = (id: string) => {
    setConvs(prev => prev.filter(c => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const shareConv = async () => {
    if (!active) return;
    const lines = active.messages.map(m => `${m.role === 'user' ? 'You' : 'Miya'} (${m.time}):\n${m.text}`);
    try {
      await navigator.clipboard.writeText(`Miya conversation — ${active.title}\n\n${lines.join('\n\n')}`);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  /* ── send ────────────────────────────────────────────────────────────── */
  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isTyping) return;

    const userMsg: Message = { id: Date.now(), role: 'user', text: content, time: nowTime() };

    let convId = activeId;
    if (!convId) {
      convId = newConvId();
      const title = content.length > 38 ? content.slice(0, 38) + '…' : content;
      setConvs(prev => [{ id: convId!, title, saved: false, updatedAt: Date.now(), messages: [userMsg] }, ...prev]);
      setActiveId(convId);
    } else {
      setConvs(prev => prev.map(c => (c.id === convId ? { ...c, updatedAt: Date.now(), messages: [...c.messages, userMsg] } : c)));
    }

    setInput('');
    setIsTyping(true);

    /* rich card lookup in parallel with the AI call */
    const cardKind = detectCard(content);
    const isMoreRequest = content.toLowerCase().includes('more option') || content.toLowerCase().includes('more creator');
    const parsed = isMoreRequest ? lastQueryRef.current : parseCreatorQuery(content);
    if (cardKind === 'creators' && !isMoreRequest) lastQueryRef.current = parsed;

    let card: RichCard | undefined;
    const cardPromise = (async () => {
      try {
        if (cardKind === 'creators') {
          const r = await talent.search({ q: parsed.role, limit: isMoreRequest ? 8 : 4 });
          if (r.talent.length) card = { kind: 'creators', items: r.talent.slice(0, isMoreRequest ? 8 : 4) };
        } else if (cardKind === 'projects') {
          const list = await jobs.getMe();
          if (list.length) card = { kind: 'projects', items: list.slice(0, 4) };
        } else if (cardKind === 'etf') {
          card = { kind: 'etf' };
        } else if (cardKind === 'payments') {
          card = { kind: 'payments' };
        }
      } catch { /* card optional */ }
    })();

    let replyText: string | null = null;
    try {
      const historyBase = (convs.find(c => c.id === convId)?.messages ?? []);
      const history = [...historyBase, userMsg].map(m => ({ role: m.role, content: m.text }));
      const res = await aiChat.send(history);
      replyText = res.response;
    } catch {
      await new Promise(r => setTimeout(r, 650));
    }
    await cardPromise;

    if (!replyText) {
      const found = card?.kind === 'creators' ? card.items.length : 0;
      replyText = getMiyaFallback(content, parsed, found);
    }

    const aiMsg: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      text: replyText,
      time: nowTime(),
      card,
      quickReplies: quickRepliesFor(card?.kind ?? null),
    };
    setIsTyping(false);
    setConvs(prev => prev.map(c => (c.id === convId ? { ...c, updatedAt: Date.now(), messages: [...c.messages, aiMsg] } : c)));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const onAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setInput(prev => `${prev}${prev ? ' ' : ''}[Attached: ${f.name}] `);
    e.target.value = '';
    textareaRef.current?.focus();
  };

  const recent = convs.filter(c => !c.saved);
  const saved = convs.filter(c => c.saved);
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');

  /* ── conversation row ────────────────────────────────────────────────── */
  const ConvRow = ({ c, icon }: { c: Conversation; icon: string }) => (
    <div
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
        c.id === activeId ? 'bg-blue-50 text-cobalt font-medium' : 'text-gray-600 hover:bg-gray-50'
      }`}
      onClick={() => openConv(c.id)}
    >
      <i className={`${icon} text-xs shrink-0 ${c.id === activeId ? 'text-cobalt' : 'text-gray-400'}`} />
      <span className="truncate flex-1">{c.title}</span>
      <button
        onClick={e => { e.stopPropagation(); toggleSave(c.id); }}
        className={`transition-opacity text-xs ${c.saved ? 'text-cobalt' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-cobalt'}`}
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

  /* ── left sidebar ────────────────────────────────────────────────────── */
  const LeftSidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-gray-100">
        <MiyaMark size={36} className="drop-shadow-sm" />
        <p className="font-bold text-gray-900 text-lg">Miya</p>
        <span className="text-[10px] font-bold bg-blue-50 text-cobalt border border-blue-200 px-1.5 py-0.5 rounded">AI</span>
      </div>

      {/* New chat */}
      <div className="px-3 pt-4 pb-3">
        <button
          onClick={newChat}
          className="w-full flex items-center justify-between bg-cobalt text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-cobalt-2 active:scale-[0.99] transition-all"
        >
          <span><i className="fa-solid fa-plus text-xs mr-2" />New Chat</span>
          <span className="text-[10px] font-medium text-blue-200">{isMac ? '⌘K' : 'Ctrl+K'}</span>
        </button>
      </div>

      {/* Modes */}
      <div className="px-3 pb-2 space-y-0.5">
        {(Object.keys(MODES) as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              mode === m ? 'bg-blue-50 text-cobalt font-semibold' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <i className={`fa-solid ${MODES[m].icon} text-sm w-5 ${mode === m ? 'text-cobalt' : 'text-gray-400'}`} />
            <span className="flex-1 text-left">{MODES[m].label}</span>
          </button>
        ))}
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        <div>
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Recent</p>
          {recent.length === 0 ? (
            <p className="px-3 text-xs text-gray-400">No conversations yet</p>
          ) : (
            <div className="space-y-0.5">{recent.slice(0, 8).map(c => <ConvRow key={c.id} c={c} icon="fa-regular fa-message" />)}</div>
          )}
        </div>
        {saved.length > 0 && (
          <div>
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Saved</p>
            <div className="space-y-0.5">{saved.map(c => <ConvRow key={c.id} c={c} icon="fa-regular fa-bookmark" />)}</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-3 py-2.5">
        <Link href="/client/profile" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors">
          <i className="fa-solid fa-gear text-xs w-5 text-gray-400" /> Settings
        </Link>
      </div>
    </div>
  );

  /* ── right workspace context panel ───────────────────────────────────── */
  const RightPanel = (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-2">
        <p className="font-bold text-gray-900">Workspace Context</p>
      </div>

      <div className="px-4 py-3 space-y-5">
        {/* CURRENT USER */}
        {me && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Current User</p>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3.5 flex items-center gap-3">
              {me.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.avatar} alt={me.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-cobalt text-white font-bold flex items-center justify-center">
                  {me.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 text-sm truncate">{me.name}</p>
                <p className="text-xs text-gray-400 capitalize">{me.type === 'producer' ? 'Client' : me.type}</p>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1 align-middle" />Online
                </p>
              </div>
              <Link href="/client/profile" className="text-gray-400 hover:text-cobalt transition-colors" title="Edit profile">
                <i className="fa-regular fa-pen-to-square text-sm" />
              </Link>
            </div>
          </div>
        )}

        {/* CURRENT PROJECT */}
        {projCtx && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Current Project</p>
              <Link href={`/client/projects/${projCtx.project.id}`} className="text-xs font-semibold text-cobalt hover:text-cobalt-deep">View</Link>
            </div>
            <div className="border border-gray-200 rounded-2xl p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-2 align-middle" />
                  {projCtx.project.title}
                </p>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-md capitalize shrink-0">
                  {projCtx.project.status}
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-bold text-gray-900">{projCtx.progressPct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-cobalt rounded-full transition-all duration-700" style={{ width: `${projCtx.progressPct}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-gray-50 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-gray-400">Budget</p>
                  <p className="text-sm font-bold text-gray-900">
                    {projCtx.project.budget?.min != null
                      ? `$${(projCtx.project.budget.max ?? projCtx.project.budget.min).toLocaleString()}`
                      : '—'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-gray-400">Deadline</p>
                  <p className="text-sm font-bold text-gray-900">
                    {projCtx.project.deadline
                      ? new Date(projCtx.project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ETF / ESCROW STATUS */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">ETF Status</p>
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5">
            <p className="text-sm font-bold text-cobalt">
              <i className="fa-solid fa-shield-halved mr-1.5" />Escrow Protected
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {projCtx && projCtx.fundedActive > 0
                ? `${projCtx.fundedActive} active milestone${projCtx.fundedActive > 1 ? 's' : ''} funded in Escrow Trust Fund.`
                : 'Funds are held in escrow until you approve each milestone.'}
            </p>
            {etf && (
              <div className="flex items-center justify-between mt-2.5 text-xs">
                <span className="font-semibold text-gray-700 capitalize">
                  <i className="fa-solid fa-medal mr-1" style={{ color: etf.level.color }} />{etf.level.label}
                </span>
                <span className="font-bold text-cobalt">{etf.balance.toLocaleString()} pts</span>
              </div>
            )}
            <Link
              href="/client/payments"
              className="mt-3 block text-center text-xs font-semibold bg-white border border-blue-200 text-cobalt py-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Manage Funds
            </Link>
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        {events.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Recent Activity</p>
            <div className="space-y-3">
              {events.map(ev => {
                const meta = activityIcon(ev.action);
                return (
                  <div key={ev.id} className="flex items-start gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                      <i className={`fa-solid ${meta.icon} text-xs`} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-snug">{ev.description}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {ev.points > 0 ? `+${ev.points} pts · ` : ''}{timeAgo(ev.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {notifs.length > 0 && (
          <div className="pb-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Notifications</p>
              {unread > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>
              )}
            </div>
            <div className="space-y-2">
              {notifs.map(n => (
                <div key={n.id} className="flex items-start gap-2.5 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                  <i className="fa-solid fa-circle-info text-cobalt text-xs mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-gray-700 leading-snug">{n.title}</p>
                    {n.message && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <div className="h-[calc(100vh-9.5rem)] md:h-[calc(100vh-11rem)] -mx-4 md:mx-0">
      <style>{`
        @keyframes miyaIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        .miya-msg-in { animation: miyaIn .25s ease-out both; }
        .miya-card-in { animation: miyaIn .35s ease-out both; }
        @keyframes miyaPulse { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
        .miya-dot { animation: miyaPulse 1.2s ease-in-out infinite; }
      `}</style>

      <div className="flex h-full bg-white md:border md:border-gray-200 md:rounded-2xl md:shadow-sm overflow-hidden">

        {/* LEFT SIDEBAR (desktop) */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-gray-200">
          {LeftSidebar}
        </aside>

        {/* LEFT DRAWER (mobile) */}
        {leftOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setLeftOpen(false)} />
            <aside className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden shadow-2xl flex flex-col">
              <button onClick={() => setLeftOpen(false)} className="absolute top-3.5 right-3 w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 flex items-center justify-center z-10">
                <i className="fa-solid fa-xmark" />
              </button>
              {LeftSidebar}
            </aside>
          </>
        )}

        {/* MAIN CHAT */}
        <section className="flex-1 min-w-0 flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 lg:px-5 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setLeftOpen(true)} className="lg:hidden w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-bars-staggered" />
              </button>
              <BotAvatar online />
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">Miya</p>
                <p className="text-xs text-gray-400 truncate">Online · Intelligent Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {active && (
                <>
                  <button
                    onClick={shareConv}
                    className="w-9 h-9 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-cobalt flex items-center justify-center transition-colors"
                    title="Copy conversation"
                  >
                    <i className={`fa-solid ${shared ? 'fa-check text-emerald-500' : 'fa-arrow-up-from-bracket'} text-sm`} />
                  </button>
                  <button
                    onClick={() => deleteConv(active.id)}
                    className="w-9 h-9 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"
                    title="Delete conversation"
                  >
                    <i className="fa-regular fa-trash-can text-sm" />
                  </button>
                </>
              )}
              <button onClick={() => setRightOpen(o => !o)} className="xl:hidden w-9 h-9 rounded-lg text-gray-400 hover:bg-gray-100 flex items-center justify-center" title="Workspace context">
                <i className="fa-solid fa-table-columns" />
              </button>
            </div>
          </div>

          {/* Messages / welcome */}
          <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6">
            {messages.length === 0 ? (
              <div className="max-w-3xl mx-auto">
                {/* Suggested actions grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                  {SUGGESTED_ACTIONS.map((a, i) => (
                    <button
                      key={a.label}
                      onClick={() => sendMessage(a.prompt)}
                      className="miya-card-in group flex flex-col items-center text-center gap-1.5 bg-white border border-gray-200 rounded-2xl px-4 py-7 hover:border-cobalt/50 hover:shadow-md transition-all duration-200"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <span className="w-10 h-10 rounded-lg bg-blue-50 text-cobalt flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <i className={`fa-solid ${a.icon}`} />
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{a.label}</span>
                      <span className="text-xs text-gray-400">{a.sub}</span>
                    </button>
                  ))}
                </div>

                {/* Mode prompts */}
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  {MODE_PROMPTS[mode].map(p => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-3.5 py-2 rounded-full hover:border-cobalt/40 hover:text-cobalt transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-3xl mx-auto">
                {messages.map((m, mi) => (
                  <div key={m.id} className={`miya-msg-in flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {m.role === 'assistant' ? (
                      <BotAvatar size="sm" />
                    ) : me?.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={me.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-gray-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0">
                        {me?.name?.charAt(0).toUpperCase() ?? 'Y'}
                      </div>
                    )}
                    <div className={`min-w-0 max-w-[88%] sm:max-w-xl flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-white border border-gray-200 text-gray-800 rounded-tr-md shadow-sm'
                          : 'bg-gray-50 text-gray-800 rounded-tl-md'
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

                      {/* Quick replies — only on the latest assistant message */}
                      {m.role === 'assistant' && m.quickReplies && mi === messages.length - 1 && !isTyping && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {m.quickReplies.map(qr =>
                            qr.href ? (
                              <button
                                key={qr.label}
                                onClick={() => router.push(qr.href!)}
                                className="text-xs font-medium bg-white border border-gray-300 text-gray-700 px-3.5 py-2 rounded-full hover:border-cobalt hover:text-cobalt transition-colors"
                              >
                                {qr.label}
                              </button>
                            ) : (
                              <button
                                key={qr.label}
                                onClick={() => sendMessage(qr.prompt)}
                                className="text-xs font-medium bg-white border border-gray-300 text-gray-700 px-3.5 py-2 rounded-full hover:border-cobalt hover:text-cobalt transition-colors"
                              >
                                {qr.label}
                              </button>
                            )
                          )}
                        </div>
                      )}

                      <p className="text-[10px] text-gray-400 mt-1.5 px-1">{m.time}</p>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="miya-msg-in flex items-start gap-3">
                    <BotAvatar size="sm" />
                    <div className="bg-gray-50 rounded-2xl rounded-tl-md px-4 py-3.5">
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
          <div className="px-4 lg:px-8 py-4 border-t border-gray-100">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 bg-white rounded-full border border-gray-300 pl-4 pr-2 py-2 shadow-sm focus-within:border-cobalt focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-gray-400 hover:text-cobalt transition-colors shrink-0"
                  title="Attach file"
                >
                  <i className="fa-solid fa-paperclip" />
                </button>
                <input ref={fileRef} type="file" className="hidden" onChange={onAttach} />
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Miya to find creators, create projects, or help with…"
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-gray-900 outline-none resize-none placeholder-gray-400 leading-relaxed py-1 max-h-32"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isTyping}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    input.trim() && !isTyping
                      ? 'bg-cobalt text-white hover:bg-cobalt-2 active:scale-95'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  aria-label="Send"
                >
                  <i className="fa-solid fa-arrow-up text-sm" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                Miya can make mistakes. Always verify important decisions independently.
              </p>
            </div>
          </div>
        </section>

        {/* RIGHT WORKSPACE CONTEXT (desktop ≥xl) */}
        <aside className="hidden xl:block w-80 shrink-0 border-l border-gray-200">
          {RightPanel}
        </aside>

        {/* RIGHT DRAWER (below xl) */}
        {rightOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40 xl:hidden" onClick={() => setRightOpen(false)} />
            <aside className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white z-50 xl:hidden shadow-2xl">
              <button onClick={() => setRightOpen(false)} className="absolute top-3.5 right-3 w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 flex items-center justify-center z-10">
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
