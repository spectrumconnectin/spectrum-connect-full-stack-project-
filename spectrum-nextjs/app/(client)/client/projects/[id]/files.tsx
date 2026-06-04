'use client';

import { useState, useEffect } from 'react';
import { messaging, MessageItem } from '@/lib/api';

interface ProjectFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
  conversationId?: string;
  category: 'deliverable' | 'reference' | 'brief' | 'other';
}

interface FileShareProps {
  projectId: string;
}

export default function FileShare({ projectId }: FileShareProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'deliverable' | 'reference' | 'brief' | 'other'>('all');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadProjectFiles();
  }, [projectId]);

  const loadProjectFiles = async () => {
    setLoading(true);
    setError(null);
    const allFiles: ProjectFile[] = [];

    try {
      // Fetch conversations for this project
      const convRes = await messaging.listConversations();
      const projectConversations = convRes.conversations.filter((c) => c.job_id === projectId);

      // Load all messages and extract files
      for (const conv of projectConversations) {
        const msgRes = await messaging.getMessages(conv.id, { limit: 100 });
        msgRes.messages.forEach((msg: MessageItem) => {
          msg.attachments.forEach((file) => {
            allFiles.push({
              id: file.id,
              name: file.filename,
              size: file.file_size,
              type: file.file_type,
              url: file.file_url,
              uploadedBy: file.uploaded_by,
              uploadedAt: file.uploaded_at,
              conversationId: conv.id,
              category: categorizeFile(file.filename, file.file_type),
            });
          });
        });
      }

      // Sort by upload date (newest first)
      allFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      setFiles(allFiles);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const categorizeFile = (filename: string, mimeType: string): ProjectFile['category'] => {
    const lower = filename.toLowerCase();
    if (lower.includes('brief') || lower.includes('requirements') || lower.includes('spec')) {
      return 'brief';
    }
    if (lower.includes('reference') || lower.includes('example') || lower.includes('inspiration')) {
      return 'reference';
    }
    if (
      mimeType.includes('video') ||
      mimeType.includes('audio') ||
      lower.includes('final') ||
      lower.includes('deliverable') ||
      lower.includes('export')
    ) {
      return 'deliverable';
    }
    return 'other';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.currentTarget.files;
    if (!selectedFiles) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // For now, we'll just show a placeholder
      // In a real implementation, we'd send these to the server
      // and update the conversation with file attachments
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setUploadProgress(100);

      // Reset after successful upload
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        e.currentTarget.value = '';
        loadProjectFiles();
      }, 500);
    } catch (err) {
      setError((err as Error).message);
      setUploading(false);
    }
  };

  const filteredFiles = files.filter((f) => activeCategory === 'all' || f.category === activeCategory);

  const getCategoryIcon = (category: ProjectFile['category']) => {
    switch (category) {
      case 'deliverable':
        return 'fa-file-video';
      case 'reference':
        return 'fa-lightbulb';
      case 'brief':
        return 'fa-document';
      default:
        return 'fa-file';
    }
  };

  const getCategoryColor = (category: ProjectFile['category']) => {
    switch (category) {
      case 'deliverable':
        return 'bg-green-100 text-green-700';
      case 'reference':
        return 'bg-purple-100 text-purple-700';
      case 'brief':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Project Files</h2>
        <label className="cursor-pointer">
          <input type="file" multiple onChange={handleFileUpload} disabled={uploading} className="hidden" accept="*/*" />
          <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
            <i className="fa-solid fa-cloud-arrow-up"></i>
            {uploading ? `Uploading (${uploadProgress}%)...` : 'Upload Files'}
          </span>
        </label>
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div className="mb-6 bg-gray-100 rounded-full h-2 overflow-hidden">
          <div className="bg-cobalt h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(
          [
            { key: 'all' as const, label: 'All Files' },
            { key: 'deliverable' as const, label: '📦 Deliverables' },
            { key: 'reference' as const, label: '💡 References' },
            { key: 'brief' as const, label: '📋 Briefs' },
            { key: 'other' as const, label: 'Other' },
          ] as const
        ).map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              activeCategory === cat.key
                ? 'bg-cobalt text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label}
            {cat.key !== 'all' && (
              <span className="ml-2 text-xs opacity-75">
                ({files.filter((f) => f.category === cat.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <i className="fa-solid fa-spinner animate-spin mr-2"></i> Loading files…
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">
          <i className="fa-solid fa-exclamation-circle mb-2 block text-2xl"></i>
          <p className="text-sm">{error}</p>
          <button
            onClick={loadProjectFiles}
            className="mt-4 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition"
          >
            Try again
          </button>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <i className="fa-solid fa-inbox text-3xl mb-3 block"></i>
          <p className="text-sm font-medium">No files yet</p>
          <p className="text-xs mt-1">Upload files to organize project deliverables and references</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition group"
            >
              {/* File icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getCategoryColor(file.category)}`}>
                <i className={`fa-solid ${getCategoryIcon(file.category)}`}></i>
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 text-sm truncate">{file.name}</h4>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span>{formatDate(file.uploadedAt)}</span>
                  {file.uploadedByName && (
                    <>
                      <span>•</span>
                      <span>by {file.uploadedByName}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Category badge */}
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${getCategoryColor(file.category)}`}>
                {file.category}
              </span>

              {/* Actions */}
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <a
                  href={file.url}
                  download={file.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-cobalt hover:border-cobalt transition text-sm"
                  title="Download"
                >
                  <i className="fa-solid fa-download"></i>
                </a>
                <button
                  onClick={() => {
                    if (file.url) {
                      window.open(file.url, '_blank');
                    }
                  }}
                  className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-cobalt hover:border-cobalt transition text-sm"
                  title="Open"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info footer */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-xs text-blue-700">
          <i className="fa-solid fa-info-circle mr-2"></i>
          Files are shared with all project participants. Organize files with clear names to help your team find what they need.
        </p>
      </div>
    </div>
  );
}
