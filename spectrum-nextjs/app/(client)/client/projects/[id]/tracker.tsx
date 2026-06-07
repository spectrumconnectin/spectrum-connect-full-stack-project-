'use client';

import { useState, useEffect } from 'react';
import { escrow, messaging, EscrowMilestone, ConversationItem, MessageItem, EscrowDetail } from '@/lib/api';

interface TrackerItem {
  id: string;
  type: 'milestone' | 'message' | 'file';
  timestamp: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  status?: string;
  amount?: number;
  sender?: { id: string; name: string };
  avatar?: string;
}

interface ProjectTrackerProps {
  projectId: string;
}

export default function ProjectTracker({ projectId }: ProjectTrackerProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'milestones' | 'messages' | 'files'>('all');
  const [items, setItems] = useState<TrackerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [milestoneCounts, setMilestoneCounts] = useState({ total: 0, funded: 0, released: 0 });
  const [messageCounts, setMessageCounts] = useState({ total: 0, files: 0 });

  useEffect(() => {
    loadTrackerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadTrackerData = async () => {
    setLoading(true);
    setError(null);
    const trackerItems: TrackerItem[] = [];

    try {
      // 1. Load escrow with milestones
      const escrowRes = await escrow.list();
      const projectEscrow = escrowRes.escrows.find((e) => e.project_id === projectId);

      if (projectEscrow) {
        const escrowDetail = await escrow.getById(projectEscrow.escrow_id);
        loadMilestonesIntoTracker(escrowDetail, trackerItems);
      }

      // 2. Load conversations for this project
      const convRes = await messaging.listConversations();
      const projectConversations = convRes.conversations.filter((c) => c.job_id === projectId);

      let totalFiles = 0;
      for (const conv of projectConversations) {
        const msgRes = await messaging.getMessages(conv.id, { limit: 100 });
        loadMessagesIntoTracker(msgRes.messages, trackerItems, conv);
        totalFiles += msgRes.messages.reduce((sum, m) => sum + m.attachments.length, 0);
      }

      // Sort by timestamp descending
      trackerItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setItems(trackerItems);
      setMilestoneCounts({
        total: trackerItems.filter((i) => i.type === 'milestone').length,
        funded: trackerItems.filter((i) => i.type === 'milestone' && i.status === 'funded').length,
        released: trackerItems.filter((i) => i.type === 'milestone' && i.status === 'released').length,
      });
      setMessageCounts({
        total: trackerItems.filter((i) => i.type === 'message').length,
        files: trackerItems.filter((i) => i.type === 'file').length,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadMilestonesIntoTracker = (escrowDetail: EscrowDetail, items: TrackerItem[]) => {
    escrowDetail.milestones.forEach((m: EscrowMilestone) => {
      items.push({
        id: m.milestone_id,
        type: 'milestone',
        timestamp: m.funded_at || m.released_at || new Date().toISOString(),
        title: m.title,
        description: `$${m.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        status: m.status,
        amount: m.amount,
        metadata: { status_changes: m },
      });
    });
  };

  const loadMessagesIntoTracker = (messages: MessageItem[], items: TrackerItem[], conv: ConversationItem) => {
    messages.forEach((msg) => {
      // Add message itself
      items.push({
        id: msg.id,
        type: 'message',
        timestamp: msg.sent_at,
        title: msg.content.substring(0, 100),
        description: msg.content.length > 100 ? `…${msg.content.length} chars` : undefined,
        sender: { id: msg.sender_id, name: 'User' },
        metadata: { conversation_id: conv.id, sender_id: msg.sender_id },
      });

      // Add file attachments as separate items
      msg.attachments.forEach((file) => {
        items.push({
          id: `${msg.id}-${file.id}`,
          type: 'file',
          timestamp: file.uploaded_at,
          title: file.filename,
          description: `${(file.file_size / 1024).toFixed(1)} KB`,
          metadata: {
            file_type: file.file_type,
            file_url: file.file_url,
            uploaded_by: file.uploaded_by,
          },
        });
      });
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'milestone':
        return 'fa-flag';
      case 'message':
        return 'fa-comment';
      case 'file':
        return 'fa-file';
      default:
        return 'fa-circle';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'milestone':
        return 'bg-purple-100 text-purple-700';
      case 'message':
        return 'bg-blue-100 text-blue-700';
      case 'file':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'funded':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'released':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'disputed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'refunded':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'milestones' && item.type === 'milestone') return true;
    if (activeTab === 'messages' && item.type === 'message') return true;
    if (activeTab === 'files' && item.type === 'file') return true;
    return false;
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Project Activity</h2>
        <button onClick={loadTrackerData} className="text-gray-500 hover:text-gray-700 text-sm">
          <i className="fa-solid fa-arrows-rotate"></i> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'all' as const, label: 'All Activity', count: null },
          { key: 'milestones' as const, label: 'Milestones', count: milestoneCounts.total },
          { key: 'messages' as const, label: 'Messages', count: messageCounts.total },
          { key: 'files' as const, label: 'Files', count: messageCounts.files },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === tab.key
                ? 'text-cobalt border-cobalt'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className="ml-2 text-xs bg-gray-200 text-gray-700 rounded-full px-2 py-0.5">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <i className="fa-solid fa-spinner animate-spin mr-2"></i> Loading activity…
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">
          <i className="fa-solid fa-exclamation-circle mb-2 block text-2xl"></i>
          <p className="text-sm">{error}</p>
          <button
            onClick={loadTrackerData}
            className="mt-4 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition"
          >
            Try again
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <i className="fa-solid fa-inbox text-3xl mb-3 block"></i>
          <p className="text-sm">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item, idx) => (
            <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
              {/* Timeline dot and line */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${getTypeColor(item.type)}`}
                >
                  <i className={`fa-solid ${getTypeIcon(item.type)}`}></i>
                </div>
                {idx < filteredItems.length - 1 && (
                  <div className="w-0.5 h-12 bg-gray-200 mt-2"></div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate text-sm">{item.title}</h4>
                    {item.description && (
                      <p className="text-xs text-gray-600 mt-0.5 truncate">{item.description}</p>
                    )}
                  </div>
                  {item.amount && (
                    <span className="text-sm font-semibold text-green-700 flex-shrink-0">
                      ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <span className="text-xs text-gray-500">{formatDate(item.timestamp)}</span>
                  {item.status && (
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusBadgeColor(item.status)}`}
                    >
                      {item.status}
                    </span>
                  )}
                  {item.type === 'file' && item.metadata && 'file_url' in item.metadata && (
                    <a
                      href={String(item.metadata.file_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cobalt hover:underline font-medium"
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
