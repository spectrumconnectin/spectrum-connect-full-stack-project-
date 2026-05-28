'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { proposals, ProposalItem } from '@/lib/api';

const STATUS_TABS = ['All', 'submitted', 'shortlisted', 'interviewing', 'accepted', 'rejected', 'withdrawn'];

const STATUS_STYLE: Record<string, string> = {
  submitted:    'bg-blue-50 text-blue-700',
  shortlisted:  'bg-purple-50 text-purple-700',
  interviewing: 'bg-amber-50 text-amber-700',
  accepted:     'bg-emerald-50 text-emerald-700',
  rejected:     'bg-rose-50 text-rose-700',
  withdrawn:    'bg-gray-100 text-gray-500',
};

const STATUS_LABEL: Record<string, string> = {
  submitted:    'Under Review',
  shortlisted:  'Shortlisted',
  interviewing: 'Interviewing',
  accepted:     'Hired',
  rejected:     'Declined',
  withdrawn:    'Withdrawn',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAge(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function ApplicationsPage() {
  const [activeTab, setActiveTab] = useState('All');
  const [appList, setAppList] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  useEffect(() => {
    proposals.getMe()
      .then(data => setAppList(data || []))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeTab === 'All'
    ? appList
    : appList.filter(a => a.status === activeTab);

  // Stats derived from live data
  const counts = {
    total:        appList.length,
    submitted:    appList.filter(a => a.status === 'submitted').length,
    shortlisted:  appList.filter(a => a.status === 'shortlisted').length,
    accepted:     appList.filter(a => a.status === 'accepted').length,
  };

  const handleWithdraw = async (id: string) => {
    if (!confirm('Withdraw this proposal? This cannot be undone.')) return;
    setWithdrawing(id);
    try {
      await proposals.withdraw(id);
      setAppList(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setWithdrawing(null);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Applications</h1>
          <p className="text-lg text-gray-600">Track all your project applications in one place.</p>
        </div>
        <Link href="/creator/find-projects"
          className="inline-flex items-center px-5 py-3 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition">
          <i className="fa-solid fa-magnifying-glass mr-2"></i>Find More Work
        </Link>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {[
          { label: 'Total Applied',  value: counts.total,       icon: 'fa-paper-plane', bg: 'bg-blue-50',   iconColor: 'text-cobalt' },
          { label: 'Under Review',   value: counts.submitted,   icon: 'fa-clock',       bg: 'bg-amber-50',  iconColor: 'text-amber-600' },
          { label: 'Shortlisted',    value: counts.shortlisted, icon: 'fa-star',        bg: 'bg-purple-50', iconColor: 'text-purple-600' },
          { label: 'Hired',          value: counts.accepted,    icon: 'fa-circle-check',bg: 'bg-emerald-50',iconColor: 'text-emerald-600' },
        ].map(({ label, value, icon, bg, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">{label}</span>
              <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center`}>
                <i className={`fa-solid ${icon} ${iconColor}`}></i>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading applications…</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <i className="fa-solid fa-circle-exclamation text-4xl text-red-300 mb-4 block"></i>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center border-b border-gray-200 px-2 overflow-x-auto">
            {STATUS_TABS.map(tab => {
              const count = tab === 'All' ? appList.length : appList.filter(a => a.status === tab).length;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-5 py-4 text-sm font-semibold whitespace-nowrap transition ${activeTab === tab ? 'text-cobalt border-b-2 border-cobalt' : 'text-gray-500 hover:text-gray-900'}`}>
                  {tab === 'All' ? 'All' : (STATUS_LABEL[tab] ?? tab)}
                  {count > 0 && (
                    <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="p-20 text-center">
              <i className="fa-solid fa-inbox text-4xl text-gray-300 mb-4 block"></i>
              <h3 className="font-semibold text-gray-600 mb-2">No applications here</h3>
              <p className="text-gray-400 text-sm">
                {appList.length === 0 ? 'Start applying to jobs to see them here.' : 'No applications match this filter.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(app => (
                <div key={app.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between gap-6 flex-wrap">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <i className="fa-solid fa-clapperboard text-cobalt"></i>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-0.5">{app.job_title}</h3>
                        <p className="text-sm text-gray-500 mb-2">
                          {app.job_department}
                          {app.proposed_budget ? ` · Proposed $${app.proposed_budget.toLocaleString()}` : ''}
                          {app.role ? ` · ${app.role}` : ''}
                        </p>
                        {app.cover_letter && (
                          <p className="text-sm text-gray-400 line-clamp-1 italic">"{app.cover_letter}"</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                          <span><i className="fa-regular fa-calendar mr-1"></i>Applied {formatDate(app.submitted_at)}</span>
                          <span>·</span>
                          <span>{formatAge(app.submitted_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_STYLE[app.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[app.status] ?? app.status}
                      </span>
                      {['submitted', 'shortlisted', 'interviewing'].includes(app.status) && (
                        <button
                          onClick={() => handleWithdraw(app.id)}
                          disabled={withdrawing === app.id}
                          className="px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition disabled:opacity-50">
                          {withdrawing === app.id ? 'Withdrawing…' : 'Withdraw'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
