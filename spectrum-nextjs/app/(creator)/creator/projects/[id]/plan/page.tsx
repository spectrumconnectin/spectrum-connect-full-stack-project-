'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { jobs, creatorProjects, messaging, proposals, JobPostItem, ProjectItem, DeadlineItem, ProposalItem } from '@/lib/api';

interface MilestoneRow {
  id: string;          // temp client id before save, or real deadline id after
  title: string;
  description: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  saved: boolean;      // true once persisted to backend
  deadlineId?: string; // real id after save
}

const PRIORITY_COLOR: Record<string, string> = {
  high:   'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low:    'bg-gray-50 text-gray-600 border-gray-200',
};
const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-gray-400',
};

function today(plusDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + plusDays);
  return d.toISOString().split('T')[0];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PlanProjectPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const router = useRouter();

  // ── page state ────────────────────────────────────────────────────────────
  const [stage, setStage] = useState<'loading' | 'ready' | 'sent' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  // ── source data ───────────────────────────────────────────────────────────
  const [job, setJob] = useState<JobPostItem | null>(null);
  const [proposal, setProposal] = useState<ProposalItem | null>(null);
  const [project, setProject] = useState<ProjectItem | null>(null); // workspace project

  // ── milestones ────────────────────────────────────────────────────────────
  const [milestones, setMilestones] = useState<MilestoneRow[]>([
    { id: 'row-1', title: '', description: '', due_date: today(7),  priority: 'medium', saved: false },
  ]);
  const [saving, setSaving] = useState<string | null>(null); // row id being saved
  const [sending, setSending] = useState(false);

  // ── init ──────────────────────────────────────────────────────────────────
  const init = useCallback(async () => {
    if (!jobId) return;
    setStage('loading');
    try {
      // 1. Load job details
      const jobData = await jobs.getById(jobId);
      setJob(jobData);

      // 2. Find the accepted proposal (to get client_id)
      const myProposals = await proposals.getMe();
      const accepted = myProposals.find(p => p.job_id === jobId && p.status === 'accepted');
      setProposal(accepted ?? null);

      // 3. Find or create a workspace Project linked to this job
      const existing = await creatorProjects.list();
      const linked = (existing.projects || []).find(
        (p: ProjectItem) => p.job_post_id === jobId
      );
      if (linked) {
        setProject(linked);
        // Load any already-saved milestones
        const dl = await creatorProjects.getDeadlines(linked.id);
        if (dl.deadlines.length > 0) {
          setMilestones(dl.deadlines.map((d: DeadlineItem) => ({
            id: d.id,
            title: d.title,
            description: d.description ?? '',
            due_date: d.due_date.split('T')[0],
            priority: d.priority as MilestoneRow['priority'],
            saved: true,
            deadlineId: d.id,
          })));
        }
      } else {
        // Auto-create the workspace project
        const created = await creatorProjects.create({
          title: jobData.title,
          description: jobData.description || jobData.title,
          category: jobData.department || 'film',
          tags: jobData.tags || [],
          start_date: new Date().toISOString(),
          job_post_id: jobId,
        } as Parameters<typeof creatorProjects.create>[0] & { job_post_id: string });
        setProject(created);
      }

      setStage('ready');
    } catch (e) {
      setErrorMsg((e as Error).message);
      setStage('error');
    }
  }, [jobId]);

  useEffect(() => { init(); }, [init]);

  // ── milestone helpers ─────────────────────────────────────────────────────
  const addRow = () => setMilestones(prev => [
    ...prev,
    { id: `row-${Date.now()}`, title: '', description: '', due_date: today(14), priority: 'medium', saved: false },
  ]);

  const updateRow = (id: string, patch: Partial<MilestoneRow>) =>
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, ...patch, saved: false } : m));

  const removeRow = async (row: MilestoneRow) => {
    if (row.deadlineId && project) {
      await creatorProjects.deleteDeadline(row.deadlineId).catch(() => {});
    }
    setMilestones(prev => prev.filter(m => m.id !== row.id));
  };

  const saveRow = async (row: MilestoneRow) => {
    if (!project || !row.title.trim()) return;
    setSaving(row.id);
    try {
      if (row.deadlineId) {
        // Already saved — re-create (no PATCH for description yet)
        await creatorProjects.deleteDeadline(row.deadlineId).catch(() => {});
      }
      const saved = await creatorProjects.createDeadline({
        project_id: project.id,
        title: row.title.trim(),
        description: row.description.trim() || undefined,
        due_date: new Date(row.due_date).toISOString(),
        priority: row.priority,
      });
      setMilestones(prev => prev.map(m =>
        m.id === row.id ? { ...m, saved: true, deadlineId: saved.id, id: saved.id } : m
      ));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const saveAll = async () => {
    const unsaved = milestones.filter(m => !m.saved && m.title.trim());
    for (const row of unsaved) await saveRow(row);
  };

  // ── send timeline to client ───────────────────────────────────────────────
  const sendTimeline = async () => {
    if (!proposal?.client_id || !job) return;
    setSending(true);
    try {
      await saveAll();

      const savedMilestones = milestones.filter(m => m.saved && m.title.trim());
      const lines = savedMilestones.map((m, i) =>
        `${i + 1}. **${m.title}** — Due ${fmtDate(m.due_date)}` +
        (m.description ? `\n   ${m.description}` : '')
      ).join('\n');

      const msg = [
        `📋 **Project Timeline for: ${job.title}**`,
        '',
        'Hi! Here\'s my proposed work plan for this project:',
        '',
        lines,
        '',
        'Let me know if you\'d like to adjust any dates or milestones. I\'m ready to start as soon as you confirm!',
      ].join('\n');

      await messaging.createConversation(
        [proposal.client_id],
        jobId,
        msg,
      );
      setStage('sent');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  // ── renders ───────────────────────────────────────────────────────────────
  if (stage === 'loading') return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Setting up your project plan…</p>
    </div>
  );

  if (stage === 'error') return (
    <div className="text-center py-24">
      <i className="fa-solid fa-circle-exclamation text-5xl text-red-300 mb-4 block"></i>
      <p className="text-gray-600 font-semibold mb-2">Couldn&apos;t load project</p>
      <p className="text-red-500 text-sm mb-6">{errorMsg}</p>
      <Link href="/creator/projects?tab=applications" className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
        Back to My Work
      </Link>
    </div>
  );

  if (stage === 'sent') return (
    <div className="max-w-lg mx-auto text-center py-24">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <i className="fa-solid fa-check text-emerald-600 text-3xl"></i>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">Timeline Sent!</h2>
      <p className="text-gray-600 mb-8">
        Your project plan has been sent to the client. They&apos;ll receive it in their messages.
        You can continue working on the plan anytime.
      </p>
      <div className="flex gap-3 justify-center">
        <Link href="/creator/messaging"
          className="px-6 py-3 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition text-sm">
          <i className="fa-solid fa-comment mr-2"></i>Open Messages
        </Link>
        <Link href="/creator/projects?tab=applications"
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition text-sm">
          Back to My Work
        </Link>
      </div>
    </div>
  );

  const allSaved = milestones.every(m => m.saved || !m.title.trim());
  const hasAny = milestones.some(m => m.title.trim());

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <Link href="/creator/projects?tab=applications"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition mb-4">
          <i className="fa-solid fa-arrow-left text-xs"></i> Back to My Work
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Plan Your Project</h1>
            {job && (
              <p className="text-gray-500 text-sm">
                <i className="fa-solid fa-briefcase mr-2 text-cobalt"></i>{job.title}
                {job.department && ` · ${job.department}`}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {!allSaved && (
              <button onClick={saveAll}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition">
                <i className="fa-solid fa-floppy-disk mr-2"></i>Save Draft
              </button>
            )}
            <button
              disabled={!hasAny || sending || !proposal?.client_id}
              onClick={sendTimeline}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition flex items-center gap-2">
              {sending
                ? <><i className="fa-solid fa-spinner animate-spin"></i> Sending…</>
                : <><i className="fa-solid fa-paper-plane"></i> Send to Client</>}
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">

        {/* ── Timeline builder ── */}
        <div className="lg:col-span-2 space-y-4">

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Milestones & Deliverables</h2>
                <p className="text-gray-500 text-sm mt-0.5">Break the project into clear phases with due dates</p>
              </div>
              <button onClick={addRow}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
                <i className="fa-solid fa-plus"></i> Add Milestone
              </button>
            </div>

            {milestones.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                <i className="fa-solid fa-flag text-3xl mb-3 block"></i>
                <p className="text-sm">No milestones yet — click &ldquo;Add Milestone&rdquo; to start</p>
              </div>
            ) : (
              <div className="space-y-4">
                {milestones.map((row, idx) => (
                  <div key={row.id}
                    className={`rounded-xl border p-5 transition ${row.saved ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-white'}`}>

                    {/* Row header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-7 h-7 rounded-full bg-cobalt text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <input
                        type="text"
                        value={row.title}
                        onChange={e => updateRow(row.id, { title: e.target.value })}
                        placeholder="Milestone title (e.g. 'First Draft', 'Final Delivery')"
                        className="flex-1 text-sm font-semibold text-gray-900 border-b border-gray-200 focus:border-cobalt focus:outline-none bg-transparent pb-1 placeholder-gray-400"
                      />
                      {row.saved && (
                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 flex-shrink-0">
                          <i className="fa-solid fa-check"></i> Saved
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <textarea
                      value={row.description}
                      onChange={e => updateRow(row.id, { description: e.target.value })}
                      placeholder="Describe what will be delivered at this milestone…"
                      rows={2}
                      className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-cobalt resize-none mb-3 placeholder-gray-400"
                    />

                    {/* Due date + Priority + actions */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <i className="fa-regular fa-calendar text-gray-400 text-sm"></i>
                        <input
                          type="date"
                          value={row.due_date}
                          min={today()}
                          onChange={e => updateRow(row.id, { due_date: e.target.value })}
                          className="text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-cobalt"
                        />
                      </div>

                      <select
                        value={row.priority}
                        onChange={e => updateRow(row.id, { priority: e.target.value as MilestoneRow['priority'] })}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border focus:outline-none ${PRIORITY_COLOR[row.priority]}`}
                      >
                        <option value="low">Low priority</option>
                        <option value="medium">Medium priority</option>
                        <option value="high">High priority</option>
                      </select>

                      <div className="ml-auto flex gap-2">
                        {!row.saved && row.title.trim() && (
                          <button
                            onClick={() => saveRow(row)}
                            disabled={saving === row.id}
                            className="px-3 py-1.5 bg-cobalt text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                            {saving === row.id ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Save'}
                          </button>
                        )}
                        <button
                          onClick={() => removeRow(row)}
                          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition text-sm">
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add another */}
            {milestones.length > 0 && (
              <button onClick={addRow}
                className="mt-4 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-cobalt hover:text-cobalt transition font-medium">
                <i className="fa-solid fa-plus mr-2"></i>Add another milestone
              </button>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">

          {/* Timeline preview */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Timeline Preview</h3>
            {milestones.filter(m => m.title.trim()).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Add milestones to see the timeline</p>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-2.5 top-4 bottom-4 w-0.5 bg-gray-200"></div>
                <div className="space-y-5">
                  {milestones.filter(m => m.title.trim()).map((m, i) => (
                    <div key={m.id} className="flex items-start gap-4 pl-0">
                      <div className={`w-5 h-5 rounded-full border-2 border-white shadow flex-shrink-0 mt-0.5 z-10 ${PRIORITY_DOT[m.priority]}`}></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{m.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{fmtDate(m.due_date)}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">#{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Project info */}
          {job && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Project Info</h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Client',      value: job.department ? `${job.department} project` : '—' },
                  { label: 'Budget',      value: job.budget?.min ? `$${job.budget.min.toLocaleString()}` : 'Negotiable' },
                  { label: 'Experience',  value: job.experience_level },
                  { label: 'Crew size',   value: job.crew_size },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold text-gray-900 capitalize">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-800">
            <p className="font-semibold mb-2 flex items-center gap-2">
              <i className="fa-solid fa-lightbulb text-blue-500"></i> Timeline Tips
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-blue-700 text-xs leading-relaxed">
              <li>Break work into 2–5 clear phases</li>
              <li>Add 10–20% buffer time per milestone</li>
              <li>Describe exactly what will be delivered</li>
              <li>Mark final delivery as High priority</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
