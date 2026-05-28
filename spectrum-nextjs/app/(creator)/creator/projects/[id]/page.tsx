'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { creatorProjects, profile, ProjectItem, ProjectTeamMember, ActivityLogItem, PublicProfile } from '@/lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  in_progress: 'bg-green-100 text-green-700',
  active:      'bg-green-100 text-green-700',
  on_hold:     'bg-yellow-100 text-yellow-700',
  completed:   'bg-blue-100 text-blue-700',
  draft:       'bg-gray-100 text-gray-500',
};

const STATUS_LABEL: Record<string, string> = {
  in_progress: 'Active',
  active:      'Active',
  on_hold:     'On Hold',
  completed:   'Completed',
  draft:       'Draft',
};

const ACTIVITY_ICON: Record<string, string> = {
  project_created:    'fa-plus-circle',
  member_added:       'fa-user-plus',
  member_removed:     'fa-user-minus',
  status_updated:     'fa-arrows-rotate',
  progress_updated:   'fa-chart-line',
  deadline_created:   'fa-calendar-plus',
  deadline_completed: 'fa-calendar-check',
  message_sent:       'fa-message',
};

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(iso?: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5">
      <div className="bg-cobalt h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function MemberAvatar({ m }: { m: ProjectTeamMember }) {
  if (m.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={m.avatar_url} alt={m.username} className="w-10 h-10 rounded-xl border border-gray-200 object-cover" />;
  }
  return (
    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-cobalt font-bold text-sm flex-shrink-0">
      {m.username?.[0]?.toUpperCase()}
    </div>
  );
}

// ── Progress update modal ─────────────────────────────────────────────────────
function ProgressModal({ current, onClose, onSave }: {
  current: number;
  onClose: () => void;
  onSave: (v: number) => Promise<void>;
}) {
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Update Progress</h3>
        <p className="text-sm text-gray-500 mb-5">Drag to set the current completion percentage.</p>
        <div className="flex items-center gap-4 mb-5">
          <input type="range" min={0} max={100} value={value} onChange={e => setValue(Number(e.target.value))}
            className="flex-1 accent-cobalt" />
          <span className="text-2xl font-bold text-cobalt w-14 text-right">{value}%</span>
        </div>
        <ProgressBar value={value} />
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button disabled={saving} onClick={async () => { setSaving(true); await onSave(value); setSaving(false); onClose(); }}
            className="flex-1 py-2.5 bg-cobalt text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CreatorProjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [project, setProject]   = useState<ProjectItem | null>(null);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [clientProfile, setClientProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const [proj, acts] = await Promise.all([
        creatorProjects.getById(id),
        creatorProjects.getActivity(id, 15),
      ]);
      setProject(proj);
      setActivities(acts);
      // fetch client profile in background — don't block render
      profile.getPublic(proj.client_id).then(setClientProfile).catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleProgressSave = async (v: number) => {
    if (!id) return;
    const updated = await creatorProjects.updateProgress(id, v);
    setProject(updated);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Loading project…</p>
    </div>
  );

  if (error || !project) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
      <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
      <p className="text-red-500 text-sm mb-4">{error ?? 'Project not found'}</p>
      <button onClick={load} className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">Try Again</button>
    </div>
  );

  const myMember  = project.team_members.find(m => m.invitation_status === 'accepted');
  const myRole    = myMember?.role ?? 'Collaborator';
  const statusLabel = STATUS_LABEL[project.status] ?? project.status;
  const statusStyle = STATUS_STYLE[project.status] ?? 'bg-gray-100 text-gray-600';

  return (
    <>
      {/* Back */}
      <div className="mb-6">
        <Link href="/creator/projects" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm transition">
          <i className="fa-solid fa-arrow-left text-xs"></i> Back to Projects
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Header */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyle}`}>{statusLabel}</span>
                  {project.category && (
                    <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full capitalize">{project.category}</span>
                  )}
                  <span className="text-xs px-2.5 py-1 bg-blue-50 text-cobalt rounded-full font-medium">
                    <i className="fa-solid fa-user mr-1"></i>My role: {myRole}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{project.title}</h1>
                {project.updated_at && (
                  <p className="text-sm text-gray-400">Last updated {timeAgo(project.updated_at)}</p>
                )}
              </div>
              {(project.budget_min || project.budget_max) && (
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-bold text-cobalt">
                    ${project.budget_min?.toLocaleString()}{project.budget_max ? `–$${project.budget_max.toLocaleString()}` : '+'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">Budget</div>
                </div>
              )}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: 'fa-users',        label: 'Team',     value: `${project.team_members.length} member${project.team_members.length !== 1 ? 's' : ''}` },
                { icon: 'fa-calendar',     label: 'Start',    value: formatDate(project.start_date) },
                { icon: 'fa-flag-checkered', label: 'End',    value: formatDate(project.end_date) },
                { icon: 'fa-location-dot', label: 'Location', value: project.location || 'Remote' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3.5">
                  <i className={`fa-solid ${icon} text-cobalt mb-1.5 block text-xs`}></i>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="font-semibold text-gray-900 text-sm truncate">{value}</p>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">Progress</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-cobalt">{project.progress_percentage}%</span>
                  <button onClick={() => setShowProgress(true)}
                    className="text-xs text-gray-400 hover:text-cobalt transition px-2 py-0.5 rounded-lg hover:bg-blue-50">
                    <i className="fa-solid fa-pen text-xs mr-1"></i>Update
                  </button>
                </div>
              </div>
              <ProgressBar value={project.progress_percentage} />
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About This Project</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{project.description}</p>
            </div>
          )}

          {/* Team Members */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">Team Members</h2>
              <span className="text-sm text-gray-400">{project.filled_roles}/{project.total_roles} roles filled</span>
            </div>
            {project.team_members.length === 0 ? (
              <p className="text-gray-400 text-sm">No team members yet.</p>
            ) : (
              <div className="space-y-3">
                {project.team_members.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition">
                    <MemberAvatar m={m} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{m.username}</p>
                      <p className="text-xs text-gray-500 capitalize">{m.role}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {m.invitation_status && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          m.invitation_status === 'accepted'  ? 'bg-green-100 text-green-700' :
                          m.invitation_status === 'pending'   ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {m.invitation_status}
                        </span>
                      )}
                      {m.joined_at && (
                        <p className="text-xs text-gray-400 mt-0.5">Joined {formatDate(m.joined_at)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed */}
          {activities.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-5">Recent Activity</h2>
              <div className="space-y-4">
                {activities.map(a => (
                  <div key={a.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className={`fa-solid ${ACTIVITY_ICON[a.activity_type] ?? 'fa-circle-dot'} text-cobalt text-xs`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">{a.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {a.actor_name && <><span className="font-medium text-gray-500">{a.actor_name}</span> · </>}
                        {timeAgo(a.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-5">

          {/* Tags */}
          {project.tags.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {project.tags.map(t => (
                  <span key={t} className="text-xs px-2.5 py-1 bg-blue-50 text-cobalt rounded-full font-medium">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Project dates */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Timeline</h3>
            {[
              { label: 'Created',   value: formatDate(project.created_at) },
              { label: 'Start date', value: formatDate(project.start_date) },
              { label: 'End date',  value: formatDate(project.end_date) },
              { label: 'Last updated', value: formatDate(project.updated_at) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>

          {/* Client info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Client</h3>
            {clientProfile ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  {clientProfile.profile?.profile_picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={clientProfile.profile.profile_picture} alt={clientProfile.username}
                      className="w-12 h-12 rounded-xl border border-gray-200 object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-cobalt font-bold text-lg">
                      {clientProfile.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-900">
                      {clientProfile.profile?.display_name ?? clientProfile.username}
                    </p>
                    {clientProfile.is_verified && (
                      <p className="text-xs text-cobalt font-medium">
                        <i className="fa-solid fa-circle-check mr-1"></i>Verified Client
                      </p>
                    )}
                  </div>
                </div>
                {clientProfile.profile?.headline && (
                  <p className="text-sm text-gray-500 mb-3">{clientProfile.profile.headline}</p>
                )}
                {clientProfile.profile?.location && (
                  <p className="text-sm text-gray-500">
                    <i className="fa-solid fa-location-dot mr-1.5 text-gray-400"></i>
                    {[clientProfile.profile.location.city, clientProfile.profile.location.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                  <div className="h-2 w-16 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* Budget */}
          {(project.budget_min || project.budget_max) && (
            <div className="bg-gradient-to-br from-cobalt to-blue-600 rounded-2xl p-6 text-white shadow-lg">
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-2">Project Budget</p>
              <p className="text-3xl font-bold mb-1">
                ${project.budget_min?.toLocaleString()}{project.budget_max ? `–$${project.budget_max.toLocaleString()}` : '+'}
              </p>
              <p className="text-blue-200 text-sm">{myRole}</p>
            </div>
          )}
        </div>
      </div>

      {showProgress && (
        <ProgressModal
          current={project.progress_percentage}
          onClose={() => setShowProgress(false)}
          onSave={handleProgressSave}
        />
      )}
    </>
  );
}
