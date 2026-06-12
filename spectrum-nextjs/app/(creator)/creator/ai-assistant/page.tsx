'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MiyaMark from '@/components/MiyaIcon';
import {
  aiChat, jobs, creatorProjects, earnings, profile as profileApi,
  etfPoints, notifications as notifApi,
} from '@/lib/api';
import type {
  JobPostItem, ProjectItem, EarningsStats, EtfBalance, EtfEvent, NotificationItem,
} from '@/lib/api';

/* ────────────────────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────────────────── */

type RichCard =
  | { kind: 'jobs'; items: JobPostItem[] }
  | { kind: 'projects'; items: ProjectItem[] }
  | { kind: 'etf' }
  | { kind: 'payouts' };

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

type Mode = 'proposal' | 'comms' | 'career';

const STORAGE_KEY = 'miya_creator_conversations_v1';

/* ────────────────────────────────────────────────────────────────────────────
   Static metadata
──────────────────────────────────────────────────────────────────────────── */

const MODES: Record<Mode, { label: string; icon: string }> = {
  proposal: { label: 'Proposal Assistant', icon: 'fa-file-pen' },
  comms:    { label: 'Client Comms',        icon: 'fa-comments' },
  career:   { label: 'Career Help',         icon: 'fa-chart-line' },
};

const SUGGESTED_ACTIONS: { label: string; sub: string; icon: string; prompt: string }[] = [
  { label: 'Write a Proposal',   sub: 'Win the project',          icon: 'fa-file-pen',        prompt: 'Help me write a winning proposal' },
  { label: 'Find Projects',      sub: 'Jobs you can apply to',    icon: 'fa-magnifying-glass',prompt: 'Find projects I can apply to' },
  { label: 'Price My Service',   sub: 'Set the right rate',       icon: 'fa-tags',            prompt: 'How should I price my service?' },
  { label: 'Improve My Profile', sub: 'Get hired more',           icon: 'fa-user-pen',        prompt: 'How do I improve my creator profile?' },
  { label: 'Explain ETF',        sub: 'Earn trust points',        icon: 'fa-shield-halved',   prompt: 'Explain how ETF points work' },
  { label: 'Get Paid Faster',    sub: 'Payouts & escrow',         icon: 'fa-wallet',          prompt: 'How do payments and payouts work?' },
];

const MODE_PROMPTS: Record<Mode, string[]> = {
  proposal: [
    'Help me write a winning proposal',
    'Find projects I can apply to',
    'How do I stand out from other applicants?',
    'Review my active projects',
  ],
  comms: [
    'Write a follow-up email after a quote',
    'How do I handle a client asking for a discount?',
    'Politely push back on scope creep',
  ],
  career: [
    'How should I price my service?',
    'How do I improve my creator profile?',
    'Explain how ETF points work',
    'How do payouts work?',
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
   Query detection
──────────────────────────────────────────────────────────────────────────── */

function detectCard(input: string): RichCard['kind'] | null {
  const q = input.toLowerCase();
  if ((q.includes('find') || q.includes('show') || q.includes('search') || q.includes('apply') || q.includes('more')) &&
      (q.includes('project') || q.includes('job') || q.includes('gig') || q.includes('work'))) {
    // "review my projects" / "my work" should show my own projects, not the job board
    if (q.includes('my project') || q.includes('my work') || q.includes('review my')) return 'projects';
    return 'jobs';
  }
  if (q.includes('my project') || q.includes('my work') || q.includes('review my') || q.includes('project health')) return 'projects';
  if (q.includes('etf') || (q.includes('trust') && q.includes('point'))) return 'etf';
  if (q.includes('payout') || q.includes('payment') || q.includes('escrow') || q.includes('get paid') || q.includes('withdraw')) return 'payouts';
  return null;
}

function extractSkill(input: string): string | undefined {
  const q = input.toLowerCase();
  const skills = ['video', 'editing', 'photography', 'design', 'animation', 'writing', 'branding', 'illustration', 'music'];
  for (const s of skills) if (q.includes(s)) return s;
  return undefined;
}

function quickRepliesFor(kind: RichCard['kind'] | null): QuickReply[] | undefined {
  switch (kind) {
    case 'jobs':
      return [
        { label: 'Show more projects', prompt: 'Show me more projects to apply to' },
        { label: 'Help me write a proposal', prompt: 'Help me write a winning proposal' },
      ];
    case 'projects':
      return [
        { label: 'Find new projects', href: '/creator/find-projects' },
        { label: 'How do payouts work?', prompt: 'How do payments and payouts work?' },
      ];
    case 'etf':
      return [
        { label: 'View my ETF status', href: '/creator/etf' },
        { label: 'Fastest way to earn points?', prompt: 'What is the fastest way to earn more ETF points?' },
      ];
    case 'payouts':
      return [
        { label: 'Open earnings', href: '/creator/earnings' },
        { label: 'How do disputes work?', prompt: 'How do disputes get resolved?' },
      ];
    default:
      return undefined;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   Local fallback brain (creator perspective)
──────────────────────────────────────────────────────────────────────────── */

function getMiyaFallback(input: string, found = 0): string {
  const q = input.toLowerCase();

  if (detectCard(input) === 'jobs') {
    if (found > 0) return `Here are ${found} open projects that match your skills. Tap any to see the full brief, or let me help you write a standout proposal for one of them.`;
    return `I couldn't find open projects matching that right now. Try broadening the skill, or browse the full board on Find Projects — new briefs are posted daily.`;
  }
  if (q.includes('proposal') || (q.includes('write') && q.includes('win'))) {
    return `A winning proposal is specific, not generic. Here's the structure I'd use:\n\n**1. Open with their problem** — show you read the brief: "You need a 30s product video that converts on Instagram."\n**2. Your approach** — 3-4 concrete steps with a rough timeline.\n**3. Relevant proof** — 2 portfolio links to *similar* work, not your whole reel.\n**4. Clear price & deliverables** — what they get, in what formats, by when.\n**5. One question** — invites a reply and shows you're thinking.\n\nKeep it under 200 words. Clients skim. Want me to draft one for a specific project?`;
  }
  if (q.includes('stand out') || q.includes('other applicant')) {
    return `To stand out from other applicants:\n\n• **Reply fast** — the first few quality proposals get the most attention.\n• **Reference their brief specifically** — generic copy-paste is obvious.\n• **Show relevant work only** — 2 tight examples beat a 20-piece reel.\n• **Lead with outcomes** — "increased their watch-time by 40%" beats "I edit videos."\n• **Raise your ETF level** — higher trust tiers rank higher in client searches.\n\nA complete profile with reviews does half the selling before you even apply.`;
  }
  if (q.includes('price') || q.includes('rate') || q.includes('charge')) {
    return `Pricing framework for creators:\n\n**Value, not hours.** Clients buy outcomes. A logo that defines a brand is worth more than "6 hours of design."\n\n**Rough benchmarks on Spectrum:**\n• Logo / brand mark — $300–$2,500\n• Short video edit — $500–$5,000\n• Event photography — $200–$1,500/day\n• Brand identity system — $1,500–$8,000\n\n**Rule of thumb:** day rate × estimated days + 20% buffer for revisions and admin.\n\nDon't race to the bottom — underpricing signals low quality. Quote with confidence and let your portfolio justify it.`;
  }
  if (q.includes('profile') || q.includes('get hired')) {
    return `To get hired more, strengthen your profile:\n\n**Must-haves:**\n• 6–12 of your *best* pieces — quality over quantity\n• Case studies: problem → your solution → measurable result\n• A clear headline that names your specialty\n• Verified badge — clients filter for it\n\n**The multipliers:**\n• Reviews — finish projects and ask happy clients to rate you\n• ETF level — climbs with genuine on-platform activity and boosts your ranking\n• Fast response time — shown on your profile\n\nA complete, verified profile with reviews is the single biggest driver of getting hired.`;
  }
  if (q.includes('etf') || (q.includes('trust') && q.includes('point'))) {
    return `**ETF — Earn Trust Framework** rewards genuine activity. As a creator you earn:\n\n• **Get hired** — +20 pts\n• **Deliver a milestone** — +50 pts\n• **Complete a project** — +100 pts\n• **Earn a positive review (≥4★)** — +20 pts\n• **On-time delivery** — +30 pts\n• **Verify your profile** — +100 pts\n\nPoints move you through **Bronze → Silver → Gold → Platinum**. Higher levels rank you higher in client searches and Smart Connect, and at Platinum you unlock cash-out eligibility.`;
  }
  if (q.includes('earn more') || q.includes('fastest way')) {
    return `Fastest way to climb ETF levels as a creator:\n\n1. **Complete projects** (+100) — the single biggest award\n2. **Deliver milestones on time** (+50 each, +30 on-time bonus)\n3. **Collect reviews** (+20 per positive review)\n4. **Verify your profile** (+100, one-time)\n\nConsistent, genuine delivery beats everything. Self-jobs and fake projects never earn points.`;
  }
  if (q.includes('payout') || q.includes('payment') || q.includes('escrow') || q.includes('get paid') || q.includes('withdraw')) {
    return `How you get paid on Spectrum:\n\n1. **Client funds a milestone** — money sits in secure escrow before you start, so you know it's there.\n2. **You deliver** — upload the work and request release.\n3. **Client reviews** — they approve (or request revisions) within 5 business days.\n4. **Funds land in your wallet** — withdraw to your bank anytime; withdrawals settle in 2–3 business days.\n\nYou pay 8% creator fee (client pays 4% — 12% total). Never work or take payment off-platform: escrow is your protection if a client disappears.`;
  }
  if (q.includes('discount')) {
    return `Handling a discount request without devaluing your work:\n\n**Reduce scope, not rate:** "I can work within $X if we adjust to [smaller deliverable]."\n**Offer a package:** "I can't discount this, but I'll price favorably if you book two projects."\n**Hold with confidence:** "My rate reflects the quality and turnaround I deliver — I'm not able to lower it for this scope."\n\nNever just drop your price — it sets a precedent and signals low value. Always trade something for it.`;
  }
  if (q.includes('scope creep') || q.includes('push back')) {
    return `Pushing back on scope creep, politely:\n\n"Happy to take that on! Since it's beyond our original scope of [X], I'll send a quick add-on quote so we keep everything fair and on track. Want me to write it up?"\n\nThis keeps the relationship warm while protecting your time. Log every change against the original brief, and route extra work through a new milestone so it's funded in escrow before you start.`;
  }
  if (q.includes('follow') || q.includes('email')) {
    return `Follow-up email after a quote:\n\n---\n**Subject:** Following up on [Project Name]\n\nHi [Name],\n\nJust circling back on the proposal I sent on [date]. I'm excited about [project] and think we'd be a great fit.\n\nHappy to jump on a quick call if any questions came up. I'm holding space in my schedule until [date] for this one.\n\nBest,\n[You]\n\n---\n\nKeep it short, one clear call-to-action, and send no more than two follow-ups.`;
  }
  if (q.includes('dispute')) {
    return `If a project goes sideways:\n\n1. **Open a dispute** from the project page with evidence (deliverables, messages, the brief).\n2. **Both sides respond** — you get to present your side.\n3. **Resolution team reviews** — typically 3–5 business days.\n4. **Funds are awarded** based on the evidence.\n\nEscrowed funds stay frozen during a dispute, so a client can't claw back work you've delivered without a ruling. Keep everything on-platform — it's your paper trail.`;
  }
  if (q.includes('hello') || q.includes('hi ') || q === 'hi' || q.includes('hey')) {
    return `Hey! I'm Miya — your creator copilot on Spectrum. I can help you write winning proposals, find projects to apply to, price your work, sharpen your profile, and understand payouts and ETF.\n\nWhat are we working on today?`;
  }
  if (q.includes('what can you')) {
    return `Here's what I can do for you as a creator:\n\n• **Win work** — write proposals, find matching projects\n• **Price right** — rate guidance by service type\n• **Get hired** — profile and portfolio tips\n• **Track your work** — active projects, milestones, deadlines\n• **Understand the platform** — payouts, escrow, ETF, disputes\n\nTry a suggestion below, or just ask in your own words.`;
  }
  return `Great question! I can help with proposals, finding projects, pricing, client communication, your profile, payouts, and ETF points.\n\nTell me a bit more about what you're working on — the more context, the better my advice.`;
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
  return `${Math.floor(h / 24)}d ago`;
}

function activityIcon(action: string): { icon: string; bg: string } {
  if (action.includes('milestone.released')) return { icon: 'fa-dollar-sign',    bg: 'bg-emerald-100 text-emerald-600' };
  if (action.includes('milestone'))          return { icon: 'fa-lock',           bg: 'bg-blue-100 text-blue-600' };
  if (action.includes('project.completed'))  return { icon: 'fa-flag-checkered', bg: 'bg-violet-100 text-violet-600' };
  if (action.includes('project'))            return { icon: 'fa-briefcase',      bg: 'bg-blue-100 text-cobalt' };
  if (action.includes('review'))             return { icon: 'fa-star',           bg: 'bg-amber-100 text-amber-600' };
  if (action.includes('hire'))               return { icon: 'fa-handshake',      bg: 'bg-indigo-100 text-indigo-600' };
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

function JobCard({ j }: { j: JobPostItem }) {
  return (
    <div className="miya-card-in bg-white border border-gray-200 rounded-2xl p-4 hover:border-cobalt/40 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-gray-900 text-sm leading-snug">{j.title}</p>
        {j.experience_level && (
          <span className="text-[10px] font-semibold uppercase tracking-wide border border-gray-200 bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md shrink-0 capitalize">
            {j.experience_level}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 mt-2.5 text-xs text-gray-500 flex-wrap">
        {j.budget?.min != null && (
          <span><i className="fa-solid fa-coins text-amber-500 mr-1" />
            {j.budget.currency || 'USD'} {j.budget.min?.toLocaleString()}{j.budget.max ? `–${j.budget.max.toLocaleString()}` : ''}
          </span>
        )}
        {j.department && <span><i className="fa-solid fa-layer-group mr-1" />{j.department}</span>}
        {typeof j.proposal_count === 'number' && <span><i className="fa-regular fa-file-lines mr-1" />{j.proposal_count} applied</span>}
      </div>
      {j.skills && j.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {j.skills.slice(0, 3).map(s => (
            <span key={s} className="text-[11px] bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-md">{s}</span>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-3.5">
        <Link href={`/creator/find-projects/${j.id}/apply`}
          className="flex-1 text-center text-xs font-semibold bg-cobalt text-white py-2.5 rounded-lg hover:bg-cobalt-2 transition-colors">
          Apply
        </Link>
        <Link href={`/creator/find-projects/${j.id}`}
          className="flex-1 text-center text-xs font-semibold bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:border-cobalt hover:text-cobalt transition-colors">
          View
        </Link>
      </div>
    </div>
  );
}

function ProjectCard({ p }: { p: ProjectItem }) {
  const statusColor: Record<string, string> = {
    active:      'bg-emerald-50 text-emerald-600 border-emerald-200',
    in_progress: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    completed:   'bg-violet-50 text-violet-600 border-violet-200',
    pending:     'bg-amber-50 text-amber-600 border-amber-200',
  };
  const chip = statusColor[p.status] ?? 'bg-gray-50 text-gray-500 border-gray-200';
  return (
    <Link href={`/creator/projects/${p.id}`}
      className="miya-card-in block bg-white border border-gray-200 rounded-2xl p-4 hover:border-cobalt/40 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-gray-900 text-sm leading-snug">{p.title}</p>
        <span className={`text-[10px] font-semibold uppercase tracking-wide border px-2 py-0.5 rounded-md shrink-0 capitalize ${chip}`}>
          {p.status.replace('_', ' ')}
        </span>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">Progress</span>
          <span className="font-bold text-gray-900">{p.progress_percentage ?? 0}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-cobalt rounded-full transition-all duration-700" style={{ width: `${p.progress_percentage ?? 0}%` }} />
        </div>
      </div>
    </Link>
  );
}

function EtfExplainCard() {
  const rows = [
    { icon: 'fa-handshake',      label: 'Get hired',          pts: '+20'  },
    { icon: 'fa-unlock',         label: 'Deliver a milestone',pts: '+50'  },
    { icon: 'fa-flag-checkered', label: 'Complete a project', pts: '+100' },
    { icon: 'fa-star',           label: 'Positive review',    pts: '+20'  },
    { icon: 'fa-clock',          label: 'On-time delivery',   pts: '+30'  },
    { icon: 'fa-badge-check',    label: 'Verify profile',     pts: '+100' },
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

function PayoutsCard() {
  const steps = [
    { n: 1, t: 'Client funds milestone', d: 'Money secured in escrow before you start' },
    { n: 2, t: 'You deliver',            d: 'Upload work and request release' },
    { n: 3, t: 'Client approves',        d: '5 business days to review' },
    { n: 4, t: 'Funds hit your wallet',  d: 'Withdraw to bank in 2–3 days' },
  ];
  return (
    <div className="miya-card-in bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-8 h-8 rounded-lg bg-blue-50 text-cobalt flex items-center justify-center"><i className="fa-solid fa-wallet text-sm" /></span>
        <p className="font-bold text-gray-900 text-sm">How you get paid</p>
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

export default function CreatorAiAssistantPage() {
  const router = useRouter();

  /* conversations */
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('proposal');

  /* chat */
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [shared, setShared] = useState(false);

  /* panels (mobile) */
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  /* context-panel data */
  const [me, setMe] = useState<{ name: string; avatar: string; type: string } | null>(null);
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null);
  const [earn, setEarn] = useState<EarningsStats | null>(null);
  const [etf, setEtf] = useState<EtfBalance | null>(null);
  const [events, setEvents] = useState<EtfEvent[]>([]);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastSkillRef = useRef<string | undefined>(undefined);

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

    creatorProjects.list({ status: 'active' }).then(r => {
      const p = r.projects.find(x => x.status === 'active' || x.status === 'in_progress') || r.projects[0];
      if (p) setActiveProject(p);
    }).catch(() => {});

    earnings.getStats().then(setEarn).catch(() => {});
    etfPoints.me().then(setEtf).catch(() => {});
    etfPoints.events({ limit: 4 }).then(r => setEvents(r.events ?? [])).catch(() => {});
    notifApi.getAll(4).then(r => { setNotifs(r.notifications.slice(0, 4)); setUnread(r.unread_count); }).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* ── conversation ops ────────────────────────────────────────────────── */
  const openConv = (id: string) => { setActiveId(id); setLeftOpen(false); };
  const toggleSave = (id: string) => setConvs(prev => prev.map(c => (c.id === id ? { ...c, saved: !c.saved } : c)));
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

    const cardKind = detectCard(content);
    const isMoreRequest = content.toLowerCase().includes('more project') || content.toLowerCase().includes('more job');
    const skill = isMoreRequest ? lastSkillRef.current : extractSkill(content);
    if (cardKind === 'jobs' && !isMoreRequest) lastSkillRef.current = skill;

    let card: RichCard | undefined;
    const cardPromise = (async () => {
      try {
        if (cardKind === 'jobs') {
          const r = await jobs.search({ q: skill, status: 'open', limit: isMoreRequest ? 8 : 4 });
          if (r.jobs?.length) card = { kind: 'jobs', items: r.jobs.slice(0, isMoreRequest ? 8 : 4) };
        } else if (cardKind === 'projects') {
          const r = await creatorProjects.list({});
          if (r.projects?.length) card = { kind: 'projects', items: r.projects.slice(0, 4) };
        } else if (cardKind === 'etf') {
          card = { kind: 'etf' };
        } else if (cardKind === 'payouts') {
          card = { kind: 'payouts' };
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
      const found = card?.kind === 'jobs' ? card.items.length : 0;
      replyText = getMiyaFallback(content, found);
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
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-gray-100">
        <MiyaMark size={36} className="drop-shadow-sm" />
        <p className="font-bold text-gray-900 text-lg">Miya</p>
        <span className="text-[10px] font-bold bg-blue-50 text-cobalt border border-blue-200 px-1.5 py-0.5 rounded">AI</span>
      </div>

      <div className="px-3 pt-4 pb-3">
        <button
          onClick={newChat}
          className="w-full flex items-center justify-between bg-cobalt text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-cobalt-2 active:scale-[0.99] transition-all"
        >
          <span><i className="fa-solid fa-plus text-xs mr-2" />New Chat</span>
          <span className="text-[10px] font-medium text-blue-200">{isMac ? '⌘K' : 'Ctrl+K'}</span>
        </button>
      </div>

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

      <div className="border-t border-gray-100 px-3 py-2.5">
        <Link href="/creator/profile" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors">
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
                <p className="text-xs text-gray-400 capitalize">Creator</p>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1 align-middle" />Online
                </p>
              </div>
              <Link href="/creator/profile" className="text-gray-400 hover:text-cobalt transition-colors" title="Edit profile">
                <i className="fa-regular fa-pen-to-square text-sm" />
              </Link>
            </div>
          </div>
        )}

        {/* CURRENT PROJECT */}
        {activeProject && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Current Project</p>
              <Link href={`/creator/projects/${activeProject.id}`} className="text-xs font-semibold text-cobalt hover:text-cobalt-deep">View</Link>
            </div>
            <div className="border border-gray-200 rounded-2xl p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-2 align-middle" />
                  {activeProject.title}
                </p>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-md capitalize shrink-0">
                  {activeProject.status.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-bold text-gray-900">{activeProject.progress_percentage ?? 0}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-cobalt rounded-full transition-all duration-700" style={{ width: `${activeProject.progress_percentage ?? 0}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EARNINGS / ETF */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Earnings</p>
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/70 rounded-xl px-3 py-2">
                <p className="text-[10px] text-gray-400">Total earned</p>
                <p className="text-sm font-bold text-gray-900">${(earn?.total_earned ?? 0).toLocaleString()}</p>
              </div>
              <div className="bg-white/70 rounded-xl px-3 py-2">
                <p className="text-[10px] text-gray-400">Pending</p>
                <p className="text-sm font-bold text-gray-900">${(earn?.pending ?? 0).toLocaleString()}</p>
              </div>
            </div>
            {etf && (
              <div className="flex items-center justify-between mt-2.5 text-xs">
                <span className="font-semibold text-gray-700 capitalize">
                  <i className="fa-solid fa-medal mr-1" style={{ color: etf.level.color }} />{etf.level.label}
                </span>
                <span className="font-bold text-cobalt">{etf.balance.toLocaleString()} pts</span>
              </div>
            )}
            <Link href="/creator/earnings"
              className="mt-3 block text-center text-xs font-semibold bg-white border border-blue-200 text-cobalt py-2 rounded-lg hover:bg-blue-50 transition-colors">
              View earnings
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
                <p className="text-xs text-gray-400 truncate">Online · Creator Assistant</p>
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

                      {m.card?.kind === 'jobs' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 w-full">
                          {m.card.items.map(j => <JobCard key={j.id} j={j} />)}
                        </div>
                      )}
                      {m.card?.kind === 'projects' && (
                        <div className="space-y-2.5 mt-3 w-full">
                          {m.card.items.map(p => <ProjectCard key={p.id} p={p} />)}
                        </div>
                      )}
                      {m.card?.kind === 'etf' && <div className="mt-3 w-full"><EtfExplainCard /></div>}
                      {m.card?.kind === 'payouts' && <div className="mt-3 w-full"><PayoutsCard /></div>}

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
                  placeholder="Ask Miya to find projects, write proposals, or help with…"
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
