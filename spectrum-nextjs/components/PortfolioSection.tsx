'use client';

/**
 * PortfolioSection
 * ─────────────────
 * Shared component used in two modes:
 *   - editable=true  → creator profile (upload, edit, delete)
 *   - editable=false → client view (watch videos, view images, read descriptions)
 *
 * Limits (enforced by backend, mirrored here for UX):
 *   max 2 videos, max 3 images
 */

import { useState, useEffect, useRef } from 'react';
import { portfolio, PortfolioItem, PortfolioResponse } from '@/lib/api';

// ── helpers ──────────────────────────────────────────────────────────────────

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_\-]{11})/);
  return m ? m[1] : null;
}

function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function embedUrl(item: PortfolioItem): string | null {
  if (item.media_type === 'youtube') {
    const id = youtubeId(item.url);
    return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
  }
  if (item.media_type === 'vimeo') {
    const id = vimeoId(item.url);
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (item.media_type === 'mp4') return item.url;
  return null;
}

function classifyUrl(url: string): { type: 'video' | 'image' | null; media_type: string } {
  const u = url.trim().toLowerCase().split('?')[0];
  if (/youtube\.com\/watch|youtu\.be\//.test(url)) return { type: 'video', media_type: 'youtube' };
  if (/vimeo\.com\/\d+/.test(url)) return { type: 'video', media_type: 'vimeo' };
  if (u.endsWith('.mp4')) return { type: 'video', media_type: 'mp4' };
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return { type: 'image', media_type: 'jpg' };
  if (u.endsWith('.png')) return { type: 'image', media_type: 'png' };
  if (u.endsWith('.webp')) return { type: 'image', media_type: 'webp' };
  return { type: null, media_type: '' };
}

// ── sub-components ────────────────────────────────────────────────────────────

function VideoEmbed({ item }: { item: PortfolioItem }) {
  const embed = embedUrl(item);
  if (!embed) return null;

  if (item.media_type === 'mp4') {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        src={embed}
        controls
        className="w-full h-full object-cover rounded-t-xl"
        poster={item.thumbnail || undefined}
      />
    );
  }
  return (
    <iframe
      src={embed}
      className="w-full h-full rounded-t-xl"
      allowFullScreen
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      title={item.title}
    />
  );
}

function VideoCard({ item, editable, onEdit, onDelete }: {
  item: PortfolioItem;
  editable: boolean;
  onEdit: (item: PortfolioItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition">
      <div className="aspect-video bg-gray-900 relative">
        <VideoEmbed item={item} />
        {item.media_type !== 'mp4' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 hover:opacity-100 transition">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <i className="fa-solid fa-play text-white text-lg ml-1" />
            </div>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{item.title}</p>
            {item.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
            )}
            <span className="inline-flex items-center gap-1 mt-2 text-xs text-gray-400">
              <i className={`fa-brands fa-${item.media_type === 'mp4' ? 'film' : item.media_type} text-xs`} />
              {item.media_type.charAt(0).toUpperCase() + item.media_type.slice(1)}
            </span>
          </div>
          {editable && (
            <div className="flex gap-1 shrink-0">
              <button onClick={() => onEdit(item)}
                className="p-1.5 text-gray-400 hover:text-cobalt hover:bg-blue-50 rounded-lg transition">
                <i className="fa-solid fa-pen text-xs" />
              </button>
              <button onClick={() => onDelete(item.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                <i className="fa-solid fa-trash text-xs" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImageCard({ item, editable, onEdit, onDelete }: {
  item: PortfolioItem;
  editable: boolean;
  onEdit: (item: PortfolioItem) => void;
  onDelete: (id: string) => void;
}) {
  const [lightbox, setLightbox] = useState(false);
  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition">
        <div
          className="aspect-video bg-gray-100 relative cursor-pointer overflow-hidden"
          onClick={() => !editable && setLightbox(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.url}
            alt={item.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
          {!editable && (
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition flex items-center justify-center opacity-0 hover:opacity-100">
              <div className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center">
                <i className="fa-solid fa-expand text-gray-700 text-sm" />
              </div>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{item.title}</p>
              {item.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
              )}
              <span className="text-xs text-gray-400 mt-1 block uppercase">{item.media_type}</span>
            </div>
            {editable && (
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onEdit(item)}
                  className="p-1.5 text-gray-400 hover:text-cobalt hover:bg-blue-50 rounded-lg transition">
                  <i className="fa-solid fa-pen text-xs" />
                </button>
                <button onClick={() => onDelete(item.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                  <i className="fa-solid fa-trash text-xs" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.url}
            alt={item.title}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl"
          >
            <i className="fa-solid fa-xmark" />
          </button>
          <div className="absolute bottom-6 left-0 right-0 text-center">
            <p className="text-white font-semibold">{item.title}</p>
            {item.description && (
              <p className="text-white/70 text-sm mt-1">{item.description}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────

interface ModalProps {
  mode: 'add' | 'edit';
  item?: PortfolioItem;
  data: PortfolioResponse;
  onClose: () => void;
  onSaved: (updated: PortfolioResponse) => void;
}

function PortfolioModal({ mode, item, data, onClose, onSaved }: ModalProps) {
  const [url, setUrl] = useState(item?.url ?? '');
  const [title, setTitle] = useState(item?.title ?? '');
  const [desc, setDesc] = useState(item?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const urlInfo = url ? classifyUrl(url) : { type: null, media_type: '' };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Only JPG, PNG, and WEBP images are supported.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('files', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.spectrumconnect.co'}/upload/images`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      const json = await res.json();
      setUrl(json[0]?.url ?? '');
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (mode === 'add' && !url.trim()) { setError('URL or image is required.'); return; }

    if (mode === 'add') {
      const info = classifyUrl(url);
      if (!info.type) { setError('URL format not recognised. Paste a YouTube, Vimeo, or direct image URL.'); return; }
      if (info.type === 'video' && data.video_count >= data.max_videos) {
        setError(`You already have ${data.max_videos} videos. Delete one to add another.`); return;
      }
      if (info.type === 'image' && data.image_count >= data.max_images) {
        setError(`You already have ${data.max_images} images. Delete one to add another.`); return;
      }
    }

    setSaving(true); setError('');
    try {
      if (mode === 'add') {
        await portfolio.addItem({ url: url.trim(), title: title.trim(), description: desc.trim() || undefined });
      } else if (item) {
        await portfolio.updateItem(item.id, { title: title.trim(), description: desc.trim() || undefined });
      }
      const fresh = await portfolio.getMe();
      onSaved(fresh);
      onClose();
    } catch (e) {
      setError((e as Error).message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">
            {mode === 'add' ? 'Add Portfolio Item' : 'Edit Portfolio Item'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <i className="fa-solid fa-xmark text-xl" />
          </button>
        </div>

        {mode === 'add' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL <span className="text-gray-400 font-normal">(YouTube, Vimeo, or direct image URL)</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setError(''); }}
              placeholder="https://youtube.com/watch?v=… or https://…/image.jpg"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt focus:border-transparent"
            />
            <div className="flex items-center gap-3 mt-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">or upload an image</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-cobalt hover:text-cobalt transition disabled:opacity-50"
            >
              {uploading
                ? <><i className="fa-solid fa-spinner fa-spin" /> Uploading…</>
                : <><i className="fa-solid fa-cloud-arrow-up" /> Upload JPG, PNG, or WEBP</>}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => handleImageUpload(e.target.files)}
            />
            {url && urlInfo.type && (
              <p className="mt-2 text-xs text-green-600">
                <i className="fa-solid fa-circle-check mr-1" />
                Detected: {urlInfo.type} ({urlInfo.media_type})
              </p>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Title <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g. Brand video for Acme Corp"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt focus:border-transparent"
          />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Briefly describe the project, your role, tools used…"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{desc.length}/500</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            <i className="fa-solid fa-circle-exclamation mr-2" />{error}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-3 rounded-xl bg-cobalt text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60"
          >
            {saving ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Saving…</> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface PortfolioSectionProps {
  /** When true, shows add/edit/delete controls (creator view).
   *  When false, shows read-only display (client view). */
  editable?: boolean;
  /** Pre-fetched data. If not provided (editable mode), fetches from API. */
  initialData?: PortfolioResponse;
  /** User ID — required for public (non-editable) view. */
  userId?: string;
}

export default function PortfolioSection({
  editable = false,
  initialData,
  userId,
}: PortfolioSectionProps) {
  const [data, setData] = useState<PortfolioResponse | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: PortfolioItem } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Fetch on mount if no initialData was passed in
  useEffect(() => {
    if (initialData) { setLoading(false); return; }
    const fetcher = editable ? portfolio.getMe : () => portfolio.getPublic(userId!);
    fetcher()
      .then(setData)
      .catch(() => setData({ items: [], video_count: 0, image_count: 0, max_videos: 2, max_images: 3 }))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this portfolio item?')) return;
    setDeleting(id);
    try {
      await portfolio.deleteItem(id);
      const fresh = await portfolio.getMe();
      setData(fresh);
    } catch {
      alert('Delete failed. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const videos = data?.items.filter(i => i.type === 'video') ?? [];
  const images = data?.items.filter(i => i.type === 'image') ?? [];
  const isEmpty = videos.length === 0 && images.length === 0;
  const canAddVideo = (data?.video_count ?? 0) < (data?.max_videos ?? 2);
  const canAddImage = (data?.image_count ?? 0) < (data?.max_images ?? 3);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-100 rounded w-1/4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="aspect-video bg-gray-100 rounded-xl" />
          <div className="aspect-video bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Portfolio</h2>
          {!isEmpty && (
            <p className="text-sm text-gray-500 mt-0.5">
              {videos.length} video{videos.length !== 1 ? 's' : ''} · {images.length} image{images.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {editable && (
          <button
            onClick={() => setModal({ mode: 'add' })}
            disabled={!canAddVideo && !canAddImage}
            className="flex items-center gap-2 px-4 py-2 bg-cobalt text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            title={(!canAddVideo && !canAddImage) ? 'Portfolio is full (2 videos, 3 images max)' : 'Add portfolio item'}
          >
            <i className="fa-solid fa-plus" /> Add Item
          </button>
        )}
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-photo-film text-gray-400 text-2xl" />
          </div>
          <p className="text-gray-600 font-semibold mb-1">
            {editable ? 'Your portfolio is empty' : 'No portfolio yet'}
          </p>
          <p className="text-sm text-gray-400 mb-5">
            {editable
              ? 'Add videos and images to showcase your work to clients.'
              : 'This creator hasn\'t added portfolio items yet.'}
          </p>
          {editable && (
            <button
              onClick={() => setModal({ mode: 'add' })}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-cobalt text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
            >
              <i className="fa-solid fa-plus" /> Add Your First Item
            </button>
          )}
        </div>
      )}

      {/* Limits bar (editable only) */}
      {editable && !isEmpty && (
        <div className="flex gap-4 mb-5 text-xs text-gray-500">
          <span className={canAddVideo ? 'text-green-600' : 'text-orange-500'}>
            <i className={`fa-solid fa-circle${canAddVideo ? '-plus text-green-500' : ' text-orange-400'} mr-1`} />
            Videos: {data?.video_count}/{data?.max_videos}
          </span>
          <span className={canAddImage ? 'text-green-600' : 'text-orange-500'}>
            <i className={`fa-solid fa-circle${canAddImage ? '-plus text-green-500' : ' text-orange-400'} mr-1`} />
            Images: {data?.image_count}/{data?.max_images}
          </span>
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Videos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map(item => (
              <div key={item.id} className={deleting === item.id ? 'opacity-50 pointer-events-none' : ''}>
                <VideoCard
                  item={item}
                  editable={editable}
                  onEdit={i => setModal({ mode: 'edit', item: i })}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Images */}
      {images.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Images</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {images.map(item => (
              <div key={item.id} className={deleting === item.id ? 'opacity-50 pointer-events-none' : ''}>
                <ImageCard
                  item={item}
                  editable={editable}
                  onEdit={i => setModal({ mode: 'edit', item: i })}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && data && (
        <PortfolioModal
          mode={modal.mode}
          item={modal.item}
          data={data}
          onClose={() => setModal(null)}
          onSaved={setData}
        />
      )}
    </div>
  );
}
