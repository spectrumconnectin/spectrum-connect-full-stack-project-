'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { messaging, jobs, ConversationItem, MessageItem, auth, JobPostItem } from '@/lib/api';

function relTime(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function msgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function otherOf(convo: ConversationItem, myId: string) {
  return convo.participants.find(p => p.user_id !== myId) ?? convo.participants[0];
}

function displayName(p?: ConversationItem['participants'][number]): string {
  if (!p) return 'Unknown';
  return p.display_name || p.username;
}

function Avatar({ url, name, size = 'md' }: { url?: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-10 h-10' : size === 'md' ? 'w-11 h-11' : 'w-8 h-8';
  const txt = size === 'lg' ? 'text-base' : size === 'md' ? 'text-base' : 'text-xs';
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt={name} className={`${sz} rounded-full object-cover border-2 border-gray-200 flex-shrink-0`} />;
  return (
    <div className={`${sz} rounded-full bg-blue-100 flex items-center justify-center text-cobalt font-bold flex-shrink-0 border-2 border-gray-200 ${txt}`}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

// ── Negotiation topic quick-send templates ────────────────────────────────────
const TOPIC_TEMPLATES = [
  {
    icon: 'fa-list-check',
    label: 'Scope',
    color: 'text-cobalt bg-blue-50 hover:bg-blue-100 border-blue-100',
    message: '📋 **Scope check-in**\n\nCan you confirm the full scope of work you expect? I want to make sure we\'re aligned on what\'s included before we begin.',
  },
  {
    icon: 'fa-dollar-sign',
    label: 'Budget',
    color: 'text-green-700 bg-green-50 hover:bg-green-100 border-green-100',
    message: '💰 **Budget discussion**\n\nI\'d like to confirm the final budget for this project. Based on the scope, I\'m proposing: [add your amount]. Does that work for you?',
  },
  {
    icon: 'fa-calendar-days',
    label: 'Timeline',
    color: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-100',
    message: '📅 **Timeline**\n\nLet\'s agree on delivery dates. I can have the work completed by: [add date]. Does that fit your schedule?',
  },
  {
    icon: 'fa-box-open',
    label: 'Deliverables',
    color: 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-100',
    message: '📦 **Deliverables**\n\nHere\'s what I\'ll deliver:\n- [Item 1]\n- [Item 2]\n- [Item 3]\n\nPlease confirm these match what you need.',
  },
  {
    icon: 'fa-rotate-left',
    label: 'Revisions',
    color: 'text-orange-700 bg-orange-50 hover:bg-orange-100 border-orange-100',
    message: '🔄 **Revision policy**\n\nI\'d like to propose [N] rounds of revisions included in the price. Additional revisions would be charged at [rate]. Does that work?',
  },
];

// ── Project Context Panel ─────────────────────────────────────────────────────
function ProjectPanel({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [job, setJob] = useState<JobPostItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobs.getById(jobId)
      .then(setJob)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  return (
    <div className="w-72 border-l border-gray-200 bg-gray-50 flex flex-col overflow-y-auto flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <span className="font-bold text-gray-900 text-sm">Project Details</span>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
          <i className="fa-solid fa-xmark text-xs"></i>
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-3 border-cobalt border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !job ? (
        <p className="text-sm text-gray-400 text-center py-8 px-4">Project details not available.</p>
      ) : (
        <div className="p-4 space-y-4 text-sm">
          <div>
            <p className="font-bold text-gray-900 text-base leading-tight">{job.title}</p>
            <p className="text-xs text-cobalt mt-0.5">{job.department}</p>
          </div>

          {[
            {
              icon: 'fa-list-check', label: 'Scope', color: 'text-cobalt',
              value: job.description?.slice(0, 150) + (job.description && job.description.length > 150 ? '…' : ''),
            },
            {
              icon: 'fa-dollar-sign', label: 'Budget', color: 'text-green-600',
              value: job.budget_type === 'negotiable' ? 'Negotiable' :
                     job.budget?.min && job.budget?.max ? `$${job.budget.min.toLocaleString()}–$${job.budget.max.toLocaleString()}` :
                     job.budget?.min ? `From $${job.budget.min.toLocaleString()}` :
                     'Not specified',
            },
            {
              icon: 'fa-calendar-days', label: 'Timeline', color: 'text-amber-600',
              value: (job as unknown as {duration?: string}).duration || 'Not specified',
            },
            {
              icon: 'fa-box-open', label: 'Deliverables', color: 'text-purple-600',
              value: (job as unknown as {deliverables?: string[]}).deliverables?.join(', ') || 'See description',
            },
          ].map(({ icon, label, color, value }) => (
            <div key={label} className="bg-white rounded-xl p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-1.5">
                <i className={`fa-solid ${icon} ${color} text-xs w-4 text-center`}></i>
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</span>
              </div>
              <p className="text-gray-700 text-xs leading-relaxed">{value || '—'}</p>
            </div>
          ))}

          {job.skills && job.skills.length > 0 && (
            <div className="bg-white rounded-xl p-3 border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Required Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 bg-blue-50 text-cobalt rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          <Link href={`/client/projects/${jobId}`}
            className="block text-center py-2 text-xs font-semibold text-cobalt border border-cobalt rounded-xl hover:bg-blue-50 transition">
            Open Full Project
          </Link>
        </div>
      )}
    </div>
  );
}

function ClientMessagingPageInner() {
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');

  const [myId, setMyId] = useState('');
  const [convos, setConvos] = useState<ConversationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<MessageItem[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [creatingConvo, setCreatingConvo] = useState(false);
  const [showProjectPanel, setShowProjectPanel] = useState(false);
  const [sendingAgreement, setSendingAgreement] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const targetHandledRef = useRef(false);
  selectedIdRef.current = selectedId;

  useEffect(() => {
    auth.me().then(u => setMyId(u.id)).catch(() => {});
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await messaging.listConversations({ limit: 50 });
      setConvos(res.conversations);
      if (!selectedIdRef.current && !targetUserId && res.conversations.length > 0) {
        setSelectedId(res.conversations[0].id);
      }
    } catch { /* silent */ }
    finally { setLoadingConvos(false); }
  }, [targetUserId]);

  useEffect(() => {
    if (!targetUserId || targetHandledRef.current || loadingConvos || !myId) return;
    if (targetUserId === myId) return;
    const existing = convos.find(c => c.participants.some(p => p.user_id === targetUserId));
    if (existing) {
      targetHandledRef.current = true;
      setSelectedId(existing.id);
      setConvos(prev => prev.map(c => c.id === existing.id ? { ...c, unread_count: 0 } : c));
      return;
    }
    targetHandledRef.current = true;
    setCreatingConvo(true);
    messaging.createConversation([targetUserId])
      .then(newConvo => { setConvos(prev => [newConvo, ...prev]); setSelectedId(newConvo.id); })
      .catch(() => { if (convos.length > 0) setSelectedId(convos[0].id); })
      .finally(() => setCreatingConvo(false));
  }, [targetUserId, loadingConvos, myId, convos]);

  useEffect(() => {
    loadConversations();
    const t = setInterval(loadConversations, 15000);
    return () => clearInterval(t);
  }, [loadConversations]);

  const pollMessages = useCallback(async () => {
    const id = selectedIdRef.current;
    if (!id) return;
    try {
      const res = await messaging.getMessages(id, { limit: 50 });
      setMsgs(res.messages);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingMsgs(true);
    messaging.getMessages(selectedId, { limit: 50 })
      .then(res => setMsgs(res.messages))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
    messaging.markAsRead(selectedId).catch(() => {});
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(pollMessages, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedId, pollMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  const handleSelectConvo = (id: string) => {
    setSelectedId(id);
    setConvos(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
    setShowProjectPanel(false);
  };

  const handleSend = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || !selectedId || sending) return;
    if (!text) setInput('');
    setSending(true);
    const tmp: MessageItem = {
      id: `tmp-${Date.now()}`, conversation_id: selectedId, sender_id: myId,
      content, attachments: [], sent_at: new Date().toISOString(),
      is_deleted: false, read_by: [], message_type: 'text',
    };
    setMsgs(prev => [...prev, tmp]);
    try {
      const sent = await messaging.send(selectedId, content);
      setMsgs(prev => prev.map(m => m.id === tmp.id ? sent : m));
      setConvos(prev => prev.map(c => c.id === selectedId
        ? { ...c, last_message: content, last_message_at: sent.sent_at } : c));
    } catch {
      setMsgs(prev => prev.filter(m => m.id !== tmp.id));
      if (!text) setInput(content);
    } finally {
      setSending(false);
    }
  };

  const sendAgreement = async () => {
    if (!selectedId || sendingAgreement) return;
    setSendingAgreement(true);
    const msg = [
      '✅ **Agreement Proposal**',
      '',
      'I\'d like to formally agree on the following terms before work begins:',
      '',
      '• **Scope:** As described in the project brief',
      '• **Budget:** As discussed in this conversation',
      '• **Timeline:** As discussed in this conversation',
      '• **Deliverables:** As listed in the project',
      '• **Revisions:** As agreed in this conversation',
      '',
      'Please reply **"I agree"** to confirm you\'re ready to begin.',
    ].join('\n');
    await handleSend(msg);
    setSendingAgreement(false);
  };

  const selectedConvo = convos.find(c => c.id === selectedId);
  const other = selectedConvo && myId ? otherOf(selectedConvo, myId) : selectedConvo?.participants[0];

  const filteredConvos = search.trim()
    ? convos.filter(c => {
        const op = myId ? otherOf(c, myId) : c.participants[0];
        const q = search.toLowerCase();
        return displayName(op).toLowerCase().includes(q) ||
          (c.last_message || '').toLowerCase().includes(q) ||
          (c.job_title || '').toLowerCase().includes(q);
      })
    : convos;

  return (
    <div className="msg-layout h-[calc(100vh-8rem)] flex rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">

      {/* ── Conversation list ── */}
      <div className={`msg-sidebar w-80 border-r border-gray-200 flex flex-col flex-shrink-0 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Messages</h2>
            <Link href="/client/collaborators"
              className="flex items-center gap-1.5 text-xs font-semibold text-cobalt bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
              title="Find a creator to message">
              <i className="fa-solid fa-plus text-xs"></i>New
            </Link>
          </div>
          <div className="relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input type="text" placeholder="Search conversations…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cobalt" />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {(loadingConvos || creatingConvo) ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-3 border-cobalt border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConvos.length === 0 ? (
            <div className="p-8 text-center">
              <i className="fa-solid fa-comments text-3xl text-gray-200 mb-3 block"></i>
              <p className="text-sm text-gray-400">{search ? 'No results' : 'No conversations yet'}</p>
              <Link href="/client/collaborators" className="mt-3 inline-block text-xs text-cobalt font-semibold hover:underline">Find a creator →</Link>
            </div>
          ) : filteredConvos.map(c => {
            const op = myId ? otherOf(c, myId) : c.participants[0];
            const name = displayName(op);
            return (
              <button key={c.id} onClick={() => handleSelectConvo(c.id)}
                className={`w-full flex items-start gap-3 p-4 border-b border-gray-100 hover:bg-gray-50 transition text-left ${
                  selectedId === c.id ? 'bg-blue-50 border-l-2 border-l-cobalt' : ''
                }`}>
                <div className="relative flex-shrink-0">
                  <Avatar url={op?.avatar_url} name={name} size="md" />
                  {op?.is_online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-gray-900 text-sm truncate">{name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{relTime(c.last_message_at)}</span>
                  </div>
                  {c.job_title && <p className="text-xs text-cobalt font-medium mb-0.5 truncate">{c.job_title}</p>}
                  <p className="text-xs text-gray-500 truncate">{c.last_message || 'No messages yet'}</p>
                </div>
                {c.unread_count > 0 && (
                  <span className="w-5 h-5 bg-cobalt text-white text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-1">
                    {c.unread_count > 9 ? '9+' : c.unread_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className={`msg-chat flex-1 flex flex-col min-w-0 ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
        {!selectedConvo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <i className="fa-solid fa-comments text-cobalt text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Select a conversation</h3>
            <p className="text-gray-400 text-sm">Choose from the left to start messaging.</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 md:px-5 py-3.5 border-b border-gray-200 bg-white">
              <button onClick={() => setSelectedId(null)}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 transition -ml-1">
                <i className="fa-solid fa-arrow-left" />
              </button>
              <div className="relative">
                <Avatar url={other?.avatar_url} name={displayName(other)} size="lg" />
                {other?.is_online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 truncate">{displayName(other)}</p>
                {selectedConvo.job_title && (
                  <p className="text-xs text-cobalt font-medium truncate">{selectedConvo.job_title}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedConvo.job_id && (
                  <button onClick={() => setShowProjectPanel(v => !v)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                      showProjectPanel
                        ? 'bg-cobalt text-white border-cobalt'
                        : 'text-cobalt border-cobalt hover:bg-blue-50'
                    }`}>
                    <i className="fa-solid fa-file-lines mr-1.5"></i>Project
                  </button>
                )}
              </div>
            </div>

            {/* Negotiation topic quick-send */}
            {selectedConvo.job_id && (
              <div className="px-4 py-2.5 bg-white border-b border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-xs text-gray-400 font-medium flex-shrink-0">Discuss:</span>
                {TOPIC_TEMPLATES.map(t => (
                  <button key={t.label} onClick={() => setInput(t.message)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition flex-shrink-0 ${t.color}`}>
                    <i className={`fa-solid ${t.icon} text-[10px]`}></i>{t.label}
                  </button>
                ))}
                <button onClick={sendAgreement} disabled={sendingAgreement}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition flex-shrink-0 disabled:opacity-60 ml-auto">
                  <i className="fa-solid fa-handshake text-[10px]"></i>
                  {sendingAgreement ? 'Sending…' : 'Agree to Terms'}
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
              {loadingMsgs ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
                </div>
              ) : msgs.filter(m => !m.is_deleted).map(m => {
                const isMe = m.sender_id === myId;
                // Detect agreement message (starts with ✅)
                const isAgreement = m.content.startsWith('✅');
                return (
                  <div key={m.id} className={`flex items-end gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    {!isMe && <Avatar url={other?.avatar_url} name={displayName(other)} size="sm" />}
                    <div className={`max-w-md ${isAgreement ? 'w-full max-w-sm' : ''}`}>
                      {isAgreement ? (
                        <div className={`rounded-2xl border-2 p-4 ${isMe ? 'border-emerald-300 bg-emerald-50' : 'border-emerald-200 bg-white'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <i className="fa-solid fa-handshake text-emerald-600"></i>
                            <span className="font-bold text-emerald-800 text-sm">Agreement Proposal</span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{m.content.split('\n').slice(2).join('\n')}</p>
                          <p className="text-xs text-gray-400 mt-2">{msgTime(m.sent_at)}</p>
                        </div>
                      ) : (
                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          isMe ? 'bg-cobalt text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200 shadow-sm'
                        }`}>
                          <span className="whitespace-pre-line">{m.content}</span>
                          {m.attachments.length > 0 && m.attachments.map(a => (
                            <div key={a.id} className={`mt-2 flex items-center gap-2 text-xs p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-gray-100'}`}>
                              <i className="fa-solid fa-paperclip"></i>
                              <a href={a.file_url} target="_blank" rel="noreferrer" className="font-medium hover:underline truncate">{a.filename}</a>
                            </div>
                          ))}
                          <p className={`text-xs mt-1.5 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>{msgTime(m.sent_at)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-5 py-4 bg-white border-t border-gray-200">
              <div className="flex items-end gap-3 bg-gray-50 rounded-2xl border border-gray-200 p-3">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                  rows={input.split('\n').length > 2 ? Math.min(input.split('\n').length, 6) : 1}
                  className="flex-1 bg-transparent text-sm text-gray-900 outline-none resize-none placeholder-gray-400 leading-relaxed"
                />
                <button onClick={() => handleSend()} disabled={!input.trim() || sending}
                  className={`p-2.5 rounded-xl transition ${
                    input.trim() && !sending ? 'bg-cobalt text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}>
                  <i className="fa-solid fa-paper-plane text-sm"></i>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Project panel (slides in from right) ── */}
      {showProjectPanel && selectedConvo?.job_id && (
        <ProjectPanel jobId={selectedConvo.job_id} onClose={() => setShowProjectPanel(false)} />
      )}
    </div>
  );
}

export default function ClientMessagingPage() {
  return (
    <Suspense fallback={<div className="h-[calc(100vh-8rem)] flex items-center justify-center"><div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" /></div>}>
      <ClientMessagingPageInner />
    </Suspense>
  );
}
