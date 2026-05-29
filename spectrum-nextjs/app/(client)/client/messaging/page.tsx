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
  if (url) return <img src={url} alt={name} className={`${sz} rounded-full object-cover border-2 border-gray-200 flex-shrink-0`} />;
  return (
    <div className={`${sz} rounded-full bg-blue-100 flex items-center justify-center text-cobalt font-bold flex-shrink-0 border-2 border-gray-200 ${txt}`}>
      {name[0]?.toUpperCase()}
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
    if (targetUserId === myId) return; // can't message yourself

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
        // If creation fails, just select first conversation if any
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

  const selectedConvo = convos.find(c => c.id === selectedId);
  const other = selectedConvo && myId ? otherOf(selectedConvo, myId) : selectedConvo?.participants[0];

  const filteredConvos = search.trim()
    ? convos.filter(c => {
        const op = myId ? otherOf(c, myId) : c.participants[0];
        const q = search.toLowerCase();
        return (
          displayName(op).toLowerCase().includes(q) ||
          (c.last_message || '').toLowerCase().includes(q) ||
          (c.job_title || '').toLowerCase().includes(q)
        );
      })
    : convos;

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
      {/* Conversation list */}
      <div className="w-80 border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Messages</h2>
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
              <p className="text-sm text-gray-400">{search ? 'No results found' : 'No conversations yet'}</p>
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
                  {op?.is_online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-gray-900 text-sm truncate">{name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{relTime(c.last_message_at)}</span>
                  </div>
                  {c.job_title && (
                    <p className="text-xs text-cobalt font-medium mb-0.5 truncate">{c.job_title}</p>
                  )}
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

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedConvo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <i className="fa-solid fa-comments text-cobalt text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Select a conversation</h3>
            <p className="text-gray-400 text-sm">Choose a conversation from the left to start messaging.</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 bg-white">
              <div className="relative">
                <Avatar url={other?.avatar_url} name={displayName(other)} size="lg" />
                {other?.is_online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                )}
              </div>
              <div>
                <p className="font-bold text-gray-900">{displayName(other)}</p>
                <p className="text-xs text-gray-500">
                  {selectedConvo.job_title || (other?.is_online ? 'Online' : `Last seen ${relTime(other?.last_seen)}`)}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {selectedConvo.job_id && (
                  <Link href={`/client/projects/${selectedConvo.job_id}`}
                    className="px-3 py-1.5 text-xs font-semibold text-cobalt border border-cobalt rounded-lg hover:bg-blue-50 transition">
                    View Project
                  </Link>
                )}
                <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <i className="fa-solid fa-ellipsis text-gray-500"></i>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {loadingMsgs ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
                </div>
              ) : msgs.filter(m => !m.is_deleted).map(m => {
                const isMe = m.sender_id === myId;
                return (
                  <div key={m.id} className={`flex items-end gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    {!isMe && <Avatar url={other?.avatar_url} name={displayName(other)} size="sm" />}
                    <div className={`max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      isMe ? 'bg-cobalt text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200 shadow-sm'
                    }`}>
                      {m.content}
                      {m.attachments.length > 0 && m.attachments.map(a => (
                        <div key={a.id} className={`mt-2 flex items-center gap-2 text-xs p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-gray-100'}`}>
                          <i className="fa-solid fa-paperclip"></i>
                          <a href={a.file_url} target="_blank" rel="noreferrer" className="font-medium hover:underline truncate">{a.filename}</a>
                        </div>
                      ))}
                      <p className={`text-xs mt-1.5 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>{msgTime(m.sent_at)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 bg-white border-t border-gray-200">
              <div className="flex items-end gap-3 bg-gray-50 rounded-2xl border border-gray-200 p-3">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type your message… (Enter to send)"
                  rows={1}
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
      </div>
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
