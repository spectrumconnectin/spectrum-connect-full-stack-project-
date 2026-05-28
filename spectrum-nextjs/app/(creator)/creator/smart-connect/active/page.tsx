'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { smartConnect, CreatorSmartMatch } from '@/lib/api';

function formatBudget(m: CreatorSmartMatch): string {
  if (m.budget_min && m.budget_max) return `$${m.budget_min.toLocaleString()} – $${m.budget_max.toLocaleString()}`;
  if (m.budget_min) return `From $${m.budget_min.toLocaleString()}`;
  return 'Budget TBD';
}

export default function SmartConnectActivePage() {
  const [matches, setMatches] = useState<CreatorSmartMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    smartConnect.getCreatorMatches(9)
      .then(res => setMatches(res.matches))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (id: string) => {
    setSaved(prev => ({ ...prev, [id]: !prev[id] }));
    try {
      await smartConnect.save(id);
    } catch {
      setSaved(prev => ({ ...prev, [id]: !prev[id] }));
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="mb-12">
        <div className="bg-gradient-to-br from-green-500 via-emerald-600 to-teal-500 rounded-3xl p-12 lg:p-16 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-300 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-300 rounded-full opacity-20 blur-3xl"></div>
          <div className="relative z-10 max-w-4xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <i className="fa-solid fa-circle-check text-3xl"></i>
              </div>
              <span className="text-sm font-bold uppercase tracking-widest">Smart Connect Activated</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">You&apos;re All Set!</h1>
            <p className="text-2xl text-green-50 max-w-3xl leading-relaxed mb-8">Smart Connect is analyzing your profile and finding perfect matches. Here are your top opportunities right now.</p>
            <div className="flex items-center space-x-6 flex-wrap gap-3">
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-5 py-3 rounded-xl">
                <i className="fa-solid fa-robot text-green-200"></i>
                <span className="text-sm font-semibold">AI Matching Active</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-5 py-3 rounded-xl">
                <i className="fa-solid fa-bell text-green-200"></i>
                <span className="text-sm font-semibold">Notifications Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-8 mb-12">
        {/* Matches */}
        <section className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-gray-200 p-10 shadow-lg">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Personalized Matches</h2>
                <p className="text-gray-600">Projects curated specifically for your skills and interests</p>
              </div>
              <div className="flex items-center space-x-2 bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-2 rounded-xl">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-green-700">Live Matching</span>
              </div>
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
              <div className="space-y-6">
                {matches.map(m => (
                  <div key={m.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-cobalt to-blue-600 rounded-xl flex items-center justify-center">
                          <i className="fa-solid fa-briefcase text-white text-xl"></i>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{m.title}</h3>
                          <p className="text-sm text-gray-600">{m.client_name || 'Client'}{m.project_type ? ` · ${m.project_type}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">{m.match_percent}% Match</span>
                        <button onClick={() => handleSave(m.id)} className="text-lg transition">
                          <i className={`${saved[m.id] ? 'fa-solid text-red-500' : 'fa-regular text-gray-400 hover:text-red-500'} fa-heart`}></i>
                        </button>
                      </div>
                    </div>
                    {m.description && <p className="text-gray-700 mb-4 leading-relaxed text-sm">{m.description}</p>}
                    {m.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {m.skills.slice(0, 4).map(s => (
                          <span key={s} className="text-xs px-2 py-1 bg-white text-gray-600 rounded-full border border-gray-200">{s}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-semibold text-gray-700">{formatBudget(m)}</span>
                        {m.budget_type && <span className="text-sm text-gray-500 capitalize">{m.budget_type}</span>}
                      </div>
                      <Link href={`/creator/smart-connect/${m.id}`}
                        className="bg-cobalt text-white px-5 py-2 rounded-xl font-semibold hover:bg-blue-700 transition text-sm">
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && matches.length > 0 && (
              <div className="mt-8 text-center">
                <Link href="/creator/smart-connect"
                  className="inline-block bg-gradient-to-r from-cobalt to-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg">
                  <i className="fa-solid fa-rotate mr-2"></i>View All Matches
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Sidebar */}
        <section className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-lg">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-cobalt rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-chart-line text-white"></i>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Match Statistics</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Total Matches', value: matches.length.toString() },
                { label: 'Avg. Match Score', value: matches.length ? `${Math.round(matches.reduce((a, m) => a + m.match_percent, 0) / matches.length)}%` : '—' },
                { label: 'Response Rate', value: '85%' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 text-sm">
                  <span className="text-gray-600">{label}</span>
                  <span className="text-lg font-bold text-green-600">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl border border-green-200 p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-bolt text-green-600 text-2xl"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Improve Your Matches</h3>
              <p className="text-sm text-gray-600 mb-4">A complete profile improves your match score by up to 40%.</p>
              <Link href="/creator/profile"
                className="block bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700 transition text-sm">
                Complete Profile
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Insights */}
      <section className="mb-12">
        <div className="bg-white rounded-3xl border border-gray-200 p-10 shadow-lg">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Smart Connect Insights</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { bg: 'bg-blue-100', icon: 'fa-brain text-cobalt', title: 'AI-Powered Matching', desc: 'Our algorithm analyzes your skills, experience, and preferences to find the perfect project matches.' },
              { bg: 'bg-purple-100', icon: 'fa-clock text-purple-600', title: 'Real-Time Updates', desc: 'Receive instant notifications when new projects that match your criteria become available.' },
              { bg: 'bg-green-100', icon: 'fa-crosshairs text-green-600', title: 'Quality Over Quantity', desc: 'Focus on high-quality matches rather than overwhelming you with irrelevant opportunities.' },
            ].map(({ bg, icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className={`w-16 h-16 ${bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <i className={`fa-solid ${icon} text-2xl`}></i>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-3xl border border-gray-200 p-10 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <i className="fa-solid fa-rocket text-cobalt text-3xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to Start Collaborating?</h2>
          <p className="text-gray-600 mb-6">Browse additional projects or complete your profile to attract better matches.</p>
          <div className="flex items-center justify-center space-x-4 flex-wrap gap-3">
            <Link href="/creator/find-projects" className="px-6 py-3 bg-white text-cobalt border border-cobalt rounded-xl font-semibold hover:bg-blue-50 transition">
              <i className="fa-solid fa-magnifying-glass mr-2"></i>Browse All Projects
            </Link>
            <Link href="/creator/profile" className="px-6 py-3 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition">
              <i className="fa-solid fa-user-pen mr-2"></i>Complete Profile
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
