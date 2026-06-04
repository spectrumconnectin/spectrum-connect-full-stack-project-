'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { jobs, JobCreatePayload } from '@/lib/api';

const CATEGORIES = [
  'Design', 'Film & Video', 'Writing & Content', 'Marketing & Strategy',
  'Music & Audio', 'Digital & Interactive', 'Photography', 'Branding', 'Other',
];

const SKILLS_SUGGESTIONS = [
  'Video Editing', 'Videography', 'Graphic Design', 'UI/UX Design', 'Motion Graphics',
  'Animation', 'VFX', 'Copywriting', 'Scriptwriting', 'Photography',
  'Music Production', 'Sound Design', 'Brand Strategy', 'Social Media',
  'Film Direction', 'Creative Direction', '3D Modeling', 'Voice Acting',
];

const BUDGET_TYPES = [
  { val: 'fixed',      label: 'Fixed Price',  desc: 'One total payment' },
  { val: 'hourly',     label: 'Hourly Rate',  desc: 'Per hour worked' },
  { val: 'daily',      label: 'Day Rate',     desc: 'Per day worked' },
  { val: 'negotiable', label: 'Negotiable',   desc: 'Open to discuss' },
];

const inp = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cobalt focus:border-transparent text-gray-900 placeholder-gray-400 text-sm';

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

  // ── Step 3: Budget ──────────────────────────────────────────────────────
  const [budgetType, setBudgetType] = useState('fixed');
  const [budgetMin, setBudgetMin]   = useState('');
  const [budgetMax, setBudgetMax]   = useState('');

  // ── Step 4: Timeline & Skills ──────────────────────────────────────────
  const [timeline, setTimeline]   = useState('');
  const [skills, setSkills]       = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  // ── Submit ──────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const publishRef = useRef<'open' | 'draft'>('open');

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
    const min = budgetMin ? Number(budgetMin) : undefined;
    const max = budgetMax ? Number(budgetMax) : undefined;
    if (!min && !max) return {};
    const obj = { min, max };
    if (budgetType === 'fixed')  return { budget: obj };
    if (budgetType === 'hourly') return { hourly_rate: obj };
    if (budgetType === 'daily')  return { daily_rate: obj };
    return {};
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const errs: string[] = [];
    if (title.trim().length < 5)  errs.push('Project title is required (min 5 characters)');
    if (!description.trim())       errs.push('Project description is required');
    if (!category)                 errs.push('Please select a category');
    if (errs.length) { setSubmitError(errs.join('\n')); return; }

    setSubmitting(true);
    const payload: JobCreatePayload & { goals?: string[]; deliverables?: string[] } = {
      title:       title.trim(),
      description: description.trim(),
      department:  category,
      duration:    timeline.trim() || undefined,
      skills:      skills.length ? skills : [],
      tags:        [],
      crew_size:   'individual',
      complexity:  'intermediate',
      budget_type: budgetType,
      experience_level: 'intermediate',
      goals:        goals.length ? goals : undefined,
      deliverables: deliverables.length ? deliverables : undefined,
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
          <h1 className="text-3xl font-bold text-gray-900">Create a Project</h1>
          <p className="text-gray-500 text-sm mt-0.5">Fill in your project details and publish to start receiving proposals</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">

        {/* ── 1. Project Information ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm">
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
        <div className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm">
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
        <div className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm">
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
        <div className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm">
          {sectionHeader('dollar-sign', 'bg-green-100 text-green-600', 'Budget', 'How much are you willing to pay?')}
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              {BUDGET_TYPES.map(b => (
                <button key={b.val} type="button" onClick={() => setBudgetType(b.val)}
                  className={`flex flex-col items-start px-4 py-3 rounded-xl border-2 transition min-w-[110px] ${
                    budgetType === b.val
                      ? 'border-cobalt bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <span className={`font-bold text-sm ${budgetType === b.val ? 'text-cobalt' : 'text-gray-700'}`}>{b.label}</span>
                  <span className="text-xs text-gray-400 mt-0.5">{b.desc}</span>
                </button>
              ))}
            </div>
            {budgetType !== 'negotiable' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Min ($)</label>
                  <input type="number" min="0" value={budgetMin} onChange={e => setBudgetMin(e.target.value)}
                    placeholder="e.g. 500" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Max ($)</label>
                  <input type="number" min="0" value={budgetMax} onChange={e => setBudgetMax(e.target.value)}
                    placeholder="e.g. 2000" className={inp} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 5. Timeline & Skills ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm">
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
    </>
  );
}
