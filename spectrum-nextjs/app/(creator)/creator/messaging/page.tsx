'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { messaging, ConversationItem, MessageItem, auth } from '@/lib/api';

function relTime(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function msgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function otherOf(convo: ConversationItem, myId: string): ConversationItem['participants'][number] | undefined {
  return convo.participants.find(p => p.user_id !== myId) ?? convo.participants[0];
}

function displayName(p?: ConversationItem['participants'][number]): string {
  if (!p) return 'Unknown';
  return p.display_name || p.username;
}

function Avatar({ url, name, size = 10 }: { url?: string; name: string; size?: number }) {
  const px = size * 4;
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt={name} style={{ width: px, height: px }} className="rounded-full object-cover flex-shrink-0" />;
  return (
    <div style={{ width: px, height: px, fontSize: Math.max(px * 0.38, 11) }}
      className="rounded-full bg-blue-100 flex items-center justify-center text-cobalt font-bold flex-shrink-0">
      {name[0]?.toUpperCase()}
    </div>
  );
}

function CreatorMessagingPageInner() {
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
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [creatingConvo, setCreatingConvo] = useState(false);

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
    } catch {
      // silent
    } finally {
      setLoadingConvos(false);
    }
  }, [targetUserId]);

  // When ?userId is present, find or create conversation with that user
  useEffect(() => {
    if (!targetUserId || targetHandledRef.current || loadingConvos || !myId) return;
    if (targetUserId === myId) return;

    const existing = convos.find(c =>
      c.participants.some(p => p.user_id === targetUserId)
    );

    if (existing) {
      targetHandledRef.current = true;
      setSelectedId(existing.id);
      setConvos(prev => prev.map(c => c.id === existing.id ? { ...c, unread_count: 0 } : c));
      return;
    }

    // No existing conversation — create one
    targetHandledRef.current = true;
    setCreatingConvo(true);
    messaging.createConversation([targetUserId])
      .then(newConvo => {
        setConvos(prev => [newConvo, ...prev]);
        setSelectedId(newConvo.id);
      })
      .catch(() => {
        if (convos.length > 0) setSelectedId(convos[0].id);
      })
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
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedId || sending) return;
    setInput('');
    setSending(true);
    const tmp: MessageItem = {
      id: `tmp-${Date.now()}`, conversation_id: selectedId, sender_id: myId,
      content: text, attachments: [], sent_at: new Date().toISOString(),
      is_deleted: false, read_by: [], message_type: 'text',
    };
    setMsgs(prev => [...prev, tmp]);
    try {
      const sent = await messaging.send(selectedId, text);
      setMsgs(prev => prev.map(m => m.id === tmp.id ? sent : m));
      setConvos(prev => prev.map(c => c.id === selectedId
        ? { ...c, last_message: text, last_message_at: sent.sent_at } : c));
    } catch {
      setMsgs(prev => prev.filter(m => m.id !== tmp.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const filteredConvos = convos
    .filter(c =>
      filter === 'Projects' ? !!c.job_id :
      filter === 'Teams' ? c.conversation_type === 'group' : true
    )
    .filter(c => {
      if (!search.trim()) return true;
      const op = myId ? otherOf(c, myId) : c.participants[0];
      const q = search.toLowerCase();
      return (
        displayName(op).toLowerCase().includes(q) ||
        (c.last_message || '').toLowerCase().includes(q) ||
        (c.job_title || '').toLowerCase().includes(q)
      );
    });

  const selectedConvo = convos.find(c => c.id === selectedId);
  const other = selectedConvo && myId ? otherOf(selectedConvo, myId) : selectedConvo?.participants[0];

  return (
    <div className="msg-layout h-[calc(100vh-64px-2rem)] flex -m-8 overflow-hidden">
      {/* Conversations list — hidden on mobile when chat open */}
      <section className={`msg-sidebar w-80 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col ${selectedConvo ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Messaging</h1>
          <div className="relative mb-3">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input type="text" placeholder="Search conversations…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cobalt" />
          </div>
          <div className="flex items-center gap-1">
            {['All', 'Projects', 'Teams'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${filter === f ? 'font-semibold text-cobalt bg-blue-50' : 'font-medium text-gray-600 hover:bg-gray-50'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {(loadingConvos || creatingConvo) ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-3 border-cobalt border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConvos.length === 0 ? (
            <div className="p-8 text-center">
              <i className="fa-solid fa-comments text-3xl text-gray-200 mb-3 block"></i>
              <p className="text-sm text-gray-400">{search ? 'No results found' : 'No conversations yet'}</p>
            </div>
          ) : filteredConvos.map(c => {
            const op = myId ? otherOf(c, myId) : c.participants[0];
            const name = displayName(op);
            return (
              <div key={c.id} onClick={() => handleSelectConvo(c.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition ${selectedId === c.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <Avatar url={op?.avatar_url} name={name} size={10} />
                    {op?.is_online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold text-gray-900 truncate">{name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{relTime(c.last_message_at)}</span>
                    </div>
                    {c.job_title && <p className="text-xs text-cobalt mb-0.5 truncate">{c.job_title}</p>}
                    <p className="text-sm text-gray-500 truncate">{c.last_message || 'No messages yet'}</p>
                    {c.unread_count > 0 && (
                      <div className="w-2 h-2 bg-cobalt rounded-full mt-1"></div>
                    )}
                  </div>
                  {c.unread_count > 0 && (
                    <span className="w-5 h-5 bg-cobalt text-white text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {c.unread_count > 9 ? '9+' : c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Chat area — hidden on mobile when no convo selected */}
      <section className={`msg-chat flex-1 flex flex-col min-w-0 ${!selectedConvo ? 'hidden md:flex' : 'flex'}`}>
        {!selectedConvo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <i className="fa-solid fa-comments text-cobalt text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Select a conversation</h3>
            <p className="text-gray-400 text-sm">Choose a conversation from the list to start messaging.</p>
          </div>
        ) : (
          <>
            {/* Header — back button on mobile */}
            <div className="bg-white border-b border-gray-200 p-4 md:p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedId(null)}
                  className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 transition -ml-1">
                  <i className="fa-solid fa-arrow-left" />
                </button>
                <div className="relative">
                  <Avatar url={other?.avatar_url} name={displayName(other)} size={12} />
                  {other?.is_online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{displayName(other)}</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {other?.is_online
                      ? <span className="text-green-600 font-medium">Online</span>
                      : <span>Last seen {relTime(other?.last_seen)}</span>
                    }
                    {selectedConvo.job_title && (
                      <><span className="text-gray-300">·</span>
                        <span className="text-cobalt font-semibold">{selectedConvo.job_title}</span></>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Negotiation topic quick-send (for project conversations) */}
            {selectedConvo.job_id && (
              <div className="px-4 py-2.5 bg-white border-b border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-xs text-gray-400 font-medium flex-shrink-0">Reply re:</span>
                {[
                  { icon: 'fa-list-check', label: 'Scope', color: 'text-cobalt bg-blue-50 hover:bg-blue-100 border-blue-100',
                    msg: '📋 **Re: Scope**\n\nJust to confirm my understanding of the scope:\n- [List what you understand the scope to be]\n\nPlease let me know if I\'ve missed anything.' },
                  { icon: 'fa-dollar-sign', label: 'Budget', color: 'text-green-700 bg-green-50 hover:bg-green-100 border-green-100',
                    msg: '💰 **Re: Budget**\n\nBased on the scope, my rate for this project would be: $[amount].\n\nThis includes: [what\'s covered]. Let me know if this works.' },
                  { icon: 'fa-calendar-days', label: 'Timeline', color: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-100',
                    msg: '📅 **Re: Timeline**\n\nI can deliver this project by: [date].\n\nMilestones:\n- [Stage 1]: [date]\n- [Final delivery]: [date]' },
                  { icon: 'fa-box-open', label: 'Deliverables', color: 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-100',
                    msg: '📦 **Re: Deliverables**\n\nHere\'s what I\'ll provide:\n- [File/asset 1]\n- [File/asset 2]\n\nAll files in: [formats]. Please confirm this is what you need.' },
                  { icon: 'fa-rotate-left', label: 'Revisions', color: 'text-orange-700 bg-orange-50 hover:bg-orange-100 border-orange-100',
                    msg: '🔄 **Re: Revisions**\n\nI include [N] revision rounds in my rate. Additional revisions are charged at [rate/hour]. Does that work for you?' },
                ].map(t => (
                  <button key={t.label} onClick={() => setInput(t.msg)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition flex-shrink-0 ${t.color}`}>
                    <i className={`fa-solid ${t.icon} text-[10px]`}></i>{t.label}
                  </button>
                ))}
                <button onClick={async () => {
                  const msg = '✅ **I agree to the terms**\n\nI\'m ready to begin work based on the scope, budget, timeline, deliverables, and revisions we\'ve discussed. Let\'s get started!';
                  setInput(msg);
                }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition flex-shrink-0 ml-auto">
                  <i className="fa-solid fa-check text-[10px]"></i>I Agree
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
                const isAgreement = m.content.startsWith('✅');
                return (
                  <div key={m.id} className={`flex items-end gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    {!isMe && <Avatar url={other?.avatar_url} name={displayName(other)} size={8} />}
                    <div className={`max-w-md ${isAgreement ? 'w-full max-w-sm' : ''}`}>
                      {isAgreement ? (
                        <div className={`rounded-2xl border-2 p-4 ${isMe ? 'border-emerald-300 bg-emerald-50' : 'border-emerald-200 bg-white'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <i className="fa-solid fa-handshake text-emerald-600"></i>
                            <span className="font-bold text-emerald-800 text-sm">
                              {m.content.includes('I agree to the terms') ? 'Agreement Confirmed' : 'Agreement Proposal'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{m.content.split('\n').slice(2).join('\n')}</p>
                          <p className="text-xs text-gray-400 mt-2">{msgTime(m.sent_at)}</p>
                        </div>
                      ) : (
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isMe
                            ? 'bg-cobalt text-white rounded-br-sm'
                            : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'}`}>
                            <span className="whitespace-pre-line">{m.content}</span>
                            {m.attachments.length > 0 && m.attachments.map(a => (
                              <div key={a.id} className={`mt-2 flex items-center gap-2 text-xs p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-gray-100'}`}>
                                <i className="fa-solid fa-paperclip"></i>
                                <a href={a.file_url} target="_blank" rel="noreferrer" className="font-medium hover:underline truncate">{a.filename}</a>
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-gray-400 mt-1">{msgTime(m.sent_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-end gap-3 bg-gray-50 rounded-2xl border border-gray-200 p-3">
                <textarea
                  placeholder="Type your message… (Enter to send, Shift+Enter for new line)"
                  rows={input.split('\n').length > 2 ? Math.min(input.split('\n').length, 6) : 1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  className="flex-1 bg-transparent text-sm text-gray-900 outline-none resize-none placeholder-gray-400 leading-relaxed"
                />
                <button onClick={handleSend} disabled={!input.trim() || sending}
                  className={`p-2.5 rounded-xl transition ${
                    input.trim() && !sending ? 'bg-cobalt text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}>
                  <i className="fa-solid fa-paper-plane text-sm"></i>
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Context panel */}
      <section className="msg-info w-72 bg-white border-l border-gray-200 p-6 flex-shrink-0 overflow-y-auto hidden lg:block">
        {selectedConvo ? (
          <div className="space-y-6">
            {selectedConvo.job_title && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Project</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-cobalt rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-briefcase text-white text-sm"></i>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{selectedConvo.job_title}</p>
                      <p className="text-xs text-gray-500 capitalize">{selectedConvo.conversation_type}</p>
                    </div>
                  </div>
                  {selectedConvo.job_id && (
                    <Link href={`/creator/projects/${selectedConvo.job_id}`}
                      className="mt-3 block text-center text-xs text-cobalt font-semibold hover:underline">
                      View project details →
                    </Link>
                  )}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">Participants</h3>
              <div className="space-y-3">
                {selectedConvo.participants.map(p => (
                  <div key={p.user_id} className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar url={p.avatar_url} name={displayName(p)} size={8} />
                      {p.is_online && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{displayName(p)}</p>
                      <p className="text-xs text-gray-400">{p.is_online ? 'Online' : `Last seen ${relTime(p.last_seen)}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">Trust &amp; Safety</h3>
              <div className="space-y-2">
                {[
                  ['fa-shield-check', 'Verified Profiles'],
                  ['fa-lock', 'Secure Messaging'],
                  ['fa-handshake', 'Protected Payments'],
                ].map(([icon, label]) => (
                  <div key={label} className="flex items-center gap-2">
                    <i className={`fa-solid ${icon} text-green-600 text-sm`}></i>
                    <span className="text-sm text-gray-700">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-300">
            <i className="fa-solid fa-info-circle text-3xl mb-3 block"></i>
            <p className="text-sm">Select a conversation to see details</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default function CreatorMessagingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" /></div>}>
      <CreatorMessagingPageInner />
    </Suspense>
  );
}
