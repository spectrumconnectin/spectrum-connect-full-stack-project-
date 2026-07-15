'use client';

import { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ContentBlock, ContentBlockType } from '@/lib/api';
import type { PendingMedia } from './ProjectMediaUploader';

const BLOCK_LABELS: Record<ContentBlockType, { label: string; icon: string }> = {
  text: { label: 'Text', icon: 'fa-align-left' },
  image: { label: 'Image', icon: 'fa-image' },
  video: { label: 'Video', icon: 'fa-video' },
  before_after: { label: 'Before/After', icon: 'fa-arrows-left-right' },
  quote: { label: 'Quote', icon: 'fa-quote-left' },
};

let _tempId = 0;
function newBlock(type: ContentBlockType): ContentBlock {
  return { id: `tmp-${++_tempId}`, type, order: 0 };
}

function BlockRow({
  block, media, onChange, onRemove,
}: {
  block: ContentBlock;
  media: (PendingMedia & { id: string })[];
  onChange: (patch: Partial<ContentBlock>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const meta = BLOCK_LABELS[block.type];

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2.5 bg-gray-50 border border-gray-200 rounded-xl p-3">
      <button type="button" {...attributes} {...listeners} aria-label="Drag to reorder"
        className="w-7 h-7 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-200 flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing touch-none">
        <i className="fa-solid fa-grip-vertical text-xs" />
      </button>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <i className={`fa-solid ${meta.icon}`} /> {meta.label}
          </span>
          <button type="button" onClick={onRemove} aria-label="Remove block"
            className="text-gray-300 hover:text-red-500 transition">
            <i className="fa-solid fa-xmark text-xs" />
          </button>
        </div>

        {(block.type === 'text' || block.type === 'quote') && (
          <textarea
            value={block.text || ''} onChange={e => onChange({ text: e.target.value })}
            rows={block.type === 'quote' ? 2 : 3} maxLength={4000}
            placeholder={block.type === 'quote' ? 'A memorable line from the client…' : 'Tell the story of this part of the project…'}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-cobalt resize-y bg-white"
          />
        )}
        {block.type === 'quote' && (
          <input
            value={block.attribution || ''} onChange={e => onChange({ attribution: e.target.value })}
            maxLength={120} placeholder="— Attribution (e.g. client name)"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-cobalt bg-white"
          />
        )}
        {block.type === 'image' || block.type === 'video' ? (
          <select value={block.media_id || ''} onChange={e => onChange({ media_id: e.target.value || undefined })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-cobalt">
            <option value="">Choose from uploaded media…</option>
            {media.map(m => (
              <option key={m.id} value={m.id}>{m.caption || m.url.slice(0, 60)}</option>
            ))}
          </select>
        ) : null}
        {block.type === 'before_after' && (
          <div className="grid grid-cols-2 gap-2">
            <select value={block.before_media_id || ''} onChange={e => onChange({ before_media_id: e.target.value || undefined })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-cobalt">
              <option value="">Before…</option>
              {media.map(m => <option key={m.id} value={m.id}>{m.caption || m.url.slice(0, 40)}</option>)}
            </select>
            <select value={block.after_media_id || ''} onChange={e => onChange({ after_media_id: e.target.value || undefined })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-cobalt">
              <option value="">After…</option>
              {media.map(m => <option key={m.id} value={m.id}>{m.caption || m.url.slice(0, 40)}</option>)}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Rich case-study block editor — mix text, images, video, before/after, and
 * quotes in any order. Drag to reorder. `media` is the project's uploaded
 * media library (blocks reference it by id rather than duplicating URLs).
 */
export default function ContentBlockEditor({
  blocks, media, onChange,
}: {
  blocks: ContentBlock[];
  media: PendingMedia[];
  onChange: (blocks: ContentBlock[]) => void;
}) {
  // Blocks reference media by its persisted server id — media still pending
  // upload/save (no id yet) can't be picked until the project is saved once.
  const savedMedia = media.filter((m): m is PendingMedia & { id: string } => !!m.id);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex(b => b.id === active.id);
    const newIndex = blocks.findIndex(b => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({ ...b, order: i })));
  };

  const add = (type: ContentBlockType) => onChange([...blocks, { ...newBlock(type), order: blocks.length }]);
  const update = (id: string, patch: Partial<ContentBlock>) =>
    onChange(blocks.map(b => (b.id === id ? { ...b, ...patch } : b)));
  const remove = (id: string) => onChange(blocks.filter(b => b.id !== id));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(Object.keys(BLOCK_LABELS) as ContentBlockType[]).map(type => (
          <button key={type} type="button" onClick={() => add(type)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg hover:border-cobalt hover:text-cobalt transition">
            <i className={`fa-solid ${BLOCK_LABELS[type].icon} text-[11px]`} /> {BLOCK_LABELS[type].label}
          </button>
        ))}
      </div>

      {blocks.length === 0 ? (
        <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl py-6 text-center">
          Optional — add blocks to build a rich case study. Leave empty to use the simple description above.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {blocks.map(b => (
                <BlockRow key={b.id} block={b} media={savedMedia}
                  onChange={patch => update(b.id, patch)} onRemove={() => remove(b.id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
