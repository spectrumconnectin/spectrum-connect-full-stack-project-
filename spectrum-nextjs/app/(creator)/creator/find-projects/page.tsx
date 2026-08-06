'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import {
  jobs, JobPostItem, formatJobBudget,
  talent, type TalentItem,
  profile as profileApi,
  smartConnect, type CreatorSmartMatch,
} from '@/lib/api';
import PushPromptCard from '@/components/PushPromptCard';
import SegmentedTabs from '@/components/SegmentedTabs';
import CreatorCard from '@/components/CreatorCard';
import DiscoverFiltersSheet from '@/components/DiscoverFiltersSheet';
import MatchReasoningSheet, { type MatchReasoningTarget } from '@/components/MatchReasoningSheet';

const DEPARTMENTS = [
  'All Departments', 'Camera', 'Cinematography', 'Directing', 'Editing',
  'Post-Production', 'Sound', 'Sound Design', 'Music Composition',
  'Motion Graphics', 'Animation', 'VFX', 'Lighting', 'Grip',
  'Art Department', 'Production Management', 'Scripting', 'Storyboarding',
  '3D Modeling', 'Producing', 'Other',
];
const SORT_OPTIONS = ['Most Recent', 'Lowest Competition', 'Highest Budget', 'Lowest Budget'];
const BUDGET_RANGES = ['Any Budget', 'Under $1,000', '$1,000 – $3,000', '$3,000 – $6,000', '$6,000+'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatBudget = formatJobBudget;

function getBudgetMin(p: JobPostItem): number {
  if (p.budget_type === 'fixed') return p.budget?.min ?? 0;
  if (p.budget_type === 'hourly') return (p.hourly_rate?.min ?? 0) * 8;
  if (p.budget_type === 'daily') return p.daily_rate?.min ?? 0;
  if (p.budget_type === 'weekly') return (p.weekly_rate?.min ?? 0) / 5;
  return 0;
}

function formatPosted(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

type Segment = 'projects' | 'creators' | 'companies';

// A "company" here is a client with at least one currently open role — this
// list is bounded by jobs.search()'s results, not a real company directory
// (no such endpoint exists), so counts and membership reflect open jobs only.
interface CompanyEntry {
  clientId: string;
  name: string;
  avatar?: string;
  location?: string;
  isVerified?: boolean;
  openRoles: number;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>('projects');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Own profile — used for the Creators segment's real "shared skills" chip
  // and to seed Smart Connect reasoning.
  const [viewerSkills, setViewerSkills] = useState<string[]>([]);
  useEffect(() => {
    profileApi.getMe().then(me => setViewerSkills((me.profile?.skills || []).map(s => s.name))).catch(() => {});
  }, []);

  // ── Projects segment state (unchanged logic from the former Find Projects page) ──
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [budget, setBudget] = useState('Any Budget');
  const [sort, setSort] = useState('Most Recent');
  const [projects, setProjects] = useState<JobPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const toggleSave = (id: string) =>
    setSaved(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  useEffect(() => {
    if (segment !== 'projects') return;
    let cancelled = false;
    const delay = search ? 400 : 0;
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number | undefined> = { limit: 40 };
        if (search.trim()) params.search = search.trim();
        if (department !== 'All Departments') params.department = department;
        if (budget === 'Under $1,000') { params.max_budget = 1000; }
        else if (budget === '$1,000 – $3,000') { params.min_budget = 1000; params.max_budget = 3000; }
        else if (budget === '$3,000 – $6,000') { params.min_budget = 3000; params.max_budget = 6000; }
        else if (budget === '$6,000+') { params.min_budget = 6000; }
        if (sort === 'Lowest Competition') { params.sort_by = 'proposals'; params.sort_order = 'asc'; }
        else if (sort === 'Highest Budget') { params.sort_by = 'budget'; params.sort_order = 'desc'; }
        else if (sort === 'Lowest Budget') { params.sort_by = 'budget'; params.sort_order = 'asc'; }

        const result = await jobs.search(params);
        if (!cancelled) setProjects(result.jobs || []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, delay);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [segment, search, department, budget, sort, refreshKey]);

  const sorted = sort === 'Lowest Competition'
    ? [...projects].sort((a, b) => a.proposal_count - b.proposal_count)
    : sort === 'Highest Budget'
      ? [...projects].sort((a, b) => getBudgetMin(b) - getBudgetMin(a))
      : sort === 'Lowest Budget'
        ? [...projects].sort((a, b) => getBudgetMin(a) - getBudgetMin(b))
        : projects;

  // Real AI-curated matches (with real match_percent) — this is the honest
  // home for "why matched" reasoning; the plain browse list above has no
  // per-job match score, so it never gets a fabricated one.
  const [aiMatches, setAiMatches] = useState<CreatorSmartMatch[]>([]);
  const [aiMatchesLoading, setAiMatchesLoading] = useState(true);
  useEffect(() => {
    smartConnect.getCreatorMatches(4)
      .then(r => setAiMatches(r.matches || []))
      .catch(() => {})
      .finally(() => setAiMatchesLoading(false));
  }, []);
  const [reasoningTarget, setReasoningTarget] = useState<MatchReasoningTarget | null>(null);

  // ── Creators segment state ──
  const [creatorQuery, setCreatorQuery] = useState('');
  const [creatorSkill, setCreatorSkill] = useState('');
  const [creatorLocation, setCreatorLocation] = useState('');
  const [creators, setCreators] = useState<TalentItem[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);
  const [resolvingCreatorId, setResolvingCreatorId] = useState<string | null>(null);

  useEffect(() => {
    if (segment !== 'creators') return;
    let cancelled = false;
    const delay = creatorQuery ? 400 : 0;
    const timeout = setTimeout(() => {
      setCreatorsLoading(true);
      talent.search({
        q: creatorQuery.trim() || undefined,
        skill: creatorSkill.trim() || undefined,
        location: creatorLocation.trim() || undefined,
        limit: 30,
      })
        .then(r => { if (!cancelled) setCreators(r.talent || []); })
        .catch(() => { if (!cancelled) setCreators([]); })
        .finally(() => { if (!cancelled) setCreatorsLoading(false); });
    }, delay);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [segment, creatorQuery, creatorSkill, creatorLocation]);

  // Lazily resolves a TalentItem's real username (not exposed on TalentItem
  // itself) via the public profile endpoint, then navigates to the real,
  // already-indexed public portfolio page — reusing it instead of building a
  // duplicate profile overlay.
  const openCreatorProfile = async (item: TalentItem) => {
    setResolvingCreatorId(item.id);
    try {
      const pub = await profileApi.getPublic(item.id);
      router.push(`/portfolio/${pub.username}`);
    } catch {
      // Swallow — leave the creator on Discover rather than a broken route.
    } finally {
      setResolvingCreatorId(null);
    }
  };

  // ── Companies segment state ──
  const [companies, setCompanies] = useState<CompanyEntry[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  useEffect(() => {
    if (segment !== 'companies' || companies.length > 0) return;
    let cancelled = false;
    setCompaniesLoading(true);
    jobs.search({ limit: 40 })
      .then(async result => {
        const list = result.jobs || [];
        const counts = new Map<string, number>();
        list.forEach(j => counts.set(j.client_id, (counts.get(j.client_id) || 0) + 1));
        const ids = Array.from(counts.keys()).slice(0, 12);
        const settled = await Promise.allSettled(ids.map(id => profileApi.getPublic(id)));
        if (cancelled) return;
        const entries: CompanyEntry[] = settled
          .map((res, i): CompanyEntry | null => {
            if (res.status !== 'fulfilled') return null;
            const pub = res.value;
            return {
              clientId: ids[i],
              name: pub.profile?.display_name || pub.username,
              avatar: pub.profile?.profile_picture,
              location: [pub.profile?.location?.city, pub.profile?.location?.country].filter(Boolean).join(', '),
              isVerified: pub.is_verified,
              openRoles: counts.get(ids[i]) || 0,
            };
          })
          .filter((e): e is CompanyEntry => e !== null);
        setCompanies(entries);
      })
      .catch(() => { if (!cancelled) setCompanies([]); })
      .finally(() => { if (!cancelled) setCompaniesLoading(false); });
    return () => { cancelled = true; };
  }, [segment, companies.length]);

  const segmentLabel = useMemo(() => ({
    projects: 'Search by skill, keyword, or department…',
    creators: 'Search creators by name or skill…',
    companies: '',
  }[segment]), [segment]);

  return (
    <>
      <PushPromptCard />

      {/* ── Header ── */}
      <section className="mb-6">
        <div className="max-w-3xl mb-5">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">Discover</h1>
          <p className="text-lg text-gray-500">Browse open projects, fellow creators, and clients hiring right now.</p>
        </div>

        {segment !== 'companies' && (
          <div className="flex gap-3 flex-wrap mb-4">
            <div className="relative flex-1 min-w-60">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                value={segment === 'projects' ? search : creatorQuery}
                onChange={e => segment === 'projects' ? setSearch(e.target.value) : setCreatorQuery(e.target.value)}
                placeholder={segmentLabel}
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-blue-100 shadow-sm"
              />
            </div>
            <button onClick={() => setFiltersOpen(true)}
              className="w-[46px] h-[46px] flex-shrink-0 bg-gray-900 rounded-xl flex items-center justify-center hover:bg-gray-800 transition">
              <i className="fa-solid fa-sliders text-white text-sm"></i>
            </button>
          </div>
        )}

        <SegmentedTabs
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'projects', label: 'Projects' },
            { value: 'creators', label: 'Creators' },
            { value: 'companies', label: 'Companies' },
          ]}
        />
      </section>

      {segment === 'projects' && (
        <>
          {/* AI-recommended matches — the only place with a real match score */}
          {!aiMatchesLoading && aiMatches.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-wand-magic-sparkles text-purple-500 text-sm"></i>
                  <h2 className="text-base font-bold text-gray-900">Matched for you</h2>
                </div>
                <Link href="/creator/smart-connect" className="text-xs font-semibold text-cobalt hover:underline">See all →</Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {aiMatches.map(m => (
                  <div key={m.id} className="flex-shrink-0 w-[220px] bg-white rounded-[18px] p-4 shadow-[0_1px_2px_rgba(15,23,42,.05)] flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-cobalt bg-blue-50 px-2.5 py-1 rounded-full">{m.match_percent}% match</span>
                    </div>
                    <div className="text-[14px] font-bold text-gray-900 leading-snug line-clamp-2">{m.title}</div>
                    <button onClick={() => setReasoningTarget({ title: m.title, match_percent: m.match_percent, skills: m.skills })}
                      className="text-left text-[11.5px] font-semibold text-purple-600 bg-transparent border-0 p-0 mt-auto">
                      Why this matched <i className="fa-solid fa-arrow-right text-[9px] ml-0.5"></i>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Live count + list */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-600">
              {loading ? (
                <span className="text-gray-400">Searching…</span>
              ) : error ? (
                <span className="text-red-500">Error loading</span>
              ) : (
                <>
                  <span className="font-semibold text-gray-900">{sorted.length}</span> projects found
                  {search && <span> for <span className="font-semibold text-cobalt">&ldquo;{search}&rdquo;</span></span>}
                </>
              )}
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Loading projects…</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-[20px] p-16 text-center shadow-[0_1px_2px_rgba(15,23,42,.05)]">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Failed to load projects</h3>
              <p className="text-gray-500 text-sm mb-4">{error}</p>
              <button onClick={() => setRefreshKey(k => k + 1)}
                className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
                Try again
              </button>
            </div>
          ) : sorted.length === 0 ? (
            <div className="bg-white rounded-[20px] p-16 text-center shadow-[0_1px_2px_rgba(15,23,42,.05)]">
              <h3 className="text-lg font-bold text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-500 text-sm mb-4">Try adjusting your filters or search terms.</p>
              <button onClick={() => { setSearch(''); setDepartment('All Departments'); setBudget('Any Budget'); }}
                className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map(p => (
                <ProjectCard key={p.id} project={p} saved={saved} onSave={toggleSave} expanded={expanded} onExpand={setExpanded} />
              ))}
            </div>
          )}
        </>
      )}

      {segment === 'creators' && (
        <>
          {creatorsLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
            </div>
          ) : creators.length === 0 ? (
            <div className="bg-white rounded-[20px] p-16 text-center shadow-[0_1px_2px_rgba(15,23,42,.05)]">
              <h3 className="text-lg font-bold text-gray-900 mb-2">No creators found</h3>
              <p className="text-gray-500 text-sm">Try a different search or clear your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {creators.map(item => (
                <CreatorCard
                  key={item.id}
                  item={item}
                  viewerSkills={viewerSkills}
                  onOpen={() => openCreatorProfile(item)}
                />
              ))}
            </div>
          )}
          {resolvingCreatorId && (
            <p className="text-center text-xs text-gray-400 mt-4">Opening profile…</p>
          )}
        </>
      )}

      {segment === 'companies' && (
        <>
          {companiesLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
            </div>
          ) : companies.length === 0 ? (
            <div className="bg-white rounded-[20px] p-16 text-center shadow-[0_1px_2px_rgba(15,23,42,.05)]">
              <h3 className="text-lg font-bold text-gray-900 mb-2">No open roles right now</h3>
              <p className="text-gray-500 text-sm">Check back soon, or browse Projects directly.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {companies.map(c => (
                <div key={c.clientId} className="flex items-center gap-3 bg-white rounded-[20px] p-4 shadow-[0_1px_2px_rgba(15,23,42,.05)]">
                  {c.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatar} alt={c.name} className="w-12 h-12 rounded-2xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {c.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] font-bold text-gray-900 truncate">{c.name}</span>
                      {c.isVerified && <i className="fa-solid fa-circle-check text-cobalt text-xs" title="Verified"></i>}
                    </div>
                    <div className="text-[12px] text-gray-400 font-semibold">
                      {c.location || 'Location not set'} · {c.openRoles} open role{c.openRoles !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-center text-[11px] text-gray-300 mt-5">Showing clients with currently open roles.</p>
        </>
      )}

      <DiscoverFiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        segment={segment === 'companies' ? 'projects' : segment}
        department={department} onDepartmentChange={setDepartment} departments={DEPARTMENTS}
        budget={budget} onBudgetChange={setBudget} budgets={BUDGET_RANGES}
        sort={sort} onSortChange={setSort} sorts={SORT_OPTIONS}
        skill={creatorSkill} onSkillChange={setCreatorSkill}
        location={creatorLocation} onLocationChange={setCreatorLocation}
      />

      <MatchReasoningSheet target={reasoningTarget} onClose={() => setReasoningTarget(null)} />
    </>
  );
}

// ── Project card (unchanged from the former Find Projects page) ────────────────

function ProjectCard({
  project: p,
  saved,
  onSave,
  expanded,
  onExpand,
}: {
  project: JobPostItem;
  saved: string[];
  onSave: (id: string) => void;
  expanded: string | null;
  onExpand: (id: string | null) => void;
}) {
  const isSaved = saved.includes(p.id);
  const isExpanded = expanded === p.id;
  const desc = p.description || '';
  const budgetStr = formatBudget(p);
  const postedStr = formatPosted(p.published_at || p.created_at);
  const durationStr = p.duration || (p.estimated_duration ? `${p.estimated_duration} days` : null);

  return (
    <div className="bg-white rounded-[20px] shadow-[0_1px_2px_rgba(15,23,42,.05)] hover:shadow-md transition-all">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Department icon */}
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <i className="fa-solid fa-clapperboard text-cobalt"></i>
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-gray-900">{p.title}</h3>
                {p.complexity === 'complex' && (
                  <span className="text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">Complex</span>
                )}
                {p.proposal_count === 0 && (
                  <span className="text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">New</span>
                )}
              </div>
              <button onClick={() => onSave(p.id)} title={isSaved ? 'Remove' : 'Save'}
                className={`p-1.5 rounded-lg transition flex-shrink-0 ${isSaved ? 'text-cobalt bg-blue-50' : 'text-gray-400 hover:text-cobalt hover:bg-gray-50'}`}>
                <i className={`fa-${isSaved ? 'solid' : 'regular'} fa-bookmark text-sm`}></i>
              </button>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 flex-wrap">
              <span className="text-cobalt font-semibold">{p.department}</span>
              {p.role && <><span className="text-gray-300">·</span><span>{p.role}</span></>}
              <span className="text-gray-300">·</span>
              <span className="capitalize">{p.experience_level}</span>
              {p.crew_size && <><span className="text-gray-300">·</span><span className="capitalize">{p.crew_size.replace('_', ' ')}</span></>}
              {postedStr && <><span className="text-gray-300">·</span><span>{postedStr}</span></>}
            </div>

            {/* Description */}
            {desc && (
              <>
                <p className={`text-sm text-gray-600 mb-3 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>{desc}</p>
                {desc.length > 120 && (
                  <button onClick={() => onExpand(isExpanded ? null : p.id)}
                    className="text-xs text-cobalt font-medium hover:underline mb-3 block">
                    {isExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </>
            )}

            {/* Tags + stats */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex flex-wrap gap-1.5">
                {(p.tags || []).slice(0, 5).map(t => (
                  <span key={t} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">{t}</span>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1 font-medium text-gray-700">
                  <i className="fa-solid fa-dollar-sign text-gray-400"></i>{budgetStr}
                </span>
                {durationStr && (
                  <span className="flex items-center gap-1">
                    <i className="fa-regular fa-clock text-gray-400"></i>{durationStr}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <i className="fa-solid fa-paper-plane text-gray-400"></i>
                  <span className={p.proposal_count < 5 ? 'text-green-600 font-semibold' : ''}>{p.proposal_count} proposals</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-4 flex items-center gap-3 border-t border-gray-100 pt-4">
        <Link href={`/creator/find-projects/${p.id}/apply`}
          className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          <i className="fa-solid fa-paper-plane mr-2"></i>Apply Now
        </Link>
        <Link href={`/creator/find-projects/${p.id}`}
          className="px-5 py-2.5 border border-cobalt text-cobalt rounded-xl text-sm font-semibold hover:bg-blue-50 transition">
          View Details
        </Link>
        {postedStr && (
          <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
            <i className="fa-regular fa-calendar text-gray-300"></i>
            Posted {postedStr}
          </span>
        )}
      </div>
    </div>
  );
}
