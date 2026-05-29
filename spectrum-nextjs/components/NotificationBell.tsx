'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { notifications as notifApi, NotificationItem } from '@/lib/api';

const TYPE_ICON: Record<string, string> = {
  message:      'fa-comment',
  proposal:     'fa-file-lines',
  payment:      'fa-wallet',
  review:       'fa-star',
  connection:   'fa-user-plus',
  team_invite:  'fa-users',
  system:       'fa-bell',
  order:        'fa-briefcase',
};

const CATEGORY_COLOR: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-600',
  warning: 'bg-amber-100 text-amber-600',
  alert:   'bg-red-100 text-red-600',
  info:    'bg-blue-100 text-cobalt',
};

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Poll unread count every 30s
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await notifApi.getAll(1);
        setUnread(res.unread_count);
      } catch { /* silent */ }
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => clearInterval(t);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const res = await notifApi.getAll(20);
      setItems(res.notifications);
      setUnread(res.unread_count);
      setFetched(true);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [fetched]);

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await notifApi.markAllRead();
      setItems(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch { /* silent */ }
  };

  const handleMarkOne = async (id: string) => {
    try {
      await notifApi.markOneRead(id);
      setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className={`relative p-2.5 rounded-xl transition-all ${
          open ? 'text-cobalt bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        }`}
        title="Notifications"
      >
        <i className="fa-solid fa-bell text-[18px]"></i>
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              {unread > 0 && (
                <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">{unread}</span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-cobalt font-semibold hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-3 border-cobalt border-t-transparent rounded-full animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <i className="fa-solid fa-bell-slash text-gray-400 text-lg"></i>
                </div>
                <p className="text-sm font-medium text-gray-500">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">We'll notify you when something happens.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {items.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3.5 transition hover:bg-gray-50 ${n.is_read ? 'opacity-70' : ''}`}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${CATEGORY_COLOR[n.category] ?? 'bg-blue-100 text-cobalt'}`}>
                      <i className={`fa-solid ${TYPE_ICON[n.type] ?? 'fa-bell'} text-sm`}></i>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${n.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-gray-400">{timeAgo(n.created_at)}</span>
                        {n.action_url && (
                          <Link
                            href={n.action_url}
                            onClick={() => { handleMarkOne(n.id); setOpen(false); }}
                            className="text-xs text-cobalt font-semibold hover:underline"
                          >
                            {n.action_text || 'View'}
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkOne(n.id)}
                        className="w-2 h-2 bg-cobalt rounded-full flex-shrink-0 mt-2 hover:bg-blue-700 transition"
                        title="Mark as read"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 text-center">
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-gray-500 hover:text-cobalt font-semibold transition"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
