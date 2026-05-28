'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { creatorProjects, ProjectItem } from '../../../../../lib/api';

function fmtDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProjectsUnderReviewPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    creatorProjects.list({ status: 'review' })
      .then(res => setProjects(res.projects))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Under Review</h1>
        <p className="text-gray-600">Work you&apos;ve submitted that&apos;s awaiting client approval</p>
      </section>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <i className="fa-solid fa-circle-check text-5xl text-gray-300 mb-4 block"></i>
          <h3 className="font-semibold text-gray-600 text-lg mb-2">Nothing under review</h3>
          <p className="text-gray-400 text-sm">All your submitted work has been reviewed, or you have no active projects awaiting approval.</p>
          <Link href="/creator/projects" className="mt-4 inline-block text-cobalt font-semibold hover:underline">View All Projects →</Link>
        </div>
      ) : (
        <div className="space-y-5">
          {projects.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:border-cobalt transition">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-900 text-lg">{p.title}</h3>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full capitalize">{p.status}</span>
                  </div>
                  {p.updated_at && (
                    <p className="text-sm text-gray-500">Updated {fmtDate(p.updated_at)}</p>
                  )}
                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.tags.slice(0, 4).map(t => (
                        <span key={t} className="text-xs px-2 py-0.5 bg-blue-50 text-cobalt rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                {(p.budget_min || p.budget_max) && (
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-bold text-cobalt">
                      {p.budget_min && p.budget_max
                        ? `$${p.budget_min.toLocaleString()} – $${p.budget_max.toLocaleString()}`
                        : p.budget_min ? `$${p.budget_min.toLocaleString()}` : ''}
                    </div>
                    <div className="text-xs text-gray-500">Project value</div>
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <i className="fa-solid fa-clock text-yellow-600"></i>
                <div>
                  <p className="font-semibold text-yellow-800 text-sm">Awaiting Review</p>
                  <p className="text-xs text-yellow-700">
                    Progress: {p.progress_percentage}% · {p.filled_roles}/{p.total_roles} roles filled
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Link href={`/creator/projects/${p.id}`}
                  className="flex-1 bg-cobalt text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition text-sm text-center">
                  View Project
                </Link>
                <Link href="/creator/messaging"
                  className="flex-1 bg-gray-50 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-100 transition text-sm border border-gray-200 text-center">
                  <i className="fa-solid fa-comment mr-2"></i>Message Client
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-cobalt text-white rounded-xl flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-info text-sm"></i>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-1">How review works</h3>
            <p className="text-sm text-gray-600 leading-relaxed">Once you submit a milestone, the client has 7 days to review and approve. If no response is received, payment is automatically released. You&apos;ll be notified via email of any feedback or approval.</p>
          </div>
        </div>
      </div>
    </>
  );
}
