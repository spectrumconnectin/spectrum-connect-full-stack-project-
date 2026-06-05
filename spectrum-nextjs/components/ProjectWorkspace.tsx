'use client';

/**
 * ProjectWorkspace — unified 6-tab project workspace.
 *
 * Tabs: Chat · Timeline · Milestones · Deliverables · Files · Progress
 *
 * Used by both /client/projects/[id] and /creator/projects/[id]
 * so that everything needed to run a project lives in one place.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  escrow, messaging, jobs, creatorProjects, proposals,
  EscrowDetail, EscrowMilestone, ConversationItem, MessageItem,
  DeadlineItem, JobPostItem,
} from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectWorkspaceProps {
  /** Job post ID (not workspace project ID) */
  jobId: string;
  /** Which side is viewing — affects which actions show */
  role: 'client' | 'creator';
  /** Optional workspace project id (for deadlines API) */
  projectId?: string;
  /** Pass current user id so we can align chat bubbles */
  myUserId?: string;
  /** Current job status — drives the Summary tab and completion UI */
  jobStatus?: string;
  /** Accepted proposal id — used to fetch reviews in Summary tab */
  proposalId?: string;
  /** Job title for display in Summary tab */
  jobTitle?: string;
}

type TabId = 'chat' | 'timeline' | 'milestones' | 'deliverables' | 'files' | 'progress' | 'summary';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'chat',         label: 'Chat',        icon: 'fa-comment' },
  { id: 'timeline',     label: 'Timeline',    icon: 'fa-calendar-days' },
  { id: 'milestones',   label: 'Milestones',  icon: 'fa-list-check' },
  { id: 'deliverables', label: 'Deliverables',icon: 'fa-box-open' },
  { id: 'files',        label: 'Files',       icon: 'fa-folder-open' },
  { id: 'progress',     label: 'Progress',    icon: 'fa-chart-line' },
  { id: 'summary',      label: 'Summary',     icon: 'fa-trophy' },
];

const MILESTONE_STATUS_LABEL: Record<string, string> = {
  pending:            'Pending Funding',
  funded:             'Funded',
  delivered:          'Delivered',
  revision_requested: 'Revision Requested',
  approved:           'Approved',
  released:           'Released',
  disputed:           'Disputed',
  refunded:           'Refunded',
};

const MILESTONE_STATUS_COLOR: Record<string, string> = {
  pending:            'bg-yellow-100 text-yellow-700',
  funded:             'bg-blue-100 text-cobalt',
  delivered:          'bg-indigo-100 text-indigo-700',
  revision_requested: 'bg-orange-100 text-orange-700',
  approved:           'bg-teal-100 text-teal-700',
  released:           'bg-emerald-100 text-emerald-700',
  disputed:           'bg-red-100 text-red-600',
  refunded:           'bg-gray-100 text-gray-500',
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function msgTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({ convo, msgs, myUserId, onSend, sending }: {
  convo: ConversationItem | null;
  msgs: MessageItem[];
  myUserId: string;
  onSend: (text: string, file?: File) => void;
  sending: boolean;
}) {
  const [input, setInput] = useState('');
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);

  const handleSend = () => {
    const text = input.trim();
    if ((!text && !uploadingFile) || sending) return;
    setInput('');
    const file = uploadingFile;
    setUploadingFile(null);
    onSend(text || (file ? `📎 ${file.name}` : ''), file ?? undefined);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadingFile(file);
    e.target.value = '';
  };

  if (!convo) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <i className="fa-solid fa-comment text-4xl text-gray-300 mb-4 block"></i>
      <h3 className="font-semibold text-gray-600 mb-1">No conversation yet</h3>
      <p className="text-sm text-gray-400">Start chatting with the other party below.</p>
    </div>
  );

  return (
    <div className="flex flex-col h-[520px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 rounded-xl mb-3">
        {msgs.filter(m => !m.is_deleted).map(m => {
          const isMe = m.sender_id === myUserId;
          const isAgreement = m.content.startsWith('✅');
          const isPayment = m.content.startsWith('💰');
          const isRevision = m.content.startsWith('🔄');
          const isDelivery = m.content.startsWith('📦');
          const isSystem   = isAgreement || isPayment || isRevision || isDelivery;
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isMe && !isSystem ? 'flex-row-reverse' : ''}`}>
              <div className={`${isSystem ? 'w-full' : 'max-w-[70%]'}`}>
                {isAgreement ? (
                  <div className={`rounded-2xl border-2 p-3 ${isMe ? 'border-emerald-300 bg-emerald-50' : 'border-emerald-200 bg-white'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <i className="fa-solid fa-handshake text-emerald-600 text-xs"></i>
                      <span className="font-bold text-emerald-800 text-xs">Agreement</span>
                    </div>
                    <p className="text-xs text-gray-600 whitespace-pre-line">{m.content.split('\n').slice(2).join('\n')}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{msgTime(m.sent_at)}</p>
                  </div>
                ) : isPayment ? (
                  <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-3 w-full">
                    <div className="flex items-center gap-1.5 mb-1">
                      <i className="fa-solid fa-coins text-emerald-600 text-xs"></i>
                      <span className="font-bold text-emerald-800 text-xs">Payment Released</span>
                    </div>
                    <p className="text-xs text-gray-700 whitespace-pre-line">{m.content.split('\n').slice(1).join('\n')}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{msgTime(m.sent_at)}</p>
                  </div>
                ) : isRevision ? (
                  <div className="rounded-2xl border-2 border-orange-300 bg-orange-50 p-3 w-full">
                    <div className="flex items-center gap-1.5 mb-1">
                      <i className="fa-solid fa-rotate-left text-orange-600 text-xs"></i>
                      <span className="font-bold text-orange-800 text-xs">Revision Requested</span>
                    </div>
                    <p className="text-xs text-gray-700 whitespace-pre-line">{m.content.split('\n').slice(2).join('\n')}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{msgTime(m.sent_at)}</p>
                  </div>
                ) : isDelivery ? (
                  <div className="rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-3 w-full">
                    <div className="flex items-center gap-1.5 mb-1">
                      <i className="fa-solid fa-box-open text-indigo-600 text-xs"></i>
                      <span className="font-bold text-indigo-800 text-xs">Delivery Submitted</span>
                    </div>
                    <p className="text-xs text-gray-700 whitespace-pre-line">{m.content.split('\n').slice(1).join('\n')}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{msgTime(m.sent_at)}</p>
                  </div>
                ) : (
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-cobalt text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200 shadow-sm'}`}>
                    <span className="whitespace-pre-line">{m.content}</span>
                    {m.attachments.map(a => (
                      <div key={a.id} className={`mt-1.5 flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${isMe ? 'bg-white/20' : 'bg-gray-100'}`}>
                        <i className="fa-solid fa-paperclip"></i>
                        <a href={a.file_url} target="_blank" rel="noreferrer" className="hover:underline truncate">{a.filename}</a>
                      </div>
                    ))}
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>{msgTime(m.sent_at)}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* File preview */}
      {uploadingFile && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl mb-2 text-sm">
          <i className="fa-solid fa-paperclip text-cobalt text-xs"></i>
          <span className="text-cobalt font-medium flex-1 truncate">{uploadingFile.name}</span>
          <button onClick={() => setUploadingFile(null)} className="text-gray-400 hover:text-red-500 transition">
            <i className="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200 p-3">
        {/* File attach */}
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange}
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt" />
        <button onClick={() => fileRef.current?.click()}
          className="p-2 text-gray-400 hover:text-cobalt rounded-lg hover:bg-blue-50 transition flex-shrink-0"
          title="Attach file">
          <i className="fa-solid fa-paperclip text-sm"></i>
        </button>

        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          className="flex-1 bg-transparent text-sm outline-none resize-none placeholder-gray-400 leading-relaxed text-gray-900" />
        <button onClick={handleSend} disabled={(!input.trim() && !uploadingFile) || sending}
          className={`p-2.5 rounded-xl transition ${(input.trim() || uploadingFile) && !sending ? 'bg-cobalt text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
          <i className="fa-solid fa-paper-plane text-sm"></i>
        </button>
      </div>
    </div>
  );
}

// ─── Milestones Tab ──────────────────────────────────────────────────────────

function MilestonesTab({ escrowDetail, role, onRefresh, onRequestRevision }: {
  escrowDetail: EscrowDetail | null;
  role: 'client' | 'creator';
  onRefresh: () => void;
  onRequestRevision?: (m: EscrowMilestone) => void;
}) {
  const [acting, setActing] = useState<string | null>(null);

  const doAction = async (action: 'deliver' | 'approve' | 'release', milestoneId: string) => {
    if (!escrowDetail) return;
    setActing(milestoneId);
    try {
      if (action === 'approve') {
        await escrow.approveMilestone(escrowDetail.escrow_id, milestoneId);
      } else if (action === 'release') {
        await escrow.releaseMilestone(escrowDetail.escrow_id, milestoneId);
      }
      onRefresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setActing(null);
    }
  };

  if (!escrowDetail) return (
    <div className="text-center py-12 text-gray-400">
      <i className="fa-solid fa-list-check text-4xl mb-3 block text-gray-300"></i>
      <p className="text-sm">No milestones yet. Escrow will appear here once funded.</p>
    </div>
  );

  // Count completed milestones
  const completed = escrowDetail.milestones.filter(m => ['released', 'approved'].includes(m.status)).length;
  const total = escrowDetail.milestones.length;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold text-gray-900 text-lg">{completed} of {total} Milestones Complete</p>
            <p className="text-sm text-gray-600 mt-0.5">Track project progress through funded milestones</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-cobalt">{completionPct}%</p>
            <p className="text-xs text-gray-500">Progress</p>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className="bg-cobalt h-2.5 rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
        </div>
      </div>

      {/* Escrow summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: `$${escrowDetail.total_amount.toLocaleString()}`, color: 'text-gray-900' },
          { label: 'In Escrow', value: `$${(escrowDetail.funded_amount - escrowDetail.released_amount).toLocaleString()}`, color: 'text-cobalt' },
          { label: 'Released', value: `$${escrowDetail.released_amount.toLocaleString()}`, color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Milestones as visual timeline */}
      <div className="space-y-0">
        {escrowDetail.milestones.map((m: EscrowMilestone, i: number) => {
          const isComplete = ['released', 'approved'].includes(m.status);
          const isActive = ['funded', 'delivered'].includes(m.status);
          const isPending = m.status === 'pending';

          return (
            <div key={m.milestone_id} className="relative">
              {/* Connecting line */}
              {i < escrowDetail.milestones.length - 1 && (
                <div className={`absolute left-6 top-20 w-1 h-6 ${isComplete ? 'bg-emerald-400' : 'bg-gray-200'}`}></div>
              )}

              {/* Milestone card */}
              <div className={`relative pl-16 pb-4 ${isComplete ? 'opacity-75' : ''}`}>
                {/* Status dot */}
                <div className={`absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 flex items-center justify-center flex-shrink-0 ${
                  isComplete ? 'bg-emerald-500 border-emerald-200' :
                  isActive ? 'bg-cobalt border-blue-200' :
                  'bg-gray-300 border-gray-200'
                }`}>
                  {isComplete && <i className="fa-solid fa-check text-white text-xs"></i>}
                </div>

                {/* Card */}
                <div className={`rounded-xl border p-4 ${
                  isComplete ? 'bg-emerald-50 border-emerald-200' :
                  isActive ? 'bg-white border-cobalt/30' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${MILESTONE_STATUS_COLOR[m.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {MILESTONE_STATUS_LABEL[m.status] ?? m.status}
                        </span>
                        {isComplete && <i className="fa-solid fa-circle-check text-emerald-600 text-sm"></i>}
                      </div>
                      <p className={`font-semibold ${isComplete ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                        {m.title}
                      </p>
                      <p className="text-lg font-bold text-gray-700">${m.amount.toLocaleString()}</p>
                      <div className="flex gap-4 text-xs text-gray-500 mt-2">
                        {m.funded_at && <span><i className="fa-solid fa-lock mr-1 text-cobalt"></i>Funded {fmtDate(m.funded_at)}</span>}
                        {m.released_at && <span><i className="fa-solid fa-check mr-1 text-emerald-600"></i>Released {fmtDate(m.released_at)}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {role === 'creator' && m.status === 'funded' && (
                        <button onClick={() => doAction('deliver', m.milestone_id)} disabled={acting === m.milestone_id}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition disabled:opacity-60">
                          {acting === m.milestone_id ? 'Submitting…' : 'Submit Delivery'}
                        </button>
                      )}
                      {role === 'client' && m.status === 'delivered' && (
                        <>
                          <button onClick={() => doAction('approve', m.milestone_id)} disabled={acting === m.milestone_id}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition disabled:opacity-60">
                            {acting === m.milestone_id ? 'Approving…' : '✓ Approve Work'}
                          </button>
                          <button onClick={() => onRequestRevision?.(m)}
                            className="px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition">
                            ↩ Request Revision
                          </button>
                        </>
                      )}
                      {role === 'client' && m.status === 'approved' && (
                        <button onClick={() => doAction('release', m.milestone_id)} disabled={acting === m.milestone_id}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-cobalt rounded-lg hover:bg-blue-700 transition disabled:opacity-60">
                          {acting === m.milestone_id ? 'Releasing…' : '💸 Release Payment'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────

function TimelineTab({ deadlines, projectId, role, onRefresh }: {
  deadlines: DeadlineItem[];
  projectId?: string;
  role: 'client' | 'creator';
  onRefresh: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const addDeadline = async () => {
    if (!title.trim() || !dueDate || !projectId) return;
    setSaving(true);
    try {
      await creatorProjects.createDeadline({
        project_id: projectId,
        title: title.trim(),
        due_date: dueDate,
        priority: 'medium',
      });
      setTitle(''); setDueDate(''); setAdding(false);
      onRefresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {deadlines.length === 0 && !adding ? (
        <div className="text-center py-10 text-gray-400">
          <i className="fa-solid fa-calendar-days text-4xl mb-3 block text-gray-300"></i>
          <p className="text-sm mb-3">No milestones on the timeline yet.</p>
          {role === 'creator' && projectId && (
            <button onClick={() => setAdding(true)}
              className="px-4 py-2 text-sm font-semibold bg-cobalt text-white rounded-xl hover:bg-blue-700 transition">
              Add First Milestone
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {deadlines.map((d, i) => (
            <div key={d.id} className="flex gap-4 items-start">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-3 h-3 rounded-full mt-1 ${d.status === 'completed' ? 'bg-emerald-500' : 'bg-cobalt'}`}></div>
                {i < deadlines.length - 1 && <div className="w-0.5 bg-gray-200 flex-1 mt-1 h-8"></div>}
              </div>
              <div className="flex-1 bg-white border border-gray-200 rounded-xl p-3 mb-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{d.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Due {fmtDate(d.due_date)}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-cobalt'}`}>
                    {d.status === 'completed' ? 'Done' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {role === 'creator' && projectId && (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-2 text-sm text-cobalt font-semibold hover:underline mt-2">
              <i className="fa-solid fa-plus text-xs"></i> Add milestone
            </button>
          )}
        </div>
      )}

      {adding && (
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
          <h4 className="font-semibold text-gray-900 text-sm">New Timeline Milestone</h4>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Milestone title"
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-cobalt" />
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-cobalt" />
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setTitle(''); setDueDate(''); }}
              className="flex-1 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
            <button onClick={addDeadline} disabled={!title.trim() || !dueDate || saving}
              className="flex-1 py-2 text-sm font-semibold text-white bg-cobalt rounded-lg hover:bg-blue-700 transition disabled:opacity-60">
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Deliverables Tab ─────────────────────────────────────────────────────────

function DeliverablesTab({ msgs, myUserId, role, escrowDetail, onRefresh, onSend }: {
  msgs: MessageItem[];
  myUserId: string;
  role: 'client' | 'creator';
  escrowDetail: EscrowDetail | null;
  onRefresh: () => void;
  onSend?: (text: string, file?: File) => void;
}) {
  // State for Final Delivery modal
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<EscrowMilestone | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryDriveLink, setDeliveryDriveLink] = useState('');
  const [driveLinkError, setDriveLinkError] = useState<string | null>(null);
  const [deliveryFiles, setDeliveryFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const filePickerRef = useRef<HTMLInputElement>(null);

  const fundedMilestones = escrowDetail?.milestones.filter(
    m => m.status === 'funded' || m.status === 'revision_requested'
  ) ?? [];

  const deliveredMilestones = escrowDetail?.milestones.filter(
    m => ['delivered', 'revision_requested', 'approved', 'released'].includes(m.status)
  ) ?? [];

  const [acting, setActing] = useState<string | null>(null);
  // Revision request modal state
  const [revisionTarget, setRevisionTarget] = useState<EscrowMilestone | null>(null);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [requestingRevision, setRequestingRevision] = useState(false);

  const submitRevisionRequest = async () => {
    if (!revisionTarget || !escrowDetail) return;
    setRequestingRevision(true);
    try {
      await escrow.requestRevision(escrowDetail.escrow_id, revisionTarget.milestone_id, revisionFeedback.trim() || undefined);
      setRevisionTarget(null);
      setRevisionFeedback('');
      onRefresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setRequestingRevision(false);
    }
  };

  const doAction = async (action: 'approve' | 'release', milestoneId: string) => {
    if (!escrowDetail) return;
    setActing(milestoneId);
    try {
      if (action === 'approve') await escrow.approveMilestone(escrowDetail.escrow_id, milestoneId);
      else await escrow.releaseMilestone(escrowDetail.escrow_id, milestoneId);
      onRefresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setActing(null);
    }
  };

  const openDeliveryModal = (m: EscrowMilestone) => {
    setSelectedMilestone(m);
    setDeliveryNote('');
    setDeliveryDriveLink(m.google_drive_link || '');
    setDriveLinkError(null);
    setDeliveryFiles([]);
    setSubmitted(false);
    setShowDeliveryModal(true);
  };

  const validateDriveLink = (link: string): string | null => {
    if (!link.trim()) return 'A Google Drive link is required.';
    const valid = ['https://drive.google.com/', 'https://docs.google.com/', 'https://sheets.google.com/', 'https://slides.google.com/'];
    if (!valid.some(p => link.trim().startsWith(p))) return 'Link must start with https://drive.google.com/ or https://docs.google.com/';
    return null;
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setDeliveryFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    e.target.value = '';
  };

  const submitDelivery = async () => {
    if (!selectedMilestone || !escrowDetail) return;
    const linkErr = validateDriveLink(deliveryDriveLink);
    if (linkErr) { setDriveLinkError(linkErr); return; }
    setSubmitting(true);
    try {
      // 1. Upload any attached files and build message
      const fileLines: string[] = [];
      for (const file of deliveryFiles) {
        await messaging.uploadAttachment(file);
        fileLines.push(`📎 ${file.name}`);
        if (onSend) await onSend(`📎 Delivery file: ${file.name}`, file);
      }

      // 2. Post the delivery message in chat
      const parts = [
        `📦 **Final Delivery: ${selectedMilestone.title}**`,
        '',
        `🔗 Google Drive: ${deliveryDriveLink.trim()}`,
        '',
        deliveryNote.trim() || 'Work completed as discussed.',
        ...fileLines,
      ];
      if (onSend) await onSend(parts.join('\n'));

      // 3. Mark milestone as delivered via escrow endpoint (Google Drive link required)
      await escrow.deliverMilestone(escrowDetail.escrow_id, selectedMilestone.milestone_id, {
        google_drive_link: deliveryDriveLink.trim(),
        delivery_notes: deliveryNote.trim() || undefined,
      });

      setSubmitted(true);
      onRefresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Message-based delivery evidence (attachments + delivery keywords)
  const deliveryMsgs = msgs.filter(m =>
    m.attachments.length > 0 ||
    m.content.toLowerCase().includes('delivery') ||
    m.content.toLowerCase().includes('📦') ||
    m.content.toLowerCase().includes('final')
  );

  return (
    <div className="space-y-5">

      {/* Creator: Final Delivery button for each funded milestone */}
      {role === 'creator' && fundedMilestones.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <h4 className="font-bold text-emerald-900 mb-3">
            <i className="fa-solid fa-box-open mr-2"></i>Ready to submit your work?
          </h4>
          <div className="space-y-2">
            {fundedMilestones.map(m => (
              <div key={m.milestone_id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-emerald-100">
                <div>
                  <p className="font-semibold text-sm text-gray-900">{m.title}</p>
                  <p className="text-xs text-gray-500">${m.amount.toLocaleString()} · {MILESTONE_STATUS_LABEL[m.status]}</p>
                </div>
                <button onClick={() => openDeliveryModal(m)}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition flex items-center gap-1.5">
                  <i className="fa-solid fa-paper-plane text-xs"></i>Submit Delivery
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivered milestones from escrow */}
      {deliveredMilestones.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-700 text-sm mb-3">
            {role === 'client' ? 'Submitted Deliveries — Review Required' : 'Submitted Deliveries'}
          </h4>
          <div className="space-y-3">
            {deliveredMilestones.map(m => (
              <div key={m.milestone_id} className={`border rounded-xl p-4 ${
                m.status === 'delivered' ? 'bg-indigo-50 border-indigo-300' :
                m.status === 'released' ? 'bg-emerald-50 border-emerald-200' :
                'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-2 inline-block ${MILESTONE_STATUS_COLOR[m.status]}`}>
                      {MILESTONE_STATUS_LABEL[m.status]}
                    </span>
                    <p className="font-semibold text-gray-900">{m.title}</p>
                    <p className="text-sm font-bold text-gray-700">${m.amount.toLocaleString()}</p>

                    {/* Google Drive delivery link — prominent for client */}
                    {m.google_drive_link && (
                      <div className={`mt-3 rounded-xl border overflow-hidden ${
                        role === 'client' && m.status === 'delivered'
                          ? 'bg-indigo-50 border-indigo-300'
                          : 'bg-white border-indigo-200'
                      }`}>
                        <div className="px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <i className="fa-brands fa-google-drive text-indigo-600 text-base flex-shrink-0"></i>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-indigo-800">Deliverables</p>
                              <p className="text-xs text-indigo-600 truncate max-w-[160px]">{m.google_drive_link}</p>
                            </div>
                          </div>
                          <a href={m.google_drive_link} target="_blank" rel="noopener noreferrer"
                            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition">
                            <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                            Open Drive
                          </a>
                        </div>
                        {m.delivery_notes && (
                          <div className="px-3 py-2 border-t border-indigo-200 bg-white/60">
                            <p className="text-xs text-gray-600 italic">&ldquo;{m.delivery_notes}&rdquo;</p>
                          </div>
                        )}
                        {m.delivered_at && (
                          <div className="px-3 py-1.5 border-t border-indigo-100 bg-white/40">
                            <p className="text-[11px] text-gray-400">
                              <i className="fa-regular fa-clock mr-1"></i>Submitted {fmtDate(m.delivered_at)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {m.released_at && (
                      <p className="text-xs text-emerald-600 mt-1">
                        <i className="fa-solid fa-check mr-1"></i>Released {fmtDate(m.released_at)}
                      </p>
                    )}
                  </div>
                  {/* Client actions — shown when delivered or approved */}
                  {role === 'client' && (m.status === 'delivered' || m.status === 'approved') && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {/* Release Payment — single click, auto-approves first if needed */}
                      <button
                        onClick={async () => {
                          if (acting) return;
                          // Backend now handles delivered→approved→released in one call
                          await doAction('release', m.milestone_id);
                        }}
                        disabled={acting === m.milestone_id}
                        className="px-3 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition disabled:opacity-60 flex items-center gap-1.5">
                        {acting === m.milestone_id
                          ? <><i className="fa-solid fa-spinner animate-spin"></i>Processing…</>
                          : <><i className="fa-solid fa-coins text-[10px]"></i>Release Payment</>}
                      </button>
                      {m.status === 'delivered' && (
                        <button onClick={() => { setRevisionTarget(m); setRevisionFeedback(''); }}
                          className="px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition">
                          <i className="fa-solid fa-rotate-left text-[10px] mr-1"></i>Revision
                        </button>
                      )}
                      {m.status === 'approved' && (
                        <div className="flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50 px-2 py-1.5 rounded-lg border border-teal-200">
                          <i className="fa-solid fa-circle-check text-teal-600 text-[10px]"></i>
                          <span className="font-semibold">Approved</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery messages with attachments */}
      {deliveryMsgs.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-700 text-sm mb-3">Delivery Messages & Files</h4>
          <div className="space-y-3">
            {deliveryMsgs.slice(0, 10).map(m => (
              <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-box-open text-indigo-600 text-sm"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    {m.content && (
                      <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-3">{m.content}</p>
                    )}
                    {m.attachments.map(a => (
                      <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 mt-2 text-xs text-cobalt hover:underline">
                        <i className="fa-solid fa-paperclip"></i>
                        <span className="truncate">{a.filename}</span>
                        <span className="text-gray-400 flex-shrink-0">{fmtSize(a.file_size)}</span>
                      </a>
                    ))}
                    <p className="text-[10px] text-gray-400 mt-1">{fmtDate(m.sent_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {deliveryMsgs.length === 0 && deliveredMilestones.length === 0 && fundedMilestones.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <i className="fa-solid fa-box-open text-4xl mb-3 block text-gray-300"></i>
          <p className="text-sm">No deliverables submitted yet.</p>
          {role === 'creator' && <p className="text-xs mt-1">Once a milestone is funded, you can submit your delivery here.</p>}
          {role === 'client' && <p className="text-xs mt-1">Deliverables from the creator will appear here.</p>}
        </div>
      )}

      {/* Final Delivery Modal */}
      {showDeliveryModal && selectedMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { if (!submitting) setShowDeliveryModal(false); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden">

            {submitted ? (
              /* ── Success state ── */
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fa-solid fa-circle-check text-emerald-600 text-3xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delivery Submitted!</h3>
                <p className="text-gray-500 text-sm mb-2">
                  <strong>{selectedMilestone.title}</strong> has been submitted to the client for review.
                </p>
                <p className="text-gray-400 text-xs mb-6">
                  The client has been notified and will approve or request revisions.
                </p>
                <button onClick={() => setShowDeliveryModal(false)}
                  className="px-8 py-2.5 bg-cobalt text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition">
                  Done
                </button>
              </div>
            ) : (
              /* ── Form ── */
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Submit Final Delivery</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{selectedMilestone.title} · ${selectedMilestone.amount.toLocaleString()}</p>
                  </div>
                  <button onClick={() => setShowDeliveryModal(false)} disabled={submitting}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Google Drive link — REQUIRED */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Google Drive Link <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <i className="fa-brands fa-google-drive absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                      <input
                        type="url"
                        value={deliveryDriveLink}
                        onChange={e => { setDeliveryDriveLink(e.target.value); setDriveLinkError(null); }}
                        placeholder="https://drive.google.com/file/d/..."
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${
                          driveLinkError
                            ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                            : 'border-gray-300 focus:border-cobalt focus:ring-blue-50'
                        }`}
                      />
                    </div>
                    {driveLinkError && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <i className="fa-solid fa-circle-exclamation"></i>{driveLinkError}
                      </p>
                    )}
                    {deliveryDriveLink && !driveLinkError && validateDriveLink(deliveryDriveLink) === null && (
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <i className="fa-solid fa-circle-check"></i>Valid Google Drive link
                      </p>
                    )}
                  </div>

                  {/* Delivery notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Delivery notes <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)}
                      rows={3} placeholder="Describe what you've delivered, any notes for the client…"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-cobalt resize-none" />
                  </div>

                  {/* File attachments */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Deliverable files <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input ref={filePickerRef} type="file" multiple className="hidden"
                      onChange={handleFilePick}
                      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt,.mp3,.mp4,.mov,.ai,.psd,.fig,.sketch" />

                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-cobalt transition cursor-pointer"
                      onClick={() => filePickerRef.current?.click()}>
                      <i className="fa-solid fa-upload text-gray-400 text-xl mb-2 block"></i>
                      <p className="text-sm text-gray-600">Click to add files</p>
                      <p className="text-xs text-gray-400 mt-0.5">Images, videos, PDFs, documents, project assets</p>
                    </div>

                    {/* Selected files list */}
                    {deliveryFiles.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {deliveryFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                            <i className={`fa-solid text-xs flex-shrink-0 ${
                              f.type.startsWith('image') ? 'fa-image text-purple-500' :
                              f.type.startsWith('video') ? 'fa-film text-blue-500' :
                              f.type === 'application/pdf' ? 'fa-file-pdf text-red-500' :
                              'fa-file text-gray-500'
                            }`}></i>
                            <span className="text-xs text-gray-700 flex-1 truncate">{f.name}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0">{fmtSize(f.size)}</span>
                            <button onClick={() => setDeliveryFiles(prev => prev.filter((_, j) => j !== i))}
                              className="text-gray-300 hover:text-red-400 transition flex-shrink-0">
                              <i className="fa-solid fa-xmark text-xs"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {submitting && (
                  <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <div className="w-4 h-4 border-2 border-cobalt border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                    <p className="text-xs text-cobalt">
                      {deliveryFiles.length > 0 ? `Uploading files and submitting delivery…` : 'Submitting delivery…'}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 mt-5">
                  <button onClick={() => setShowDeliveryModal(false)} disabled={submitting}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={submitDelivery} disabled={submitting}
                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting
                      ? <><i className="fa-solid fa-spinner animate-spin"></i> Submitting…</>
                      : <><i className="fa-solid fa-paper-plane"></i> Submit Delivery</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creator: Revision Requested banner — shows what the client wants changed */}
      {role === 'creator' && escrowDetail && escrowDetail.milestones.some(m => m.status === 'revision_requested') && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 flex items-start gap-3">
          <i className="fa-solid fa-rotate-left text-orange-500 text-lg mt-0.5 flex-shrink-0"></i>
          <div>
            <p className="font-bold text-orange-900 text-sm">Revision Requested</p>
            <p className="text-orange-700 text-xs mt-1 leading-relaxed">
              The client has requested changes. Check the chat for their feedback, then resubmit your updated work via the &ldquo;Submit Delivery&rdquo; button above. Funds remain locked in escrow.
            </p>
          </div>
        </div>
      )}

      {/* Request Revision Modal (client) */}
      {revisionTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { if (!requestingRevision) setRevisionTarget(null); }} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md z-10 flex flex-col max-h-[92vh]">
            {/* Header — always visible */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Request Revision</h3>
                <p className="text-sm text-gray-500 mt-0.5">{revisionTarget.title}</p>
              </div>
              <button onClick={() => setRevisionTarget(null)} disabled={requestingRevision}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
                <i className="fa-solid fa-lock text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                <p className="text-xs text-orange-700 leading-relaxed">
                  Funds remain locked in escrow until you approve. The creator will be notified and can resubmit.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  What needs to change? <span className="text-red-500">*</span>
                </label>
                <textarea value={revisionFeedback} onChange={e => setRevisionFeedback(e.target.value)}
                  rows={5}
                  placeholder="Be specific: describe exactly what needs to be changed, added, or removed…"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
              </div>
            </div>

            {/* Footer buttons — always visible at bottom */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setRevisionTarget(null)} disabled={requestingRevision}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition disabled:opacity-50">
                Cancel
              </button>
              <button onClick={submitRevisionRequest}
                disabled={!revisionFeedback.trim() || requestingRevision}
                className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {requestingRevision
                  ? <><i className="fa-solid fa-spinner animate-spin"></i> Sending…</>
                  : <><i className="fa-solid fa-rotate-left"></i> Request Revision</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Files Tab ────────────────────────────────────────────────────────────────

function FilesTab({ msgs, onSend }: { msgs: MessageItem[]; onSend?: (text: string, file?: File) => void }) {
  const files = msgs.flatMap(m => m.attachments.map(a => ({ ...a, sent_at: m.sent_at })));
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onSend) return;
    setUploading(true);
    try {
      await onSend(`📎 Shared a file: ${file.name}`, file);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      {/* Upload button */}
      {onSend && (
        <div className="mb-4">
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload}
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.mp3,.mp4,.mov" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-cobalt text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-60">
            {uploading
              ? <><i className="fa-solid fa-spinner animate-spin"></i> Uploading…</>
              : <><i className="fa-solid fa-upload"></i> Upload File</>
            }
          </button>
          <p className="text-xs text-gray-400 mt-1.5">Uploaded files appear in chat and are accessible to both parties.</p>
        </div>
      )}

      {files.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <i className="fa-solid fa-folder-open text-4xl mb-3 block text-gray-300"></i>
          <p className="text-sm">No files shared yet.</p>
          <p className="text-xs mt-1">Files uploaded here or sent via chat appear in this list.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map(f => (
            <a key={f.id} href={f.file_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 hover:border-cobalt hover:shadow-sm transition group">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <i className={`fa-solid ${
                  f.file_type?.startsWith('image') ? 'fa-image text-purple-500' :
                  f.file_type?.startsWith('video') ? 'fa-film text-blue-500' :
                  f.file_type === 'application/pdf' ? 'fa-file-pdf text-red-500' :
                  'fa-file text-gray-500'
                } text-lg`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-cobalt truncate">{f.filename}</p>
                <p className="text-xs text-gray-400">{fmtSize(f.file_size)} · {fmtDate((f as {sent_at?: string}).sent_at)}</p>
              </div>
              <i className="fa-solid fa-download text-gray-300 group-hover:text-cobalt transition flex-shrink-0"></i>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────

function ProgressTab({ projectId, role, escrowDetail }: {
  projectId?: string;
  role: 'client' | 'creator';
  escrowDetail: EscrowDetail | null;
}) {
  const [progress, setProgress] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [draft, setDraft] = useState(0);

  useEffect(() => {
    if (!projectId) return;
    creatorProjects.getById(projectId)
      .then(p => { setProgress(p.progress_percentage ?? 0); setDraft(p.progress_percentage ?? 0); })
      .catch(() => {});
  }, [projectId]);

  const save = async () => {
    if (!projectId) return;
    setUpdating(true);
    try {
      await creatorProjects.updateProgress(projectId, draft);
      setProgress(draft);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  // Calculate escrow progress
  const total    = escrowDetail?.total_amount    ?? 0;
  const released = escrowDetail?.released_amount ?? 0;
  const paymentPct = total > 0 ? Math.round((released / total) * 100) : 0;
  const allReleased = escrowDetail ? escrowDetail.milestones.every(m => ['released', 'refunded'].includes(m.status)) : false;

  // Estimate creator earnings after platform fee (~4%)
  const estimatedEarnings = released * 0.96;

  return (
    <div className="space-y-6">

      {/* Payment Released / Earnings Added — shown when all milestones released */}
      {allReleased && escrowDetail && released > 0 && (
        <div className={`rounded-xl border-2 p-5 ${
          role === 'creator'
            ? 'bg-emerald-50 border-emerald-300'
            : 'bg-blue-50 border-blue-300'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              role === 'creator' ? 'bg-emerald-600' : 'bg-cobalt'
            }`}>
              <i className={`fa-solid text-white text-lg ${role === 'creator' ? 'fa-coins' : 'fa-circle-check'}`}></i>
            </div>
            <div>
              <p className={`font-bold text-base ${role === 'creator' ? 'text-emerald-900' : 'text-blue-900'}`}>
                {role === 'creator' ? 'Payment Released — Earnings Added' : 'Payment Completed'}
              </p>
              <p className={`text-xs mt-0.5 ${role === 'creator' ? 'text-emerald-700' : 'text-blue-700'}`}>
                {role === 'creator'
                  ? 'All milestones paid out. Earnings added to your balance.'
                  : 'All payments released. This project is complete.'}
              </p>
            </div>
          </div>

          {role === 'creator' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-3 text-center border border-emerald-100">
                <p className="text-xl font-bold text-emerald-700">${released.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total paid</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-emerald-100">
                <p className="text-xl font-bold text-emerald-700">~${estimatedEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-gray-500 mt-0.5">Your earnings (after fee)</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
                <p className="text-xl font-bold text-cobalt">${released.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total paid out</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
                <p className="text-xl font-bold text-cobalt">{escrowDetail.milestones.filter(m => m.status === 'released').length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Milestones completed</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Work progress */}
      {projectId && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="font-semibold text-gray-900 mb-4">Work Completion</h4>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Overall progress</span>
            <span className="font-bold text-cobalt text-lg">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-4">
            <div className="bg-cobalt h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          {role === 'creator' && (
            <>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={100} value={draft} onChange={e => setDraft(Number(e.target.value))}
                  className="flex-1 accent-cobalt" />
                <span className="text-cobalt font-bold w-10 text-right">{draft}%</span>
              </div>
              <button onClick={save} disabled={updating || draft === progress}
                className="mt-3 w-full py-2 text-sm font-semibold text-white bg-cobalt rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
                {updating ? 'Saving…' : 'Update Progress'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Payment progress */}
      {escrowDetail && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="font-semibold text-gray-900 mb-4">
            Payment {allReleased ? 'Summary' : 'Progress'}
          </h4>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              ${released.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} released
            </span>
            <span className={`font-bold text-lg ${paymentPct === 100 ? 'text-emerald-600' : 'text-cobalt'}`}>{paymentPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-4">
            <div className={`h-3 rounded-full transition-all duration-500 ${paymentPct === 100 ? 'bg-emerald-500' : 'bg-cobalt'}`}
              style={{ width: `${paymentPct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Escrow total',  value: `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-gray-700' },
              { label: 'Locked',        value: `$${(total - released).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: total > released ? 'text-cobalt' : 'text-gray-400' },
              { label: 'Released',      value: `$${released.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-emerald-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center bg-gray-50 rounded-lg p-2">
                <p className={`font-bold text-sm ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-400">{label}</p>
              </div>
            ))}
          </div>
          {role === 'creator' && released > 0 && (
            <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-xs text-emerald-700 font-semibold">
                <i className="fa-solid fa-coins mr-1.5"></i>
                Your earnings: ~${(released * 0.96).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="font-normal ml-1">(after ~4% platform fee)</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Milestone completion */}
      {escrowDetail && escrowDetail.milestones.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="font-semibold text-gray-900 mb-4">Milestone Status</h4>
          <div className="space-y-2">
            {escrowDetail.milestones.map(m => (
              <div key={m.milestone_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-700 truncate flex-1">{m.title}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-3 flex-shrink-0 ${MILESTONE_STATUS_COLOR[m.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {MILESTONE_STATUS_LABEL[m.status] ?? m.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ETF Points summary for completed projects */}
      {allReleased && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <i className="fa-solid fa-medal text-purple-600 text-lg"></i>
            <h4 className="font-bold text-purple-900">ETF Points Awarded</h4>
          </div>
          <p className="text-xs text-purple-700 mb-3 leading-relaxed">
            Points were automatically awarded to both parties for completing this project.
          </p>
          <div className="space-y-1.5">
            {role === 'creator' ? (
              <>
                {[
                  { label: 'Milestone payment received',      pts: '50 pts', icon: 'fa-flag-checkered' },
                  { label: 'Project completed bonus',          pts: '100 pts', icon: 'fa-trophy' },
                  { label: 'On-time delivery (if before due)', pts: '30 pts', icon: 'fa-clock' },
                  { label: 'Positive review received (≥4★)',  pts: '20 pts', icon: 'fa-star' },
                ].map(({ label, pts, icon }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-purple-800">
                      <i className={`fa-solid ${icon} text-purple-500 w-4 text-center`}></i>{label}
                    </span>
                    <span className="font-bold text-emerald-600">+{pts}</span>
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { label: 'Milestone released',              pts: '15 pts', icon: 'fa-unlock' },
                  { label: 'Project completed',               pts: '50 pts', icon: 'fa-check-double' },
                  { label: 'Review submitted',                pts: '15 pts', icon: 'fa-pen-to-square' },
                  { label: 'Platform engagement (messaging)', pts: '5 pts',  icon: 'fa-bolt' },
                ].map(({ label, pts, icon }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-purple-800">
                      <i className={`fa-solid ${icon} text-purple-500 w-4 text-center`}></i>{label}
                    </span>
                    <span className="font-bold text-emerald-600">+{pts}</span>
                  </div>
                ))}
              </>
            )}
          </div>
          <a href={role === 'creator' ? '/creator/etf' : '/client/etf'}
            className="mt-3 flex items-center gap-1.5 text-xs text-purple-700 font-semibold hover:underline">
            <i className="fa-solid fa-medal"></i>View your ETF score →
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Summary Tab ─────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <i key={s} className={`fa-star text-sm ${rating >= s ? 'fa-solid text-yellow-400' : 'fa-regular text-gray-200'}`}></i>
      ))}
    </span>
  );
}

function SummaryTab({ role, escrowDetail, msgs, jobStatus, proposalId, jobTitle, jobId }: {
  role: 'client' | 'creator';
  escrowDetail: EscrowDetail | null;
  msgs: MessageItem[];
  jobStatus?: string;
  proposalId?: string;
  jobTitle?: string;
  jobId: string;
}) {
  const [reviews, setReviews] = useState<{
    client_rating: { overall: number; review: string; tags: string[]; reviewed_at: string; ratings: Record<string,number> } | null;
    creator_rating: { overall: number; review: string; tags: string[]; reviewed_at: string; ratings: Record<string,number> } | null;
  } | null>(null);

  useEffect(() => {
    if (!proposalId) return;
    proposals.getReviews(proposalId)
      .then(r => setReviews(r))
      .catch(() => {});
  }, [proposalId]);

  const isCompleted = jobStatus === 'completed';
  const totalFiles  = msgs.reduce((s, m) => s + m.attachments.length, 0);
  const allFiles    = msgs.flatMap(m => m.attachments);
  const totalPaid   = escrowDetail?.released_amount ?? 0;
  const creatorEarnings = totalPaid * 0.96;
  const milestones  = escrowDetail?.milestones ?? [];
  const released    = milestones.filter(m => m.status === 'released');
  const completedAt = escrowDetail?.completed_at;

  return (
    <div className="space-y-5">
      {/* Completion header */}
      <div className={`rounded-xl p-5 ${isCompleted ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-emerald-600' : 'bg-gray-400'}`}>
            <i className={`fa-solid text-white ${isCompleted ? 'fa-trophy' : 'fa-folder-open'}`}></i>
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{jobTitle ?? 'Project Summary'}</h3>
            <p className={`text-xs mt-0.5 ${isCompleted ? 'text-emerald-700' : 'text-gray-500'}`}>
              {isCompleted
                ? `Completed${completedAt ? ` · ${fmtDate(completedAt)}` : ''}`
                : `Status: ${jobStatus ?? 'In Progress'}`
              }
            </p>
          </div>
          <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${
            isCompleted ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {isCompleted ? 'Completed' : 'Active'}
          </span>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          {[
            { label: 'Total paid',       value: `$${totalPaid.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`, icon: 'fa-coins', color: 'text-emerald-600' },
            { label: 'Milestones done',  value: `${released.length} / ${milestones.length}`, icon: 'fa-list-check', color: 'text-cobalt' },
            { label: 'Files shared',     value: String(totalFiles),   icon: 'fa-paperclip',  color: 'text-gray-600' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-xl p-3 text-center border border-gray-100">
              <i className={`fa-solid ${icon} ${color} mb-1 text-base`}></i>
              <p className={`font-bold text-sm ${color}`}>{value}</p>
              <p className="text-[10px] text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions — milestone-by-milestone */}
      {milestones.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-receipt text-cobalt text-sm"></i>Transactions
          </h4>
          <div className="space-y-0">
            {milestones.map((m, i) => (
              <div key={m.milestone_id}
                className={`flex items-center justify-between py-3 ${i < milestones.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    m.status === 'released' ? 'bg-emerald-100' :
                    m.status === 'refunded' ? 'bg-gray-100' : 'bg-blue-100'
                  }`}>
                    <i className={`fa-solid text-xs ${
                      m.status === 'released' ? 'fa-check text-emerald-600' :
                      m.status === 'refunded' ? 'fa-rotate-left text-gray-500' :
                      'fa-lock text-cobalt'
                    }`}></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{m.title}</p>
                    <p className="text-xs text-gray-400">
                      {m.status === 'released' && m.released_at
                        ? `Released ${fmtDate(m.released_at)}`
                        : MILESTONE_STATUS_LABEL[m.status] ?? m.status
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className={`text-sm font-bold ${m.status === 'released' ? 'text-emerald-600' : 'text-gray-700'}`}>
                    ${m.amount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                  </p>
                  {role === 'creator' && m.status === 'released' && (
                    <p className="text-[10px] text-gray-400">
                      ~${(m.amount * 0.96).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} earned
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals row */}
          {totalPaid > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">Total Released</span>
              <div className="text-right">
                <span className="text-sm font-bold text-emerald-600">
                  ${totalPaid.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                </span>
                {role === 'creator' && (
                  <p className="text-[10px] text-gray-400">
                    ~${creatorEarnings.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} your earnings
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reviews */}
      {isCompleted && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-star text-amber-400 text-sm"></i>Reviews
          </h4>

          {!reviews ? (
            <p className="text-sm text-gray-400 text-center py-3">Loading reviews…</p>
          ) : (
            <div className="space-y-4">
              {/* Client → Creator review */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {role === 'client' ? 'Your review of the creator' : 'Client’s review of you'}
                </p>
                {reviews.client_rating ? (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <StarRating rating={reviews.client_rating.overall} />
                      <span className="font-bold text-gray-900 text-sm">{reviews.client_rating.overall.toFixed(1)}</span>
                      <span className="text-xs text-gray-400 ml-auto">{fmtDate(reviews.client_rating.reviewed_at)}</span>
                    </div>
                    {reviews.client_rating.review && (
                      <p className="text-sm text-gray-700 leading-relaxed">&ldquo;{reviews.client_rating.review}&rdquo;</p>
                    )}
                    {reviews.client_rating.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {reviews.client_rating.tags.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-2">
                    <i className="fa-regular fa-star text-gray-300"></i>
                    <p className="text-sm text-gray-400">
                      {role === 'client'
                        ? <><a href={`/client/projects/${jobId}/review`} className="text-cobalt hover:underline font-medium">Leave a review</a> for the creator</>
                        : 'The client has not left a review yet'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Creator → Client review */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {role === 'creator' ? 'Your review of the client' : 'Creator&apos;s review of you'}
                </p>
                {reviews.creator_rating ? (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <StarRating rating={reviews.creator_rating.overall} />
                      <span className="font-bold text-gray-900 text-sm">{reviews.creator_rating.overall.toFixed(1)}</span>
                      <span className="text-xs text-gray-400 ml-auto">{fmtDate(reviews.creator_rating.reviewed_at)}</span>
                    </div>
                    {reviews.creator_rating.review && (
                      <p className="text-sm text-gray-700 leading-relaxed">&ldquo;{reviews.creator_rating.review}&rdquo;</p>
                    )}
                    {reviews.creator_rating.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {reviews.creator_rating.tags.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-2">
                    <i className="fa-regular fa-star text-gray-300"></i>
                    <p className="text-sm text-gray-400">
                      {role === 'creator' && proposalId
                        ? <><a href={`/creator/projects/review?job=${jobId}&proposal=${proposalId}`} className="text-cobalt hover:underline font-medium">Leave a review</a> for the client</>
                        : 'The creator has not left a review yet'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Files */}
      {allFiles.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-folder-open text-cobalt text-sm"></i>
            Project Files <span className="text-gray-400 font-normal text-sm">({allFiles.length})</span>
          </h4>
          <div className="space-y-2">
            {allFiles.slice(0,10).map(f => (
              <a key={f.id} href={f.file_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition group">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className={`fa-solid text-xs ${
                    f.file_type?.startsWith('image') ? 'fa-image text-purple-500' :
                    f.file_type === 'application/pdf' ? 'fa-file-pdf text-red-500' :
                    'fa-file text-gray-500'
                  }`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-cobalt">{f.filename}</p>
                  {f.file_size && <p className="text-xs text-gray-400">{fmtSize(f.file_size)}</p>}
                </div>
                <i className="fa-solid fa-arrow-down-to-line text-xs text-gray-300 group-hover:text-cobalt transition"></i>
              </a>
            ))}
            {allFiles.length > 10 && (
              <p className="text-xs text-gray-400 text-center pt-1">+{allFiles.length - 10} more — see Files tab</p>
            )}
          </div>
        </div>
      )}

      {/* Not yet completed notice */}
      {!isCompleted && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <i className="fa-solid fa-clock text-cobalt text-lg mb-2 block"></i>
          <p className="text-sm text-blue-800 font-medium">Project in progress</p>
          <p className="text-xs text-blue-600 mt-1">The full summary will be available once the project is completed.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Workspace ───────────────────────────────────────────────────────────

export default function ProjectWorkspace({ jobId, role, projectId, myUserId = '', jobStatus, proposalId, jobTitle }: ProjectWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabId>('chat');

  // Data
  const [convo, setConvo] = useState<ConversationItem | null>(null);
  const [msgs, setMsgs] = useState<MessageItem[]>([]);
  const [escrowDetail, setEscrowDetail] = useState<EscrowDetail | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  // Shared revision request modal state (opened from both Milestones and Deliverables tabs)
  const [sharedRevisionTarget, setSharedRevisionTarget] = useState<EscrowMilestone | null>(null);
  const [sharedRevisionFeedback, setSharedRevisionFeedback] = useState('');
  const [sharedRequestingRevision, setSharedRequestingRevision] = useState(false);

  const submitSharedRevision = async () => {
    if (!sharedRevisionTarget || !escrowDetail) return;
    setSharedRequestingRevision(true);
    try {
      await escrow.requestRevision(escrowDetail.escrow_id, sharedRevisionTarget.milestone_id, sharedRevisionFeedback.trim() || undefined);
      setSharedRevisionTarget(null);
      setSharedRevisionFeedback('');
      loadAll();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSharedRequestingRevision(false);
    }
  };

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep a stable ref to `convo` so the polling interval can always access the
  // latest value without being listed as a useEffect dependency (which would
  // cause a reload loop every time setConvo is called inside loadAll).
  const convoRef = useRef<ConversationItem | null>(null);
  useEffect(() => { convoRef.current = convo; }, [convo]);

  const loadAll = useCallback(async () => {
    try {
      // Load conversation linked to this job
      const convRes = await messaging.listConversations({ limit: 50 });
      const linked = convRes.conversations.find(c => c.job_id === jobId) ?? null;
      setConvo(linked);
      convoRef.current = linked;

      if (linked) {
        const msgRes = await messaging.getMessages(linked.id, { limit: 100 });
        setMsgs(msgRes.messages);
        messaging.markAsRead(linked.id).catch(() => {});
      }

      // Load escrow
      const escrowRes = await escrow.list({ limit: 50 });
      const linkedEscrow = escrowRes.escrows.find(e => e.job_post_id === jobId);
      if (linkedEscrow) {
        const detail = await escrow.getById(linkedEscrow.escrow_id);
        setEscrowDetail(detail);
      }

      // Load deadlines if we have a project id
      if (projectId) {
        const dl = await creatorProjects.getDeadlines(projectId);
        setDeadlines(dl.deadlines ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [jobId, projectId]);  // ← only re-create when the job/project id changes

  useEffect(() => {
    loadAll();
    // Poll only for new messages every 8 s — use the ref so we never need
    // `convo` as a dependency (avoids the reload loop).
    pollRef.current = setInterval(() => {
      const current = convoRef.current;
      if (current) {
        messaging.getMessages(current.id, { limit: 100 })
          .then(r => setMsgs(r.messages))
          .catch(() => {});
      }
    }, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadAll]);  // ← no `convo` dep — loadAll is stable for the life of this jobId

  const handleSendMessage = async (text: string, file?: File) => {
    let targetConvo = convo;

    if (!targetConvo) {
      // Create conversation first
      try {
        const newConvo = await messaging.createConversation([], jobId, text);
        setConvo(newConvo);
        targetConvo = newConvo;
        const msgRes = await messaging.getMessages(newConvo.id, { limit: 100 });
        setMsgs(msgRes.messages);
        return;
      } catch (e) { alert((e as Error).message); return; }
    }

    setSending(true);
    const tmp: MessageItem = {
      id: `tmp-${Date.now()}`, conversation_id: targetConvo.id, sender_id: myUserId,
      content: text, attachments: [], sent_at: new Date().toISOString(),
      is_deleted: false, read_by: [], message_type: 'text',
    };
    setMsgs(prev => [...prev, tmp]);

    try {
      let sent: MessageItem;
      if (file) {
        // Upload file then attach to message
        const uploaded = await messaging.uploadAttachment(file);
        sent = await messaging.sendWithAttachments(targetConvo.id, text, [uploaded.id]);
      } else {
        sent = await messaging.send(targetConvo.id, text);
      }
      setMsgs(prev => prev.map(m => m.id === tmp.id ? sent : m));
    } catch {
      setMsgs(prev => prev.filter(m => m.id !== tmp.id));
    } finally {
      setSending(false);
    }
  };

  // Badge counts for tabs
  const unreadMsgs = msgs.filter(m => !m.read_by.includes(myUserId) && m.sender_id !== myUserId).length;
  const pendingMilestones = escrowDetail?.milestones.filter(m =>
    role === 'creator' ? m.status === 'funded' : m.status === 'delivered'
  ).length ?? 0;
  const totalFiles = msgs.reduce((s, m) => s + m.attachments.length, 0);

  const badge = (tab: TabId): number | null => {
    if (tab === 'chat') return unreadMsgs || null;
    if (tab === 'milestones') return pendingMilestones || null;
    if (tab === 'files') return totalFiles || null;
    return null;
  };

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
      <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-gray-500 text-sm">Loading workspace…</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-200 overflow-x-auto no-scrollbar">
        {TABS.map(tab => {
          const count = badge(tab.id);
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition flex-shrink-0 ${
                activeTab === tab.id
                  ? 'text-cobalt border-cobalt bg-blue-50/50'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}>
              <i className={`fa-solid ${tab.icon} text-xs`}></i>
              {tab.label}
              {count ? (
                <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                  activeTab === tab.id ? 'bg-cobalt text-white' : 'bg-gray-200 text-gray-600'
                }`}>{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {activeTab === 'chat' && (
          <ChatTab convo={convo} msgs={msgs} myUserId={myUserId}
            onSend={(text, file) => handleSendMessage(text, file)} sending={sending} />
        )}
        {activeTab === 'timeline' && (
          <TimelineTab deadlines={deadlines} projectId={projectId} role={role} onRefresh={loadAll} />
        )}
        {activeTab === 'milestones' && (
          <MilestonesTab escrowDetail={escrowDetail} role={role} onRefresh={loadAll}
            onRequestRevision={m => { setSharedRevisionTarget(m); setSharedRevisionFeedback(''); }} />
        )}
        {activeTab === 'deliverables' && (
          <DeliverablesTab msgs={msgs} myUserId={myUserId} role={role} escrowDetail={escrowDetail} onRefresh={loadAll}
            onSend={(text, file) => handleSendMessage(text, file)} />
        )}
        {activeTab === 'files' && (
          <FilesTab msgs={msgs} onSend={(text, file) => handleSendMessage(text, file)} />
        )}
        {activeTab === 'progress' && (
          <ProgressTab projectId={projectId} role={role} escrowDetail={escrowDetail} />
        )}
        {activeTab === 'summary' && (
          <SummaryTab
            role={role}
            escrowDetail={escrowDetail}
            msgs={msgs}
            jobStatus={jobStatus}
            proposalId={proposalId}
            jobTitle={jobTitle}
            jobId={jobId}
          />
        )}
      </div>

      {/* Shared Request Revision Modal — opened from Milestones or Deliverables tab */}
      {sharedRevisionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { if (!sharedRequestingRevision) setSharedRevisionTarget(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Request Revision</h3>
                <p className="text-sm text-gray-500 mt-0.5">{sharedRevisionTarget.title} · ${sharedRevisionTarget.amount.toLocaleString()}</p>
              </div>
              <button onClick={() => setSharedRevisionTarget(null)} disabled={sharedRequestingRevision}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 flex items-start gap-2">
              <i className="fa-solid fa-lock text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
              <p className="text-xs text-orange-700 leading-relaxed">
                Funds remain locked in escrow. The creator will be notified and can resubmit updated work.
              </p>
            </div>

            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              What needs to change? <span className="text-red-500">*</span>
            </label>
            <textarea value={sharedRevisionFeedback} onChange={e => setSharedRevisionFeedback(e.target.value)}
              rows={4}
              placeholder="Be specific — describe exactly what needs to be changed, corrected, or added…"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none mb-4" />

            <div className="flex gap-3">
              <button onClick={() => setSharedRevisionTarget(null)} disabled={sharedRequestingRevision}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition disabled:opacity-50">
                Cancel
              </button>
              <button onClick={submitSharedRevision}
                disabled={!sharedRevisionFeedback.trim() || sharedRequestingRevision}
                className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {sharedRequestingRevision
                  ? <><i className="fa-solid fa-spinner animate-spin"></i> Sending…</>
                  : <><i className="fa-solid fa-rotate-left"></i> Request Revision</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
