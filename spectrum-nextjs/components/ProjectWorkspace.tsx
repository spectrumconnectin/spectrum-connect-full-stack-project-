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
  escrow, messaging, jobs, creatorProjects,
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
}

type TabId = 'chat' | 'timeline' | 'milestones' | 'deliverables' | 'files' | 'progress';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'chat',         label: 'Chat',        icon: 'fa-comment' },
  { id: 'timeline',     label: 'Timeline',    icon: 'fa-calendar-days' },
  { id: 'milestones',   label: 'Milestones',  icon: 'fa-list-check' },
  { id: 'deliverables', label: 'Deliverables',icon: 'fa-box-open' },
  { id: 'files',        label: 'Files',       icon: 'fa-folder-open' },
  { id: 'progress',     label: 'Progress',    icon: 'fa-chart-line' },
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
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className={`max-w-[70%]`}>
                {isAgreement ? (
                  <div className={`rounded-2xl border-2 p-3 ${isMe ? 'border-emerald-300 bg-emerald-50' : 'border-emerald-200 bg-white'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <i className="fa-solid fa-handshake text-emerald-600 text-xs"></i>
                      <span className="font-bold text-emerald-800 text-xs">Agreement</span>
                    </div>
                    <p className="text-xs text-gray-600 whitespace-pre-line">{m.content.split('\n').slice(2).join('\n')}</p>
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

function MilestonesTab({ escrowDetail, role, onRefresh }: {
  escrowDetail: EscrowDetail | null;
  role: 'client' | 'creator';
  onRefresh: () => void;
}) {
  const [acting, setActing] = useState<string | null>(null);

  const doAction = async (action: 'deliver' | 'request-revision' | 'release', milestoneId: string) => {
    if (!escrowDetail) return;
    setActing(milestoneId);
    try {
      if (action === 'deliver') {
        await escrow.deliverMilestone(escrowDetail.escrow_id, milestoneId);
      } else if (action === 'request-revision') {
        await escrow.requestRevision(escrowDetail.escrow_id, milestoneId);
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

  return (
    <div className="space-y-3">
      {/* Escrow summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
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

      {escrowDetail.milestones.map((m: EscrowMilestone) => (
        <div key={m.milestone_id} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${MILESTONE_STATUS_COLOR[m.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {MILESTONE_STATUS_LABEL[m.status] ?? m.status}
                </span>
              </div>
              <p className="font-semibold text-gray-900">{m.title}</p>
              <p className="text-lg font-bold text-gray-900">${m.amount.toLocaleString()}</p>
              {m.funded_at && <p className="text-xs text-gray-400 mt-1">Funded {fmtDate(m.funded_at)}</p>}
              {m.released_at && <p className="text-xs text-emerald-600 mt-0.5">Released {fmtDate(m.released_at)}</p>}
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
                  <button onClick={() => doAction('release', m.milestone_id)} disabled={acting === m.milestone_id}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-cobalt rounded-lg hover:bg-blue-700 transition disabled:opacity-60">
                    Release Payment
                  </button>
                  <button onClick={() => doAction('request-revision', m.milestone_id)} disabled={acting === m.milestone_id}
                    className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition disabled:opacity-60">
                    Request Revision
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
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

function DeliverablesTab({ msgs, myUserId, role, escrowDetail, onRefresh }: {
  msgs: MessageItem[];
  myUserId: string;
  role: 'client' | 'creator';
  escrowDetail: EscrowDetail | null;
  onRefresh: () => void;
}) {
  // Deliverables are messages sent by the creator that contain attachments
  // OR messages that start with delivery-related keywords
  const deliveries = msgs.filter(m =>
    m.attachments.length > 0 ||
    m.content.toLowerCase().includes('deliver') ||
    m.content.toLowerCase().includes('submission') ||
    m.content.toLowerCase().includes('completed') ||
    m.content.toLowerCase().includes('final')
  );

  // Delivered milestones from escrow
  const deliveredMilestones = escrowDetail?.milestones.filter(
    m => ['delivered', 'revision_requested', 'approved', 'released'].includes(m.status)
  ) ?? [];

  const [acting, setActing] = useState<string | null>(null);

  const doAction = async (action: 'release' | 'request-revision', milestoneId: string) => {
    if (!escrowDetail) return;
    setActing(milestoneId);
    try {
      if (action === 'release') await escrow.releaseMilestone(escrowDetail.escrow_id, milestoneId);
      else await escrow.requestRevision(escrowDetail.escrow_id, milestoneId);
      onRefresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Delivered milestones from escrow */}
      {deliveredMilestones.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-700 text-sm mb-3">Escrow Deliveries</h4>
          <div className="space-y-3">
            {deliveredMilestones.map(m => (
              <div key={m.milestone_id} className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-2 inline-block ${MILESTONE_STATUS_COLOR[m.status]}`}>
                      {MILESTONE_STATUS_LABEL[m.status]}
                    </span>
                    <p className="font-semibold text-gray-900">{m.title}</p>
                    <p className="text-sm font-bold text-gray-700">${m.amount.toLocaleString()}</p>
                  </div>
                  {role === 'client' && m.status === 'delivered' && (
                    <div className="flex flex-col gap-2">
                      <button onClick={() => doAction('release', m.milestone_id)} disabled={acting === m.milestone_id}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-cobalt rounded-lg hover:bg-blue-700 transition disabled:opacity-60">
                        ✓ Approve & Release
                      </button>
                      <button onClick={() => doAction('request-revision', m.milestone_id)} disabled={acting === m.milestone_id}
                        className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition disabled:opacity-60">
                        ↩ Request Revision
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message-based deliverables */}
      {deliveries.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-700 text-sm mb-3">Submitted Files & Work</h4>
          <div className="space-y-3">
            {deliveries.slice(0, 10).map(m => (
              <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-box-open text-cobalt text-sm"></i>
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

      {deliveries.length === 0 && deliveredMilestones.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <i className="fa-solid fa-box-open text-4xl mb-3 block text-gray-300"></i>
          <p className="text-sm">No deliverables submitted yet.</p>
          {role === 'creator' && <p className="text-xs mt-1">Submit your work via the Milestones tab or upload files below.</p>}
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
  const total = escrowDetail?.total_amount ?? 0;
  const released = escrowDetail?.released_amount ?? 0;
  const paymentPct = total > 0 ? Math.round((released / total) * 100) : 0;

  return (
    <div className="space-y-6">
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
          <h4 className="font-semibold text-gray-900 mb-4">Payment Released</h4>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">${released.toLocaleString()} of ${total.toLocaleString()}</span>
            <span className="font-bold text-emerald-600 text-lg">{paymentPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="bg-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: `${paymentPct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Total escrow', value: `$${total.toLocaleString()}`, color: 'text-gray-700' },
              { label: 'In escrow', value: `$${(total - released).toLocaleString()}`, color: 'text-cobalt' },
              { label: 'Released', value: `$${released.toLocaleString()}`, color: 'text-emerald-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center bg-gray-50 rounded-lg p-2">
                <p className={`font-bold text-sm ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-400">{label}</p>
              </div>
            ))}
          </div>
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
    </div>
  );
}

// ─── Main Workspace ───────────────────────────────────────────────────────────

export default function ProjectWorkspace({ jobId, role, projectId, myUserId = '' }: ProjectWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabId>('chat');

  // Data
  const [convo, setConvo] = useState<ConversationItem | null>(null);
  const [msgs, setMsgs] = useState<MessageItem[]>([]);
  const [escrowDetail, setEscrowDetail] = useState<EscrowDetail | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async () => {
    try {
      // Load conversation linked to this job
      const convRes = await messaging.listConversations({ limit: 50 });
      const linked = convRes.conversations.find(c => c.job_id === jobId);
      setConvo(linked ?? null);

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
  }, [jobId, projectId]);

  useEffect(() => {
    loadAll();
    pollRef.current = setInterval(() => {
      if (convo) {
        messaging.getMessages(convo.id, { limit: 100 })
          .then(r => setMsgs(r.messages))
          .catch(() => {});
      }
    }, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadAll, convo]);

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
          <MilestonesTab escrowDetail={escrowDetail} role={role} onRefresh={loadAll} />
        )}
        {activeTab === 'deliverables' && (
          <DeliverablesTab msgs={msgs} myUserId={myUserId} role={role} escrowDetail={escrowDetail} onRefresh={loadAll} />
        )}
        {activeTab === 'files' && (
          <FilesTab msgs={msgs} onSend={(text, file) => handleSendMessage(text, file)} />
        )}
        {activeTab === 'progress' && (
          <ProgressTab projectId={projectId} role={role} escrowDetail={escrowDetail} />
        )}
      </div>
    </div>
  );
}
