'use client';

import Link from 'next/link';
import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { jobs, JobCreatePayload } from '@/lib/api';

const CATEGORIES = [
  'Design', 'Film & Video', 'Writing & Content', 'Marketing & Strategy',
  'Music & Audio', 'Digital & Interactive', 'Photography', 'Branding', 'Other',
];

// ── Project Templates ─────────────────────────────────────────────────────────
interface Template {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  title: string;
  description: string;
  goals: string[];
  deliverables: string[];
  skills: string[];
  budgetType: string;
  budgetMin: string;
  budgetMax: string;
  timeline: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'logo',
    name: 'Logo Design',
    icon: 'fa-pen-nib',
    color: 'bg-purple-100 text-purple-600',
    category: 'Design',
    title: 'Logo Design for [Company Name]',
    description: 'We need a professional logo that represents our brand identity. The logo should be modern, versatile, and work across digital and print media.',
    goals: ['Create a memorable brand identity', 'Design a timeless, scalable logo', 'Deliver files for web and print'],
    deliverables: ['Primary logo (SVG, PNG, PDF)', 'Icon/symbol variant', 'Black & white version', 'Brand color palette', 'Usage guidelines'],
    skills: ['Graphic Design', 'Brand Strategy', 'Illustration'],
    budgetType: 'fixed',
    budgetMin: '300',
    budgetMax: '1500',
    timeline: '1–2 weeks',
  },
  {
    id: 'promo_video',
    name: 'Promo Video',
    icon: 'fa-film',
    color: 'bg-red-100 text-red-600',
    category: 'Film & Video',
    title: 'Promotional Video for [Product/Brand]',
    description: 'We need a high-quality promotional video to showcase our product/service. The video should be engaging, professional, and optimised for social media and our website.',
    goals: ['Increase brand awareness', 'Drive product sales', 'Grow social media engagement'],
    deliverables: ['60–90 second promo video', 'Social media cut (15s + 30s)', 'Raw footage files', 'Colour-graded master file'],
    skills: ['Videography', 'Video Editing', 'Motion Graphics', 'Colour Grading'],
    budgetType: 'fixed',
    budgetMin: '500',
    budgetMax: '3000',
    timeline: '2–3 weeks',
  },
  {
    id: 'social_media',
    name: 'Social Media Pack',
    icon: 'fa-hashtag',
    color: 'bg-pink-100 text-pink-600',
    category: 'Marketing & Strategy',
    title: 'Social Media Content Pack — [Brand Name]',
    description: 'We need a complete social media content package including graphics, captions, and a posting strategy to grow our online presence.',
    goals: ['Grow social media following', 'Increase engagement rate', 'Build consistent brand voice'],
    deliverables: ['10 social media graphics (Instagram, Facebook)', '10 post captions with hashtags', 'Monthly content calendar', 'Brand style guide for social'],
    skills: ['Graphic Design', 'Social Media', 'Copywriting', 'Brand Strategy'],
    budgetType: 'fixed',
    budgetMin: '400',
    budgetMax: '1200',
    timeline: '1 week',
  },
  {
    id: 'website_ui',
    name: 'Website Design',
    icon: 'fa-desktop',
    color: 'bg-blue-100 text-cobalt',
    category: 'Digital & Interactive',
    title: 'Website UI/UX Design for [Company]',
    description: 'We need a complete website redesign with a modern, user-friendly interface. The design should be responsive, conversion-focused, and reflect our brand identity.',
    goals: ['Improve user experience', 'Increase conversion rate', 'Modernise brand presence online'],
    deliverables: ['Full desktop + mobile design (Figma)', 'Homepage + 5 inner pages', 'Interactive prototype', 'Design system / component library', 'Developer handoff files'],
    skills: ['UI/UX Design', 'Figma', 'Prototyping', 'Brand Strategy'],
    budgetType: 'fixed',
    budgetMin: '1500',
    budgetMax: '5000',
    timeline: '3–4 weeks',
  },
  {
    id: 'photo_shoot',
    name: 'Photography',
    icon: 'fa-camera',
    color: 'bg-amber-100 text-amber-600',
    category: 'Photography',
    title: 'Product/Brand Photography for [Company]',
    description: 'Professional photography session to create high-quality images for our website, social media, and marketing materials.',
    goals: ['Create professional brand imagery', 'Build a content library', 'Elevate product presentation'],
    deliverables: ['30+ edited, high-resolution photos', 'Web-optimised versions', 'Raw files', 'Rights transfer agreement'],
    skills: ['Photography', 'Photo Editing', 'Creative Direction'],
    budgetType: 'fixed',
    budgetMin: '300',
    budgetMax: '1500',
    timeline: '1 week',
  },
  {
    id: 'copywriting',
    name: 'Website Copy',
    icon: 'fa-pen',
    color: 'bg-green-100 text-green-600',
    category: 'Writing & Content',
    title: 'Website Copywriting for [Company]',
    description: 'We need compelling, SEO-optimised copy for our website that clearly communicates our value proposition and converts visitors into customers.',
    goals: ['Improve SEO ranking', 'Increase website conversions', 'Communicate brand value clearly'],
    deliverables: ['Homepage copy', '5 page copy (About, Services, etc.)', 'Meta titles & descriptions', '3 blog post drafts'],
    skills: ['Copywriting', 'SEO', 'Content Strategy'],
    budgetType: 'fixed',
    budgetMin: '300',
    budgetMax: '1000',
    timeline: '1–2 weeks',
  },
  {
    id: 'music',
    name: 'Music / Jingle',
    icon: 'fa-music',
    color: 'bg-indigo-100 text-indigo-600',
    category: 'Music & Audio',
    title: 'Original Music / Jingle for [Brand/Project]',
    description: 'We need an original piece of music or jingle for our brand, video, or campaign. The music should be memorable, match our brand personality, and be royalty-free.',
    goals: ['Create unique brand sound', 'Increase brand recall', 'Produce royalty-free music for campaigns'],
    deliverables: ['Full track (WAV + MP3)', '30-second edit', '15-second cut', 'Stems/separate tracks', 'Full rights transfer'],
    skills: ['Music Production', 'Sound Design', 'Mixing & Mastering'],
    budgetType: 'fixed',
    budgetMin: '200',
    budgetMax: '1500',
    timeline: '1–2 weeks',
  },
  {
    id: 'brand_identity',
    name: 'Brand Identity',
    icon: 'fa-star',
    color: 'bg-orange-100 text-orange-600',
    category: 'Branding',
    title: 'Complete Brand Identity for [Company]',
    description: 'We need a comprehensive brand identity system including logo, colour palette, typography, and brand guidelines to establish a consistent visual presence across all touchpoints.',
    goals: ['Build a cohesive brand identity', 'Create consistent brand experience', 'Differentiate from competitors'],
    deliverables: ['Primary + secondary logo', 'Colour system + typography', 'Brand guidelines document', 'Business card + letterhead design', 'Social media templates'],
    skills: ['Graphic Design', 'Brand Strategy', 'Creative Direction'],
    budgetType: 'fixed',
    budgetMin: '1000',
    budgetMax: '5000',
    timeline: '3–4 weeks',
  },
];

const SKILLS_SUGGESTIONS = [
  'Video Editing', 'Videography', 'Graphic Design', 'UI/UX Design', 'Motion Graphics',
  'Animation', 'VFX', 'Copywriting', 'Scriptwriting', 'Photography',
  'Music Production', 'Sound Design', 'Brand Strategy', 'Social Media',
  'Film Direction', 'Creative Direction', '3D Modeling', 'Voice Acting',
];

const QUICK_BUDGETS = [5, 25, 50, 100, 250, 500, 1000, 2500, 5000];
const MIN_BUDGET = 5;

const inp = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cobalt focus:border-transparent text-gray-900 placeholder-gray-400 text-sm';

function FeePreview({ budget }: { budget: string }) {
  const amount = useMemo(() => {
    const n = parseFloat(budget);
    return !isNaN(n) && n >= MIN_BUDGET ? n : null;
  }, [budget]);

  if (!amount) return (
    <div className="mt-1 p-4 bg-blue-50 border border-blue-100 rounded-xl">
      <div className="flex items-center gap-2 text-cobalt text-xs font-semibold mb-1">
        <i className="fa-solid fa-circle-info"></i> Platform Fee Preview
      </div>
      <p className="text-xs text-gray-500">Enter a budget above to see the fee breakdown.</p>
    </div>
  );

  const clientFee    = parseFloat((amount * 0.04).toFixed(2));
  const creatorFee   = parseFloat((amount * 0.08).toFixed(2));
  const clientTotal  = parseFloat((amount + clientFee).toFixed(2));
  const creatorEarns = parseFloat((amount - creatorFee).toFixed(2));
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="mt-1 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-blue-200 bg-blue-100/60">
        <i className="fa-solid fa-receipt text-cobalt text-sm"></i>
        <span className="text-sm font-bold text-cobalt">Fee Preview — based on ${fmt(amount)}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
        {/* Client side */}
        <div className="bg-white rounded-xl p-4 border border-blue-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <i className="fa-solid fa-building text-cobalt text-xs"></i>What you pay
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-700">
              <span>Project amount</span>
              <span className="font-semibold">${fmt(amount)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Platform fee (4%)</span>
              <span className="font-semibold text-amber-600">+${fmt(clientFee)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <span className="font-bold text-gray-900">Total charged</span>
              <span className="font-bold text-cobalt">${fmt(clientTotal)}</span>
            </div>
          </div>
        </div>
        {/* Creator side */}
        <div className="bg-white rounded-xl p-4 border border-emerald-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <i className="fa-solid fa-palette text-emerald-600 text-xs"></i>Creator receives
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-700">
              <span>Project amount</span>
              <span className="font-semibold">${fmt(amount)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Platform fee (8%)</span>
              <span className="font-semibold text-rose-500">−${fmt(creatorFee)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <span className="font-bold text-gray-900">Creator earns</span>
              <span className="font-bold text-emerald-600">${fmt(creatorEarns)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 pb-3">
        <p className="text-xs text-gray-500 flex items-start gap-1.5">
          <i className="fa-solid fa-shield-halved text-cobalt mt-0.5 flex-shrink-0"></i>
          Funds are held in escrow and only released when you approve the work. Platform fees help maintain Spectrum Connect.
        </p>
      </div>
    </div>
  );
}

export default function CreateProjectPage() {
  const router = useRouter();

  // ── Step 1: Project Info ────────────────────────────────────────────────
  const [title, setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  // ── Step 2: Goals & Deliverables ───────────────────────────────────────
  const [goals, setGoals]               = useState<string[]>([]);
  const [goalInput, setGoalInput]       = useState('');
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [delivInput, setDelivInput]     = useState('');

  // ── Step 3: Budget (single fixed price, min $5) ─────────────────────────
  const [budget, setBudget] = useState('');

  // ── Step 4: Timeline & Skills ──────────────────────────────────────────
  const [timeline, setTimeline]   = useState('');
  const [skills, setSkills]       = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  // ── Step 5: Location & Work Type ───────────────────────────────────────
  const [location, setLocation]     = useState('');
  const [eventDate, setEventDate]   = useState('');
  const [workType, setWorkType]     = useState<'remote' | 'onsite' | 'flexible'>('flexible');

  // ── Submit ──────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const publishRef = useRef<'open' | 'draft'>('open');
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);

  // ── Apply a template ─────────────────────────────────────────────────────
  const applyTemplate = (tpl: Template) => {
    setTitle(tpl.title);
    setDescription(tpl.description);
    setCategory(tpl.category);
    setGoals(tpl.goals);
    setDeliverables(tpl.deliverables);
    setSkills(tpl.skills);
    // Use the midpoint of the template's budget range as the default
    const mid = Math.round((parseInt(tpl.budgetMin) + parseInt(tpl.budgetMax)) / 2);
    setBudget(String(mid));
    setTimeline(tpl.timeline);
    setAppliedTemplate(tpl.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── helpers ─────────────────────────────────────────────────────────────
  const addItem = (
    val: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    inputSetter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const v = val.trim();
    if (v && !list.includes(v)) setter(p => [...p, v]);
    inputSetter('');
  };

  const removeItem = (
    val: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => setter(p => p.filter(x => x !== val));

  const buildRate = () => {
    const amount = parseFloat(budget);
    if (isNaN(amount) || amount < MIN_BUDGET) return {};
    return { budget: { min: amount, max: amount }, budget_type: 'fixed' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const errs: string[] = [];
    if (title.trim().length < 5)  errs.push('Project title is required (min 5 characters)');
    if (!description.trim())       errs.push('Project description is required');
    if (!category)                 errs.push('Please select a category');
    const budgetNum = parseFloat(budget);
    if (!budget || isNaN(budgetNum))         errs.push('Project budget is required');
    else if (budgetNum < MIN_BUDGET)         errs.push(`Projects must have a minimum budget of $${MIN_BUDGET}.`);
    if (errs.length) { setSubmitError(errs.join('\n')); return; }

    setSubmitting(true);

    // Compute a real deadline datetime from the timeline text
    const timelineDeadline = (() => {
      if (!timeline.trim()) return undefined;
      const t = timeline.toLowerCase();
      let days = 0;
      if (t.includes('1 week') || t === '1–2 weeks') days = 7;
      else if (t.includes('2') && t.includes('week')) days = 14;
      else if (t.includes('3') && t.includes('week')) days = 21;
      else if (t.includes('4') && t.includes('week')) days = 28;
      else if (t.includes('5') || t.includes('6') && t.includes('week')) days = 42;
      else if (t.includes('7') || t.includes('8') && t.includes('week')) days = 56;
      else if (t.includes('2') && t.includes('month')) days = 60;
      else if (t.includes('3') && t.includes('month')) days = 90;
      else if (t.includes('6') && t.includes('month')) days = 180;
      if (days > 0) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString();
      }
      return undefined;
    })();

    // Determine crew_size: if on-site work and location is set, or budget > $1,500, it's
    // likely a multi-creator project. Otherwise keep 'individual' as the default.
    const budgetNum2 = parseFloat(budget);
    const derivedCrewSize = (
      (workType === 'onsite' && location.trim()) ||
      (!isNaN(budgetNum2) && budgetNum2 >= 1500)
    ) ? 'small_crew' : 'individual';

    const payload: JobCreatePayload & { goals?: string[]; deliverables?: string[]; deadline?: string } = {
      title:       title.trim(),
      description: description.trim(),
      department:  category,
      duration:    timeline.trim() || undefined,
      deadline:    timelineDeadline,
      skills:      skills.length ? skills : [],
      tags:        [],
      crew_size:   derivedCrewSize,
      complexity:  'intermediate',
      budget_type: 'fixed',
      experience_level: 'intermediate',
      goals:        goals.length ? goals : undefined,
      deliverables: deliverables.length ? deliverables : undefined,
      location:     location.trim() || undefined,
      event_date:   eventDate || undefined,
      is_remote:    workType === 'remote' ? true : workType === 'onsite' ? false : undefined,
      status: publishRef.current,
      ...buildRate(),
    };

    try {
      await jobs.create(payload);
      router.push('/client/projects');
    } catch (err) {
      setSubmitError((err as Error).message);
      setSubmitting(false);
    }
  };

  const sectionHeader = (icon: string, iconBg: string, title: string, subtitle: string) => (
    <div className="flex items-center gap-4 mb-6">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  );

  const tagInput = (
    value: string,
    onChange: (v: string) => void,
    onAdd: () => void,
    placeholder: string
  ) => (
    <div className="flex gap-2">
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
        placeholder={placeholder}
        className={`${inp} flex-1`} />
      <button type="button" onClick={onAdd}
        className="px-4 py-3 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition flex-shrink-0">
        Add
      </button>
    </div>
  );

  const chips = (
    items: string[],
    onRemove: (v: string) => void,
    color = 'bg-blue-50 text-cobalt border-blue-100'
  ) => items.length > 0 && (
    <div className="flex flex-wrap gap-2 mt-3">
      {items.map(s => (
        <span key={s} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium border ${color}`}>
          {s}
          <button type="button" onClick={() => onRemove(s)} className="hover:opacity-60 transition">
            <i className="fa-solid fa-xmark text-xs"></i>
          </button>
        </span>
      ))}
    </div>
  );

  return (
    <>
      {/* Back + title */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/client/projects"
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition flex-shrink-0">
          <i className="fa-solid fa-arrow-left text-gray-600 text-sm"></i>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Create a Project</h1>
          <p className="text-gray-500 text-sm mt-0.5">Fill in your project details and publish to start receiving proposals</p>
        </div>
      </div>

      <div className="flex gap-8 items-start">

      {/* ── Templates sidebar (right) ── */}
      <div className="hidden xl:block w-72 flex-shrink-0 sticky top-6 order-2">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-cobalt to-blue-500 px-5 py-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <i className="fa-solid fa-bolt text-yellow-300"></i>
              <h3 className="font-bold text-sm">Quick Templates</h3>
            </div>
            <p className="text-xs text-blue-100">Click any template to pre-fill the form instantly</p>
          </div>
          <div className="p-3 space-y-1.5 max-h-[calc(100vh-200px)] overflow-y-auto">
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition group border ${
                  appliedTemplate === tpl.id
                    ? 'bg-cobalt border-cobalt text-white shadow-sm'
                    : 'bg-gray-50 border-transparent hover:border-cobalt hover:bg-blue-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  appliedTemplate === tpl.id ? 'bg-white/20' : tpl.color
                }`}>
                  <i className={`fa-solid ${tpl.icon} text-sm ${appliedTemplate === tpl.id ? 'text-white' : ''}`}></i>
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${appliedTemplate === tpl.id ? 'text-white' : 'text-gray-900'}`}>
                    {tpl.name}
                  </p>
                  <p className={`text-xs truncate ${appliedTemplate === tpl.id ? 'text-blue-100' : 'text-gray-400'}`}>
                    {tpl.category}
                  </p>
                </div>
                {appliedTemplate === tpl.id ? (
                  <i className="fa-solid fa-check text-white ml-auto flex-shrink-0 text-xs"></i>
                ) : (
                  <i className="fa-solid fa-arrow-right text-gray-300 group-hover:text-cobalt ml-auto flex-shrink-0 text-xs transition"></i>
                )}
              </button>
            ))}
          </div>
          {appliedTemplate && (
            <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100 flex items-center gap-2">
              <i className="fa-solid fa-circle-check text-emerald-600 text-sm flex-shrink-0"></i>
              <p className="text-xs text-emerald-700 font-semibold">
                Template applied! Customise as needed.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile template strip (shown below header on small screens) ── */}
      <div className="xl:hidden mb-6 order-first w-full">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <i className="fa-solid fa-bolt text-cobalt"></i>
            <h3 className="font-bold text-sm text-gray-900">Quick Templates</h3>
            <span className="text-xs text-gray-400 ml-1">— click to pre-fill the form</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition border whitespace-nowrap ${
                  appliedTemplate === tpl.id
                    ? 'bg-cobalt text-white border-cobalt'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-cobalt hover:bg-blue-50'
                }`}
              >
                <i className={`fa-solid ${tpl.icon}`}></i>
                {tpl.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 flex-1 min-w-0 order-1">

        {/* ── 1. Project Information ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 md:p-7 shadow-sm">
          {sectionHeader('circle-info', 'bg-blue-100 text-cobalt', 'Project Information', 'What are you working on?')}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Project Title <span className="text-red-500">*</span>
              </label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Logo Design for Tech Startup"
                className={inp} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button key={c} type="button" onClick={() => setCategory(c)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                      category === c
                        ? 'border-cobalt bg-blue-50 text-cobalt'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Project Description <span className="text-red-500">*</span>
              </label>
              <textarea rows={5} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe your project in detail — what you need, your vision, any important context…"
                className={`${inp} resize-none`} />
              <p className={`text-xs mt-1 ${description.length < 50 ? 'text-gray-400' : 'text-emerald-600'}`}>
                {description.length} characters{description.length < 50 ? ' — aim for at least 50' : ' ✓'}
              </p>
            </div>
          </div>
        </div>

        {/* ── 2. Project Goals ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 md:p-7 shadow-sm">
          {sectionHeader('bullseye', 'bg-purple-100 text-purple-600', 'Project Goals', 'What are you trying to achieve?')}
          <div className="space-y-2">
            {tagInput(goalInput, setGoalInput, () => addItem(goalInput, goals, setGoals, setGoalInput), 'e.g. Increase brand awareness, Launch product — press Enter')}
            {chips(goals, v => removeItem(v, setGoals), 'bg-purple-50 text-purple-700 border-purple-100')}
            {goals.length === 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {['Increase brand awareness', 'Launch a product', 'Drive website traffic', 'Grow social media', 'Tell our story'].map(s => (
                  <button key={s} type="button" onClick={() => addItem(s, goals, setGoals, setGoalInput)}
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-purple-50 hover:text-purple-700 transition">
                    + {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Deliverables ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 md:p-7 shadow-sm">
          {sectionHeader('box-open', 'bg-emerald-100 text-emerald-600', 'Deliverables', 'What should the creator produce?')}
          <div className="space-y-2">
            {tagInput(delivInput, setDelivInput, () => addItem(delivInput, deliverables, setDeliverables, setDelivInput), 'e.g. 60-second video, 3 logo concepts — press Enter')}
            {chips(deliverables, v => removeItem(v, setDeliverables), 'bg-emerald-50 text-emerald-700 border-emerald-100')}
            {deliverables.length === 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {['Edited video', 'Logo files (SVG, PNG)', 'Social media graphics', 'Written content', 'Brand guidelines'].map(s => (
                  <button key={s} type="button" onClick={() => addItem(s, deliverables, setDeliverables, setDelivInput)}
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-emerald-50 hover:text-emerald-700 transition">
                    + {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 4. Budget ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 md:p-7 shadow-sm">
          {sectionHeader('dollar-sign', 'bg-green-100 text-green-600', 'Project Budget', 'Fixed price — what is this project worth?')}
          <div className="space-y-5">
            {/* Quick-select chips */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick select</label>
              <div className="flex flex-wrap gap-2">
                {QUICK_BUDGETS.map(b => (
                  <button key={b} type="button" onClick={() => setBudget(String(b))}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                      budget === String(b)
                        ? 'border-cobalt bg-cobalt text-white'
                        : 'border-gray-200 text-gray-700 hover:border-cobalt hover:bg-blue-50'
                    }`}>
                    ${b.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual input */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Project Budget <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-2 text-xs">(minimum ${MIN_BUDGET})</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">$</span>
                <input
                  type="number"
                  min={MIN_BUDGET}
                  step="1"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  placeholder="Enter amount, e.g. 250"
                  className={`${inp} pl-8`}
                />
              </div>
              {budget && parseFloat(budget) < MIN_BUDGET && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  Projects must have a minimum budget of ${MIN_BUDGET}.
                </p>
              )}
            </div>

            {/* Live fee preview */}
            <FeePreview budget={budget} />
          </div>
        </div>

        {/* ── 5. Location & Work Type ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 md:p-7 shadow-sm">
          {sectionHeader('location-dot', 'bg-rose-100 text-rose-600', 'Location & Work Type', 'Is this an in-person, on-site, or remote project?')}
          <div className="space-y-5">
            {/* Work type */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Work Type</label>
              <div className="flex gap-2 flex-wrap">
                {(['flexible', 'remote', 'onsite'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setWorkType(t)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition capitalize ${
                      workType === t
                        ? 'border-cobalt bg-blue-50 text-cobalt'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    {t === 'flexible' ? '🌐 Flexible' : t === 'remote' ? '💻 Remote Only' : '📍 On-Site / In-Person'}
                  </button>
                ))}
              </div>
            </div>
            {/* Location — shown for on-site/flexible */}
            {workType !== 'remote' && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Location <span className="text-gray-400 font-normal text-xs">{workType === 'onsite' ? '(required for on-site)' : '(optional)'}</span>
                </label>
                <div className="relative">
                  <i className="fa-solid fa-location-dot absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Colombo, Sri Lanka"
                    className={`${inp} pl-10`} />
                </div>
              </div>
            )}
            {/* Event date — for event-based work */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Event Date <span className="text-gray-400 font-normal text-xs">(optional — for event photography, shoots, etc.)</span>
              </label>
              <div className="relative">
                <i className="fa-solid fa-calendar-day absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                  className={`${inp} pl-10`} />
              </div>
              {eventDate && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <i className="fa-solid fa-circle-info text-cobalt"></i>
                  Creators will see this date when reviewing your project.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── 6. Timeline & Skills ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 md:p-7 shadow-sm">
          {sectionHeader('calendar-days', 'bg-amber-100 text-amber-600', 'Timeline & Skills', 'When do you need it, and who should apply?')}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Timeline <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input type="text" value={timeline} onChange={e => setTimeline(e.target.value)}
                placeholder="e.g. 2 weeks, by end of July, ASAP, ongoing"
                className={inp} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Required Skills <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              {tagInput(skillInput, setSkillInput, () => addItem(skillInput, skills, setSkills, setSkillInput), 'Type a skill and press Enter')}
              <div className="flex flex-wrap gap-2 mt-3">
                {SKILLS_SUGGESTIONS.filter(s => !skills.includes(s)).slice(0, 8).map(s => (
                  <button key={s} type="button" onClick={() => addItem(s, skills, setSkills, setSkillInput)}
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-blue-50 hover:text-cobalt transition">
                    + {s}
                  </button>
                ))}
              </div>
              {chips(skills, v => removeItem(v, setSkills))}
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm flex items-start gap-3">
            <i className="fa-solid fa-circle-exclamation mt-0.5 flex-shrink-0"></i>
            <ul className="space-y-1">
              {submitError.split('\n').map((line, i) => <li key={i}>{line}</li>)}
            </ul>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center justify-between gap-3 pt-2 pb-8 flex-wrap">
          <Link href="/client/projects"
            className="text-sm text-gray-500 font-semibold hover:text-gray-800 transition">
            Cancel
          </Link>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={submitting}
              onClick={() => { publishRef.current = 'draft'; }}
              className="px-5 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:border-gray-400 transition disabled:opacity-50">
              Save as Draft
            </button>
            <button type="submit" disabled={submitting}
              onClick={() => { publishRef.current = 'open'; }}
              className="bg-cobalt text-white px-7 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-md disabled:opacity-50 flex items-center gap-2">
              {submitting ? <><i className="fa-solid fa-spinner animate-spin"></i> Publishing…</> : <><i className="fa-solid fa-rocket"></i> Publish Project</>}
            </button>
          </div>
        </div>

      </form>

      </div>{/* end two-column wrapper */}
    </>
  );
}
