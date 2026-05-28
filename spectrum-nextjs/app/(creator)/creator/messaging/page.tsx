'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { messaging, ConversationItem, MessageItem, auth } from '../../../../lib/api';

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
  if (url) return <img src={url} alt={name} style={{ width: px, height: px }} className="rounded-full object-cover flex-shrink-0" />;
  return (
    <div style={{ width: px, height: px, fontSize: Math.max(px * 0.38, 11) }}
      className="rounded-full bg-blue-100 flex items-center justify-center text-cobalt font-bold flex-shrink-0">
      {name[0]?.toUpperCase()}
    </div>
  );
}

export default function CreatorMessagingPage() {
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

  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  useEffect(() => {
    auth.me().then(u => setMyId(u.id)).catch(() => {});
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await messaging.listConversations({ limit: 50 });
      setConvos(res.conversations);
      if (!selectedIdRef.current && res.conversations.length > 0) {
        setSelectedId(res.conversations[0].id);
      }
    } catch {
      // silent
    } finally {
      setLoadingConvos(false);
    }
  }, []);

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
    <div className="h-[calc(100vh-64px-2rem)] flex -m-8 overflow-hidden">
      {/* Conversations list */}
      <section className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
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
          {loadingConvos ? (
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

      {/* Chat area */}
      <section className="flex-1 flex flex-col min-w-0">
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
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
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
              <div className="flex items-center gap-2">
                {selectedConvo.job_id && (
                  <Link href={`/creator/projects/${selectedConvo.job_id}`}
                    className="px-4 py-2 text-cobalt border border-cobalt rounded-lg text-sm font-semibold hover:bg-blue-50 transition">
                    View Project
                  </Link>
                )}
                <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
                  <i className="fa-solid fa-ellipsis-vertical"></i>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50">
              {loadingMsgs ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
                </div>
              ) : msgs.filter(m => !m.is_deleted).map(m => {
                const isMe = m.sender_id === myId;
                return (
                  <div key={m.id} className={`flex items-end gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    {!isMe && <Avatar url={other?.avatar_url} name={displayName(other)} size={8} />}
                    <div className={`max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isMe
                        ? 'bg-cobalt text-white rounded-br-sm'
                        : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'}`}>
                        {m.content}
                        {m.attachments.length > 0 && m.attachments.map(a => (
                          <div key={a.id} className={`mt-2 flex items-center gap-2 text-xs p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-gray-100'}`}>
                            <i className="fa-solid fa-paperclip"></i>
                            <a href={a.file_url} target="_blank" rel="noreferrer" className="font-medium hover:underline truncate">{a.filename}</a>
                          </div>
                        ))}
                      </div>
                      <span className={`text-xs text-gray-400 mt-1 ${isMe ? 'text-right' : ''}`}>{msgTime(m.sent_at)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    placeholder="Type your message… (Enter to send)"
                    rows={1}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:border-cobalt focus:outline-none text-sm"
                  />
                </div>
                <button onClick={handleSend} disabled={!input.trim() || sending}
                  className={`px-5 py-3 rounded-xl font-semibold transition ${
                    input.trim() && !sending ? 'bg-cobalt text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}>
                  <i className="fa-solid fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Context panel */}
      <section className="w-72 bg-white border-l border-gray-200 p-6 flex-shrink-0 overflow-y-auto">
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
