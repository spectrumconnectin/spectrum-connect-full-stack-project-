'use client';

import { useState } from 'react';

const resources = [
  { cat: 'Getting Started', icon: 'fa-rocket', color: 'bg-blue-100 text-cobalt', items: [
    { title: 'How to Post Your First Project', desc: 'A step-by-step guide to crafting a project listing that attracts top talent.', type: 'Guide', time: '5 min read' },
    { title: 'Understanding Smart Connect', desc: 'Learn how our AI matching system works and how to get the best results.', type: 'Video', time: '8 min watch' },
    { title: 'Client Onboarding Checklist', desc: 'Everything you need to set up your account and start hiring.', type: 'Checklist', time: '3 min read' },
  ]},
  { cat: 'Hiring Best Practices', icon: 'fa-users', color: 'bg-purple-100 text-purple-600', items: [
    { title: 'Writing Great Project Briefs', desc: 'How to communicate your vision clearly to attract the right creators.', type: 'Guide', time: '7 min read' },
    { title: 'Reviewing Portfolios Effectively', desc: 'What to look for when evaluating a creator\'s past work and experience.', type: 'Guide', time: '4 min read' },
    { title: 'Setting Fair Rates & Budgets', desc: 'Market rate benchmarks across different creative disciplines.', type: 'Data', time: '6 min read' },
  ]},
  { cat: 'Project Management', icon: 'fa-diagram-project', color: 'bg-green-100 text-green-600', items: [
    { title: 'Running Effective Creative Projects', desc: 'Best practices for milestone planning, feedback, and delivery.', type: 'Guide', time: '10 min read' },
    { title: 'Giving Constructive Feedback', desc: 'How to communicate revisions and feedback that actually helps creators.', type: 'Guide', time: '5 min read' },
    { title: 'Using Escrow & Payments', desc: 'A complete guide to milestone payments, escrow, and dispute resolution.', type: 'Guide', time: '6 min read' },
  ]},
  { cat: 'Legal & Contracts', icon: 'fa-file-contract', color: 'bg-orange-100 text-orange-600', items: [
    { title: 'IP & Copyright Basics', desc: 'Understanding who owns what when you hire a creator on Spectrum.', type: 'Guide', time: '8 min read' },
    { title: 'NDA & Confidentiality Templates', desc: 'Free templates to protect your sensitive project information.', type: 'Template', time: 'Download' },
    { title: 'Platform Terms Summary', desc: 'A plain-English summary of the key platform rules and protections.', type: 'Article', time: '4 min read' },
  ]},
];

const typeColors: Record<string, string> = {
  Guide: 'bg-blue-50 text-cobalt',
  Video: 'bg-red-50 text-red-600',
  Checklist: 'bg-green-50 text-green-600',
  Data: 'bg-purple-50 text-purple-600',
  Template: 'bg-yellow-50 text-yellow-700',
  Article: 'bg-gray-100 text-gray-600',
};

export default function ResourcesPage() {
  const [search, setSearch] = useState('');

  const filteredResources = resources.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.desc.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  return (
    <>
      <section className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Resource Hub</h1>
        <p className="text-gray-600 mb-6">Guides, templates, and best practices to help you succeed on Spectrum</p>
        <div className="relative max-w-xl">
          <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input type="text" placeholder="Search resources…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-blue-100 transition" />
        </div>
      </section>

      <div className="space-y-10">
        {filteredResources.map(cat => (
          <section key={cat.cat}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-9 h-9 ${cat.color} rounded-lg flex items-center justify-center`}>
                <i className={`fa-solid ${cat.icon} text-sm`}></i>
              </div>
              <h2 className="text-xl font-bold text-gray-900">{cat.cat}</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {cat.items.map((item, i) => (
                <button key={i} className="text-left bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:border-cobalt hover:shadow-md transition group">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeColors[item.type] || 'bg-gray-100 text-gray-600'}`}>{item.type}</span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-gray-300 group-hover:text-cobalt transition text-sm"></i>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 group-hover:text-cobalt transition leading-snug">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">{item.desc}</p>
                  <p className="text-xs text-gray-400">{item.time}</p>
                </button>
              ))}
            </div>
          </section>
        ))}

        {filteredResources.length === 0 && (
          <div className="text-center py-20">
            <i className="fa-solid fa-book text-5xl text-gray-300 mb-4 block"></i>
            <h3 className="font-semibold text-gray-600 text-lg mb-2">No resources found</h3>
            <p className="text-gray-400">Try a different search term</p>
          </div>
        )}
      </div>
    </>
  );
}
