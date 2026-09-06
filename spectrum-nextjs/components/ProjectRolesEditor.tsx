'use client';

import { useState } from 'react';
import { ProjectRoleInput } from '@/lib/api';

/**
 * Project Roles editor for the project creation form.
 *
 * Projects that need a team define one row per role ("Camera Operator ×2"),
 * each with its own seat count, budget and requirements. Creators then apply to
 * a specific role rather than to the project as a whole.
 *
 * Leaving this empty keeps the single-creator flow — that stays the default,
 * since most projects hire one person.
 */

const inp =
  'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none ' +
  'focus:ring-2 focus:ring-cobalt focus:border-transparent text-gray-900 placeholder-gray-400 text-sm';

const inpSm =
  'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none ' +
  'focus:ring-2 focus:ring-cobalt focus:border-transparent text-gray-900 placeholder-gray-400 text-sm';

/** Common crews, offered as one-tap starting points per project category. */
const ROLE_SUGGESTIONS: Record<string, string[]> = {
  'Film & Video': ['Director', 'Camera Operator', 'Video Editor', 'Sound Engineer', 'Production Assistant', 'Colourist'],
  Photography: ['Photographer', 'Photo Editor', 'Lighting Assistant', 'Stylist'],
  Design: ['Art Director', 'Graphic Designer', 'Illustrator', 'Motion Designer'],
  'Music & Audio': ['Composer', 'Sound Engineer', 'Mixing Engineer', 'Voice Artist'],
  'Digital & Interactive': ['UI/UX Designer', 'Frontend Developer', 'Backend Developer', 'QA Tester'],
  'Writing & Content': ['Copywriter', 'Editor', 'Scriptwriter', 'Proofreader'],
  'Marketing & Strategy': ['Strategist', 'Social Media Manager', 'Copywriter', 'Analyst'],
  Branding: ['Brand Strategist', 'Logo Designer', 'Copywriter'],
};

const FALLBACK_SUGGESTIONS = ['Director', 'Designer', 'Editor', 'Producer', 'Assistant'];

interface Props {
  roles: ProjectRoleInput[];
  onChange: (roles: ProjectRoleInput[]) => void;
  category: string;
  /** Total project budget, used to show what's still unallocated. */
  totalBudget: number | null;
  currencySymbol: string;
}

export default function ProjectRolesEditor({
  roles,
  onChange,
  category,
  totalBudget,
  currencySymbol,
}: Props) {
  // Which role rows have their requirements panel open. Rows expand in place
  // rather than opening a dialog, so the whole crew stays visible while editing.
  const [expanded, setExpanded] = useState<number[]>([]);
  const [skillDraft, setSkillDraft] = useState<Record<number, string>>({});
  const [delivDraft, setDelivDraft] = useState<Record<number, string>>({});

  const suggestions = ROLE_SUGGESTIONS[category] ?? FALLBACK_SUGGESTIONS;
  const unusedSuggestions = suggestions.filter(
    s => !roles.some(r => r.title.trim().toLowerCase() === s.toLowerCase()),
  );

  const totalSeats = roles.reduce((sum, r) => sum + (r.count || 0), 0);
  const allocated = roles.reduce((sum, r) => sum + (r.budget_allocation || 0), 0);
  const remaining = totalBudget !== null ? totalBudget - allocated : null;
  const overAllocated = remaining !== null && remaining < 0;

  const update = (i: number, patch: Partial<ProjectRoleInput>) =>
    onChange(roles.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const addRole = (title = '') => {
    onChange([...roles, { title, count: 1 }]);
    if (!title) setExpanded(prev => [...prev, roles.length]);
  };

  const removeRole = (i: number) => {
    onChange(roles.filter((_, idx) => idx !== i));
    setExpanded(prev => prev.filter(x => x !== i).map(x => (x > i ? x - 1 : x)));
  };

  const toggleExpanded = (i: number) =>
    setExpanded(prev => (prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]));

  const addToList = (i: number, key: 'skills' | 'deliverables', value: string) => {
    const v = value.trim();
    if (!v) return;
    const current = roles[i][key] ?? [];
    if (current.some(x => x.toLowerCase() === v.toLowerCase())) return;
    update(i, { [key]: [...current, v] } as Partial<ProjectRoleInput>);
  };

  const removeFromList = (i: number, key: 'skills' | 'deliverables', value: string) =>
    update(i, { [key]: (roles[i][key] ?? []).filter(x => x !== value) } as Partial<ProjectRoleInput>);

  return (
    <div className="space-y-4">
      {roles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-5 py-6 text-center">
          <p className="text-sm text-gray-600">
            Hiring one person? Skip this — you&apos;ll receive proposals for the project as a whole.
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Building a team? Add each position you need to fill.
          </p>
          <button
            type="button"
            onClick={() => addRole()}
            className="mt-4 px-4 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
          >
            <i className="fa-solid fa-plus text-xs mr-2"></i>
            Add a role
          </button>

          {unusedSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-5">
              {unusedSuggestions.slice(0, 6).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addRole(s)}
                  className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full hover:border-cobalt hover:text-cobalt transition"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {roles.map((role, i) => {
              const isOpen = expanded.includes(i);
              const perSeat =
                role.budget_allocation && role.count > 0
                  ? role.budget_allocation / role.count
                  : null;

              return (
                <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  {/* Row: title, seats, budget */}
                  <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 sm:items-center">
                    <input
                      type="text"
                      value={role.title}
                      onChange={e => update(i, { title: e.target.value })}
                      placeholder="Role title — e.g. Camera Operator"
                      className={inpSm}
                    />

                    {/* Seat stepper — most roles need 1–3 people, so buttons beat a keyboard */}
                    <div className="flex items-center gap-1 justify-self-start">
                      <button
                        type="button"
                        onClick={() => update(i, { count: Math.max(1, (role.count || 1) - 1) })}
                        disabled={(role.count || 1) <= 1}
                        aria-label={`Fewer ${role.title || 'role'} positions`}
                        className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:border-cobalt hover:text-cobalt disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition"
                      >
                        <i className="fa-solid fa-minus text-xs"></i>
                      </button>
                      <span className="w-[4.75rem] text-center text-sm font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                        {role.count || 1}
                        <span className="text-gray-400 font-normal">
                          {(role.count || 1) === 1 ? ' person' : ' people'}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => update(i, { count: Math.min(100, (role.count || 1) + 1) })}
                        aria-label={`More ${role.title || 'role'} positions`}
                        className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:border-cobalt hover:text-cobalt transition"
                      >
                        <i className="fa-solid fa-plus text-xs"></i>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 justify-self-start">
                      <span className="text-sm font-semibold text-gray-500">{currencySymbol}</span>
                      <input
                        type="number"
                        min={0}
                        value={role.budget_allocation ?? ''}
                        onChange={e =>
                          update(i, {
                            budget_allocation: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        placeholder="Budget"
                        aria-label={`Budget for ${role.title || 'this role'}`}
                        className={`${inpSm} w-28`}
                      />
                    </div>

                    <div className="flex items-center gap-1 justify-self-end">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(i)}
                        className={`px-3 h-8 rounded-lg text-xs font-semibold border transition ${
                          isOpen
                            ? 'border-cobalt text-cobalt bg-blue-50'
                            : 'border-gray-200 text-gray-600 hover:border-cobalt hover:text-cobalt'
                        }`}
                      >
                        Details
                        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-[10px] ml-1.5`}></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRole(i)}
                        aria-label={`Remove ${role.title || 'role'}`}
                        className="w-8 h-8 rounded-lg border border-gray-200 text-gray-400 hover:border-rose-200 hover:text-rose-500 hover:bg-rose-50 transition"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </div>
                  </div>

                  {/* Per-seat split — only meaningful once a role has several seats */}
                  {perSeat !== null && (role.count || 1) > 1 && (
                    <div className="px-4 pb-3 -mt-1">
                      <p className="text-xs text-gray-500">
                        {currencySymbol}
                        {perSeat.toLocaleString(undefined, { maximumFractionDigits: 2 })} per person
                      </p>
                    </div>
                  )}

                  {isOpen && (
                    <div className="border-t border-gray-100 bg-gray-50/60 p-4 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          What this role does
                        </label>
                        <textarea
                          rows={2}
                          value={role.description ?? ''}
                          onChange={e => update(i, { description: e.target.value || undefined })}
                          placeholder="Shoot the interview segments on day two, handheld and tripod."
                          className={`${inpSm} resize-none bg-white`}
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <ListField
                          label="Required skills"
                          items={role.skills ?? []}
                          draft={skillDraft[i] ?? ''}
                          setDraft={v => setSkillDraft(d => ({ ...d, [i]: v }))}
                          onAdd={v => { addToList(i, 'skills', v); setSkillDraft(d => ({ ...d, [i]: '' })); }}
                          onRemove={v => removeFromList(i, 'skills', v)}
                          placeholder="e.g. ARRI cameras"
                          chipClass="bg-blue-50 text-cobalt border-blue-100"
                        />
                        <ListField
                          label="Deliverables"
                          items={role.deliverables ?? []}
                          draft={delivDraft[i] ?? ''}
                          setDraft={v => setDelivDraft(d => ({ ...d, [i]: v }))}
                          onAdd={v => { addToList(i, 'deliverables', v); setDelivDraft(d => ({ ...d, [i]: '' })); }}
                          onRemove={v => removeFromList(i, 'deliverables', v)}
                          placeholder="e.g. Raw footage, day 2"
                          chipClass="bg-emerald-50 text-emerald-700 border-emerald-100"
                        />
                      </div>

                      <div className="sm:w-56">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Time on the project
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            value={role.duration_days ?? ''}
                            onChange={e =>
                              update(i, {
                                duration_days: e.target.value === '' ? undefined : Number(e.target.value),
                              })
                            }
                            placeholder="—"
                            className={`${inpSm} bg-white w-24`}
                          />
                          <span className="text-sm text-gray-500">days</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => addRole()}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:border-cobalt hover:text-cobalt transition"
            >
              <i className="fa-solid fa-plus text-xs mr-2"></i>
              Add role
            </button>
            {unusedSuggestions.slice(0, 4).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => addRole(s)}
                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-blue-50 hover:text-cobalt transition"
              >
                + {s}
              </button>
            ))}
          </div>

          {/* Budget reconciliation — the backend rejects over-allocation, so
              surface the shortfall here rather than at submit time. */}
          <div
            className={`rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 ${
              overAllocated ? 'border-rose-200 bg-rose-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{roles.length}</span>
              {roles.length === 1 ? ' role' : ' roles'}
              <span className="text-gray-300 mx-2">·</span>
              <span className="font-semibold text-gray-900">{totalSeats}</span>
              {totalSeats === 1 ? ' person to hire' : ' people to hire'}
            </p>
            {totalBudget !== null && allocated > 0 && (
              <p className={`text-sm ${overAllocated ? 'text-rose-700' : 'text-gray-600'}`}>
                {currencySymbol}
                {allocated.toLocaleString()} allocated
                <span className="text-gray-300 mx-2">·</span>
                {overAllocated ? (
                  <span className="font-semibold">
                    {currencySymbol}
                    {Math.abs(remaining!).toLocaleString()} over budget
                  </span>
                ) : (
                  <>
                    <span className="font-semibold text-gray-900">
                      {currencySymbol}
                      {remaining!.toLocaleString()}
                    </span>{' '}
                    unallocated
                  </>
                )}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Chip list with an inline add field — mirrors the goals/deliverables inputs. */
function ListField({
  label,
  items,
  draft,
  setDraft,
  onAdd,
  onRemove,
  placeholder,
  chipClass,
}: {
  label: string;
  items: string[];
  draft: string;
  setDraft: (v: string) => void;
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  placeholder: string;
  chipClass: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd(draft);
            }
          }}
          placeholder={placeholder}
          className={`${inpSm} bg-white flex-1`}
        />
        <button
          type="button"
          onClick={() => onAdd(draft)}
          className="px-3 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-semibold hover:border-cobalt hover:text-cobalt transition flex-shrink-0"
        >
          Add
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {items.map(v => (
            <span
              key={v}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${chipClass}`}
            >
              {v}
              <button type="button" onClick={() => onRemove(v)} className="hover:opacity-60 transition">
                <i className="fa-solid fa-xmark text-[10px]"></i>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
