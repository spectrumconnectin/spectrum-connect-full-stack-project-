'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { jobs, JobCreatePayload } from '@/lib/api';

const DEPARTMENTS = [
  'Camera', 'Cinematography', 'Directing', 'Editing', 'Post-Production',
  'Sound', 'Sound Design', 'Motion Graphics', 'Animation', 'VFX',
  'Production Design', 'Lighting', 'Script & Writing', 'Photography', 'Other',
];

const SKILLS_SUGGESTIONS = [
  'Director', 'Videographer', 'Editor', 'Animator', 'Graphic Designer',
  'Photographer', 'Copywriter', 'Sound Designer', 'Motion Designer',
  'Colorist', 'VFX Artist', 'Cinematographer', 'Gaffer', 'Grip',
];

const EXPERIENCE_LEVELS = [
  { val: 'student',      label: 'Student',       desc: 'Learning & growing' },
  { val: 'entry',        label: 'Entry Level',    desc: '0–2 years' },
  { val: 'intermediate', label: 'Mid Level',      desc: '2–5 years' },
  { val: 'expert',       label: 'Senior / Expert', desc: '5+ years' },
];

const CREW_SIZES = [
  { val: 'individual', label: 'Solo',       desc: '1 person' },
  { val: 'small_crew', label: 'Small Crew', desc: '2–10 people' },
  { val: 'full_crew',  label: 'Full Crew',  desc: '10+ people' },
];

const COMPLEXITY_LEVELS = [
  { val: 'simple',       label: 'Simple',   icon: 'fa-circle',             desc: 'Straightforward task' },
  { val: 'intermediate', label: 'Moderate', icon: 'fa-circle-half-stroke', desc: 'Some complexity' },
  { val: 'complex',      label: 'Complex',  icon: 'fa-circle-dot',         desc: 'Multi-faceted project' },
];

const BUDGET_TYPES = [
  { val: 'fixed', label: 'Fixed Price' },
  { val: 'hourly', label: 'Hourly Rate' },
  { val: 'daily', label: 'Day Rate' },
  { val: 'weekly', label: 'Weekly Rate' },
  { val: 'negotiable', label: 'Negotiable' },
];

export default function CreateProjectPage() {
  const router = useRouter();

  // Basics
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');

  // Budget
  const [budgetType, setBudgetType] = useState('fixed');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');

  // Scope
  const [crewSize, setCrewSize] = useState('small_crew');
  const [complexity, setComplexity] = useState('intermediate');
  const [experienceLevel, setExperienceLevel] = useState('intermediate');
  const [estimatedDuration, setEstimatedDuration] = useState('');

  // Skills & Tags
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Use a ref so the value is available synchronously when handleSubmit fires
  const publishDraftRef = useRef<'open' | 'draft'>('open');
  const [publishDraft, setPublishDraft] = useState<'open' | 'draft'>('open');

  const addSkill = (s: string) => {
    const val = s.trim();
    if (val && !skills.includes(val)) setSkills(prev => [...prev, val]);
    setSkillInput('');
  };

  const addTag = (t: string) => {
    const val = t.trim();
    if (val && !tags.includes(val)) setTags(prev => [...prev, val]);
    setTagInput('');
  };

  const buildRateField = () => {
    const min = budgetMin ? Number(budgetMin) : undefined;
    const max = budgetMax ? Number(budgetMax) : undefined;
    if (!min && !max) return {};
    const obj = { min, max };
    if (budgetType === 'fixed') return { budget: obj };
    if (budgetType === 'hourly') return { hourly_rate: obj };
    if (budgetType === 'daily') return { daily_rate: obj };
    if (budgetType === 'weekly') return { weekly_rate: obj };
    return {};
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Client-side validation
    const errors: string[] = [];
    if (title.trim().length < 10) errors.push('Title must be at least 10 characters');
    if (description.trim().length < 50) errors.push('Description must be at least 50 characters');
    if (!department) errors.push('Please select a department');
    if (skills.length === 0) errors.push('Add at least one required skill');
    if (tags.length === 0) errors.push('Add at least one project tag');
    if (errors.length > 0) {
      setSubmitError(errors.join('\n'));
      return;
    }

    setSubmitting(true);

    const payload: JobCreatePayload = {
      title: title.trim(),
      description: description.trim(),
      department,
      role: role.trim() || undefined,
      tags,
      skills,
      crew_size: crewSize,
      complexity,
      budget_type: budgetType,
      experience_level: experienceLevel,
      estimated_duration: estimatedDuration ? Number(estimatedDuration) : undefined,
      status: publishDraftRef.current,
      ...buildRateField(),
    };

    try {
      await jobs.create(payload);
      router.push('/client/projects');
    } catch (err) {
      setSubmitError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <section className="mb-10">
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/client/projects"
            className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition">
            <i className="fa-solid fa-arrow-left text-gray-600"></i>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Create New Project</h1>
            <p className="text-gray-600 mt-1">Post a job and connect with verified film & creative professionals</p>
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <i className="fa-solid fa-lightbulb text-cobalt text-xl"></i>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Reach the right creators</h3>
              <p className="text-sm text-gray-600">
                The more detail you provide, the better your matches. Be specific about your vision, timeline, and crew requirements.
              </p>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">

        {/* ── Project Basics ── */}
        <section className="bg-white rounded-3xl border border-gray-200 p-10 shadow-lg">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-info-circle text-cobalt text-lg"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Project Basics</h2>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Project Title *</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Documentary Film – Cinematographer Needed"
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cobalt focus:border-transparent text-gray-900 placeholder-gray-400" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Department *</label>
                <select required value={department} onChange={e => setDepartment(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cobalt text-gray-900">
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Specific Role <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" value={role} onChange={e => setRole(e.target.value)}
                  placeholder="e.g., Director of Photography"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cobalt text-gray-900 placeholder-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Project Description *</label>
              <textarea rows={6} required value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe your project vision, goals, location, deliverables, and what you're looking to create. Be as specific as possible."
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cobalt text-gray-900 placeholder-gray-400 resize-none" />
              <p className="text-xs text-gray-500 mt-2">{description.length} characters — aim for at least 200</p>
            </div>
          </div>
        </section>

        {/* ── Budget ── */}
        <section className="bg-white rounded-3xl border border-gray-200 p-10 shadow-lg">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-dollar-sign text-green-600 text-lg"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Budget</h2>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">Budget Type *</label>
              <div className="flex flex-wrap gap-3">
                {BUDGET_TYPES.map(b => (
                  <button key={b.val} type="button" onClick={() => setBudgetType(b.val)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition ${budgetType === b.val ? 'border-cobalt bg-blue-50 text-cobalt' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'}`}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
            {budgetType !== 'negotiable' && (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Minimum {budgetType === 'fixed' ? 'Budget' : budgetType === 'hourly' ? 'Hourly Rate' : budgetType === 'daily' ? 'Day Rate' : 'Weekly Rate'} ($)
                  </label>
                  <input type="number" min="0" value={budgetMin} onChange={e => setBudgetMin(e.target.value)}
                    placeholder="e.g., 500"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cobalt text-gray-900 placeholder-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Maximum ($)</label>
                  <input type="number" min="0" value={budgetMax} onChange={e => setBudgetMax(e.target.value)}
                    placeholder="e.g., 2000"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cobalt text-gray-900 placeholder-gray-400" />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Project Scope ── */}
        <section className="bg-white rounded-3xl border border-gray-200 p-10 shadow-lg">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-calendar text-purple-600 text-lg"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Project Scope</h2>
          </div>
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">Crew Size *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CREW_SIZES.map(c => (
                  <button key={c.val} type="button" onClick={() => setCrewSize(c.val)}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition text-center ${crewSize === c.val ? 'border-cobalt bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                    <span className={`font-bold text-sm ${crewSize === c.val ? 'text-cobalt' : 'text-gray-700'}`}>{c.label}</span>
                    <span className="text-xs text-gray-500">{c.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">Complexity *</label>
              <div className="grid grid-cols-3 gap-4">
                {COMPLEXITY_LEVELS.map(c => (
                  <button key={c.val} type="button" onClick={() => setComplexity(c.val)}
                    className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition ${complexity === c.val ? 'border-cobalt bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                    <i className={`fa-solid ${c.icon} text-xl ${complexity === c.val ? 'text-cobalt' : 'text-gray-400'}`}></i>
                    <span className={`font-semibold text-sm ${complexity === c.val ? 'text-cobalt' : 'text-gray-700'}`}>{c.label}</span>
                    <span className="text-xs text-gray-500">{c.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Estimated Duration <span className="text-gray-400 font-normal">(days, optional)</span>
              </label>
              <input type="number" min="1" value={estimatedDuration} onChange={e => setEstimatedDuration(e.target.value)}
                placeholder="e.g., 30"
                className="w-full max-w-xs px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cobalt text-gray-900 placeholder-gray-400" />
            </div>
          </div>
        </section>

        {/* ── Team Requirements ── */}
        <section className="bg-white rounded-3xl border border-gray-200 p-10 shadow-lg">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-users text-amber-600 text-lg"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Team Requirements</h2>
          </div>
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">Experience Level *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {EXPERIENCE_LEVELS.map(e => (
                  <button key={e.val} type="button" onClick={() => setExperienceLevel(e.val)}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition text-center ${experienceLevel === e.val ? 'border-cobalt bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                    <span className={`font-bold text-sm ${experienceLevel === e.val ? 'text-cobalt' : 'text-gray-700'}`}>{e.label}</span>
                    <span className="text-xs text-gray-500">{e.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Required Skills</label>
              <div className="flex gap-2 mb-3">
                <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }}
                  placeholder="Type a skill and press Enter"
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cobalt text-gray-900 placeholder-gray-400 text-sm" />
                <button type="button" onClick={() => addSkill(skillInput)}
                  className="px-4 py-3 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
                  Add
                </button>
              </div>
              {/* Suggestions */}
              <div className="flex flex-wrap gap-2 mb-3">
                {SKILLS_SUGGESTIONS.filter(s => !skills.includes(s)).slice(0, 8).map(s => (
                  <button key={s} type="button" onClick={() => addSkill(s)}
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-blue-50 hover:text-cobalt transition">
                    + {s}
                  </button>
                ))}
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map(s => (
                    <span key={s} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-cobalt text-white rounded-full font-medium">
                      {s}
                      <button type="button" onClick={() => setSkills(prev => prev.filter(x => x !== s))}
                        className="hover:text-blue-200 transition">
                        <i className="fa-solid fa-xmark text-xs"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Project Tags</label>
              <div className="flex gap-2 mb-3">
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                  placeholder="e.g., 4K, drone, short-film — press Enter"
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cobalt text-gray-900 placeholder-gray-400 text-sm" />
                <button type="button" onClick={() => addTag(tagInput)}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition">
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map(t => (
                    <span key={t} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-blue-50 text-cobalt rounded-full font-medium border border-blue-100">
                      {t}
                      <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))}
                        className="hover:text-red-400 transition">
                        <i className="fa-solid fa-xmark text-xs"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Error ── */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-700 text-sm flex items-start gap-3">
            <i className="fa-solid fa-circle-exclamation mt-0.5 flex-shrink-0"></i>
            <ul className="space-y-1">
              {submitError.split('\n').map((line, i) => (
                <li key={i} className="font-medium">{line}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Submit ── */}
        <div className="flex items-center justify-between pt-4 pb-8">
          <Link href="/client/projects" className="px-6 py-3 text-gray-600 font-semibold hover:text-gray-900 transition">
            Cancel
          </Link>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={submitting} onClick={() => { publishDraftRef.current = 'draft'; setPublishDraft('draft'); }}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              {submitting && publishDraft === 'draft' ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Saving…</> : 'Save as Draft'}
            </button>
            <button type="submit" disabled={submitting} onClick={() => { publishDraftRef.current = 'open'; setPublishDraft('open'); }}
              className="bg-cobalt text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting && publishDraft === 'open' ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Publishing…</> : 'Publish Project'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
