'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { smartConnect, CreatorSmartMatch } from '@/lib/api';

function formatBudget(m: CreatorSmartMatch): string {
  if (m.budget_min && m.budget_max) return `$${m.budget_min.toLocaleString()} – $${m.budget_max.toLocaleString()}`;
  if (m.budget_min) return `From $${m.budget_min.toLocaleString()}`;
  return 'Budget TBD';
}

export default function SmartConnectActivatedPage() {
  const [matches, setMatches] = useState<CreatorSmartMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiActive, setAiActive] = useState(true);
  const [notifActive, setNotifActive] = useState(true);

  useEffect(() => {
    smartConnect.getCreatorMatches(9)
      .then(res => setMatches(res.matches))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="mb-10">
        <div className="bg-gradient-to-br from-cobalt via-blue-600 to-blue-500 rounded-3xl p-12 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full opacity-20 blur-3xl"></div>
          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fa-solid fa-circle-check text-white text-lg"></i>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Smart Connect Activated</span>
            </div>
            <h1 className="text-5xl font-bold mb-5">You&apos;re All Set!</h1>
            <p className="text-lg text-white/90 leading-relaxed mb-8 max-w-2xl">Smart Connect is now analyzing your profile and finding perfect project matches. Here are your best opportunities right now.</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setAiActive(a => !a)}
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border transition ${aiActive ? 'bg-white/15 border-white/20' : 'bg-white/5 border-white/10 opacity-60'} backdrop-blur hover:bg-white/25`}>
                <i className="fa-solid fa-robot mr-2"></i>{aiActive ? 'AI Matching Active' : 'AI Matching Paused'}
              </button>
              <button onClick={() => setNotifActive(n => !n)}
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border transition ${notifActive ? 'bg-white/15 border-white/20' : 'bg-white/5 border-white/10 opacity-60'} backdrop-blur hover:bg-white/25`}>
                <i className="fa-solid fa-bell mr-2"></i>{notifActive ? 'Notifications Enabled' : 'Notifications Off'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Matches */}
        <section className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Personalized Matches</h2>
              <p className="text-sm text-gray-500 mt-1">Projects curated specifically for your skills and interests</p>
            </div>
            <span className="inline-flex items-center bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>Live Matching
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <i className="fa-solid fa-bolt text-5xl text-gray-200 mb-4 block"></i>
              <p className="font-semibold text-gray-600 mb-1">No matches yet</p>
              <p className="text-sm">Complete your profile to improve matching accuracy.</p>
              <Link href="/creator/profile" className="mt-4 inline-block text-cobalt font-semibold hover:underline">Complete Profile →</Link>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {matches.map(m => (
                <div key={m.id} className="border border-gray-200 rounded-2xl p-6 hover:border-cobalt transition">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-100 text-cobalt">
                      <i className="fa-solid fa-briefcase text-xl"></i>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-gray-900">{m.title}</h3>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">{m.match_percent}% Match</span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{m.client_name || 'Client'}{m.project_type ? ` · ${m.project_type}` : ''}</p>
                      {m.description && <p className="text-sm text-gray-700 mb-3 line-clamp-2">{m.description}</p>}
                      {m.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {m.skills.slice(0, 3).map(s => (
                            <span key={s} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{s}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-4">
                        <span><i className="fa-solid fa-dollar-sign mr-1"></i>{formatBudget(m)}</span>
                        {m.budget_type && <span className="capitalize">{m.budget_type}</span>}
                      </div>
                      <div className="flex items-center space-x-3">
                        <Link href={`/creator/projects/${m.id}/apply`}
                          className="flex-1 px-4 py-2.5 bg-cobalt text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition text-center">
                          Apply Now
                        </Link>
                        <Link href={`/creator/smart-connect/${m.id}`}
                          className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 text-center">
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && matches.length > 0 && (
            <div className="text-center mt-6">
              <Link href="/creator/smart-connect"
                className="inline-flex items-center bg-cobalt text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
                <i className="fa-solid fa-arrows-rotate mr-2"></i>View All Matches
              </Link>
            </div>
          )}
        </section>

        {/* Right rail */}
        <aside className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-7">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-chart-line text-cobalt"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Match Statistics</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-gray-700">Total Matches</span>
                <span className="font-bold text-emerald-700">{matches.length}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-gray-700">Avg. Match Score</span>
                <span className="font-bold text-emerald-700">
                  {matches.length ? `${Math.round(matches.reduce((a, m) => a + m.match_percent, 0) / matches.length)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-700">Response Rate</span>
                <span className="font-bold text-emerald-700">85%</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl p-7 border border-emerald-100" style={{ background: 'linear-gradient(180deg,#ecfdf5,#d1fae5)' }}>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-3">
              <i className="fa-solid fa-bolt text-emerald-600"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Boost Your Matches</h3>
            <p className="text-sm text-gray-600 mb-4">A complete profile can improve your match score by up to 40%.</p>
            <Link href="/creator/profile"
              className="block bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition text-center text-sm">
              Complete Profile
            </Link>
          </div>
        </aside>
      </div>

      {/* Insights */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-10 mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Smart Connect Insights</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {[
            { bg: 'bg-blue-50', icon: 'fa-brain text-cobalt', title: 'AI-Powered Matching', desc: 'Our algorithm analyzes your skills, experience, and preferences to find the perfect project matches.' },
            { bg: 'bg-purple-50', icon: 'fa-clock text-purple-600', title: 'Real-Time Updates', desc: 'Receive instant notifications when new projects that match your criteria become available.' },
            { bg: 'bg-emerald-50', icon: 'fa-crosshairs text-emerald-600', title: 'Quality Over Quantity', desc: 'Focus on high-quality matches rather than overwhelming you with irrelevant opportunities.' },
          ].map(({ bg, icon, title, desc }) => (
            <div key={title}>
              <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                <i className={`fa-solid ${icon} text-xl`}></i>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">{title}</h4>
              <p className="text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-50 border border-gray-200 rounded-3xl p-12 text-center mb-10">
        <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <i className="fa-solid fa-rocket text-cobalt text-xl"></i>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to Start Collaborating?</h2>
        <p className="text-gray-600 max-w-2xl mx-auto mb-6">Smart Connect is actively finding matches for you. While you wait, browse additional projects or complete your profile.</p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link href="/creator/find-projects" className="inline-flex items-center bg-white border border-gray-200 px-5 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100">
            <i className="fa-regular fa-compass mr-2"></i>Browse All Projects
          </Link>
          <Link href="/creator/profile" className="inline-flex items-center bg-cobalt text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-blue-700">
            <i className="fa-regular fa-user mr-2"></i>Complete Profile
          </Link>
        </div>
      </section>
    </>
  );
}
