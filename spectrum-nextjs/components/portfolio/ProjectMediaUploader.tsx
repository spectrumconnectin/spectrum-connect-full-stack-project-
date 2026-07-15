'use client';

import { useRef, useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { portfolioBuilder } from '@/lib/api';

/** Stable per-item identity for dnd-kit: uses the server id when the item is
 * already persisted, otherwise a cached local key tied to the object
 * reference (so unsaved items stay draggable and keep their identity across
 * reorders without needing a real id yet). */
function useStableKeys() {
  const map = useRef(new WeakMap<object, string>());
  const counter = useRef(0);
  return (item: PendingMedia): string => {
    if (item.id) return item.id;
    let k = map.current.get(item);
    if (!k) {
      k = `local-${counter.current++}`;
      map.current.set(item, k);
    }
    return k;
  };
}

export interface PendingMedia {
  id?: string;        // set when the media already exists on the server
  url: string;
  caption?: string;
  thumbnail?: string;
}

const TYPE_ICON: Record<string, string> = {
  image: 'fa-image',
  video: 'fa-clapperboard',
  file: 'fa-file-lines',
  link: 'fa-arrow-up-right-from-square',
};

function classify(url: string): { kind: string; label: string } {
  const u = url.toLowerCase().split('?')[0];
  if (/youtube\.com\/watch|youtu\.be\//.test(url)) return { kind: 'video', label: 'YouTube' };
  if (/vimeo\.com\/\d+/.test(url)) return { kind: 'video', label: 'Vimeo' };
  if (u.endsWith('.mp4') || u.endsWith('.webm')) return { kind: 'video', label: 'Video' };
  if (/\.(jpe?g|png|webp|gif)$/.test(u)) return { kind: 'image', label: 'Image' };
  if (/\.(pdf|docx?)$/.test(u)) return { kind: 'file', label: 'Document' };
  return { kind: 'link', label: 'Link' };
}

function SortableMediaRow({ dndId, item, onRemove }: { dndId: string; item: PendingMedia; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const c = classify(item.url);

  return (
    <li ref={setNodeRef} style={style}
      className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
      <button type="button" {...attributes} {...listeners} aria-label="Drag to reorder"
        className="w-6 h-6 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-200 flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing touch-none">
        <i className="fa-solid fa-grip-vertical text-xs" />
      </button>
      {c.kind === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <span className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
          <i className={`fa-solid ${TYPE_ICON[c.kind] || 'fa-link'}`} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-gray-700">{c.label}</p>
        <p className="text-xs text-gray-400 truncate">{item.caption || item.url}</p>
      </div>
      <button onClick={onRemove} aria-label="Remove"
        className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition flex-shrink-0">
        <i className="fa-solid fa-xmark" />
      </button>
    </li>
  );
}

/**
 * Multi-media manager for a project: upload images / a video / a document,
 * or paste a URL (YouTube, Vimeo, live site…). Emits PendingMedia entries —
 * the parent decides when to persist them (create vs. add-to-existing).
 */
export default function ProjectMediaUploader({
  items,
  onChange,
  maxItems = 10,
}: {
  items: PendingMedia[];
  onChange: (items: PendingMedia[]) => void;
  maxItems?: number;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const keyFor = useStableKeys();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const room = maxItems - items.length;

  const push = (added: PendingMedia[]) => {
    setError(null);
    onChange([...items, ...added].slice(0, maxItems));
  };

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy('images'); setError(null);
    try {
      const res = await portfolioBuilder.uploadImages(Array.from(files).slice(0, room));
      push(res.map(r => ({ url: r.url })));
    } catch { setError('Image upload failed — check size (max 5 MB each) and try again.'); }
    finally { setBusy(null); if (imgRef.current) imgRef.current.value = ''; }
  };

  const uploadVideo = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy('video'); setError(null);
    try {
      const res = await portfolioBuilder.uploadVideos([files[0]]);
      push(res.map(r => ({ url: r.url })));
    } catch { setError('Video upload failed — max 50 MB, MP4/WebM/MOV.'); }
    finally { setBusy(null); if (vidRef.current) vidRef.current.value = ''; }
  };

  const uploadDoc = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy('doc'); setError(null);
    try {
      const res = await portfolioBuilder.uploadDocument(files[0]);
      push([{ url: res.url, caption: files[0].name }]);
    } catch { setError('Document upload failed — PDF/DOC/DOCX up to 10 MB.'); }
    finally { setBusy(null); if (docRef.current) docRef.current.value = ''; }
  };

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//.test(url)) { setError('Links must start with http(s)://'); return; }
    push([{ url }]);
    setUrlInput('');
  };

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = items.map(keyFor);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <div>
      {/* Current items */}
      {items.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(keyFor)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2 mb-3">
              {items.map((m, i) => (
                <SortableMediaRow key={keyFor(m)} dndId={keyFor(m)} item={m} onRemove={() => remove(i)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {room > 0 ? (
        <>
          {/* Upload buttons */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'images', icon: 'fa-image', label: 'Images', ref: imgRef, accept: 'image/*', multiple: true, handler: uploadImages },
              { key: 'video', icon: 'fa-clapperboard', label: 'Video', ref: vidRef, accept: 'video/mp4,video/webm,video/quicktime', multiple: false, handler: uploadVideo },
              { key: 'doc', icon: 'fa-file-lines', label: 'PDF/Doc', ref: docRef, accept: '.pdf,.doc,.docx', multiple: false, handler: uploadDoc },
            ].map(b => (
              <button
                key={b.key}
                type="button"
                onClick={() => b.ref.current?.click()}
                disabled={!!busy}
                className="flex flex-col items-center gap-1.5 border-2 border-dashed border-gray-200 rounded-xl py-3.5 text-gray-400 hover:border-cobalt hover:text-cobalt transition disabled:opacity-50"
              >
                <i className={`fa-solid ${busy === b.key ? 'fa-circle-notch animate-spin' : b.icon}`} />
                <span className="text-xs font-semibold">{b.label}</span>
                <input
                  ref={b.ref} type="file" accept={b.accept} multiple={b.multiple} className="hidden"
                  onChange={e => b.handler(e.target.files)}
                />
              </button>
            ))}
          </div>

          {/* URL paste */}
          <div className="flex gap-2 mt-2.5">
            <input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
              placeholder="Paste a YouTube, Vimeo, or website link…"
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt"
            />
            <button type="button" onClick={addUrl}
              className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition flex-shrink-0">
              Add
            </button>
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-400">Maximum {maxItems} media items per project.</p>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
