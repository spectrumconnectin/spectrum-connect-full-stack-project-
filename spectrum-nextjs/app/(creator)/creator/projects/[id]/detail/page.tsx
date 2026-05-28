'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { creatorProjects, ProjectItem, ActivityLogItem } from '../../../../../../lib/api';

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function CreatorProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [activity, setActivity] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.allSettled([
      creatorProjects.getById(id),
      creatorProjects.getActivity(id, 10),
    ]).then(([projResult, actResult]) => {
      if (projResult.status === 'fulfilled') setProject(projResult.value);
      else setError('Could not load project.');
      if (actResult.status === 'fulfilled') setActivity(actResult.value);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-20 text-gray-500">
        <i className="fa-solid fa-triangle-exclamation text-4xl text-gray-300 mb-4 block"></i>
        <p>{error || 'Project not found.'}</p>
        <Link href="/creator/projects" className="mt-4 inline-block text-cobalt font-semibold hover:underline">← Back to Projects</Link>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    active: 'bg-blue-100 text-cobalt',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
    paused: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <>
      <div className="mb-6">
        <Link href="/creator/projects" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
          <i className="fa-solid fa-arrow-left"></i>Back to Projects
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${statusColor[project.status] || 'bg-gray-100 text-gray-600'}`}>
                {project.status}
              </span>
            </div>
            {project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {project.tags.map(t => (
                  <span key={t} className="text-xs px-2.5 py-1 bg-blue-50 text-cobalt rounded-full font-medium">{t}</span>
                ))}
              </div>
            )}
          </div>
          {(project.budget_min || project.budget_max) && (
            <div className="text-right">
              <div className="text-2xl font-bold text-cobalt">
                {project.budget_min && project.budget_max
                  ? `$${project.budget_min.toLocaleString()} – $${project.budget_max.toLocaleString()}`
                  : project.budget_min ? `$${project.budget_min.toLocaleString()}` : ''}
              </div>
              <div className="text-sm text-gray-500">Total project value</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">

          {/* Description */}
          {project.description && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Project Brief</h2>
              <p className="text-gray-600 leading-relaxed text-sm">{project.description}</p>
            </div>
          )}

          {/* Team Members */}
          {project.team_members.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-5">Team ({project.filled_roles}/{project.total_roles} filled)</h2>
              <div className="space-y-3">
                {project.team_members.map(m => (
                  <div key={m.user_id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt={m.username} className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" />
                      : <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-cobalt font-bold text-sm border-2 border-gray-200">
                          {m.username[0]?.toUpperCase()}
                        </div>
                    }
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{m.username}</p>
                      <p className="text-xs text-gray-500 capitalize">{m.role}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                      m.invitation_status === 'accepted' ? 'bg-green-100 text-green-700' :
                      m.invitation_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {m.invitation_status || 'member'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity */}
          {activity.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-5">Recent Activity</h2>
              <div className="space-y-4">
                {activity.map(a => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="fa-solid fa-bolt text-cobalt text-xs"></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{a.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{relTime(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Progress */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Progress</h3>
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-cobalt">{project.progress_percentage}%</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-cobalt rounded-full transition-all" style={{ width: `${project.progress_percentage}%` }}></div>
            </div>
            <p className="text-xs text-gray-400 text-center">{project.filled_roles} of {project.total_roles} roles filled</p>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Timeline</h3>
            {[
              { label: 'Start Date', value: fmtDate(project.start_date) },
              { label: 'End Date', value: fmtDate(project.end_date) },
              { label: 'Created', value: fmtDate(project.created_at) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>

          <Link href="/creator/messaging"
            className="block bg-cobalt text-white p-4 rounded-2xl font-bold hover:bg-blue-700 transition text-center shadow-md">
            <i className="fa-solid fa-comment mr-2"></i>Message Client
          </Link>
        </div>
      </div>
    </>
  );
}
