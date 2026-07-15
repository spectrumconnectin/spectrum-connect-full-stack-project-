'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { portfolioBuilder, type ContentBlock, type PortfolioProject } from '@/lib/api';
import ProjectMediaUploader, { type PendingMedia } from './ProjectMediaUploader';
import ContentBlockEditor from './ContentBlockEditor';
import { projectCover } from '@/lib/portfolio';

const CATEGORIES = [
  'Video Editing', 'Cinematography', 'Motion Graphics', 'Animation',
  'Graphic Design', 'Photography', 'Illustration', '3D Modeling',
  'Web Development', 'Writing/Copy', 'Audio/Music', 'Other',
];

interface Draft {
  id?: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  client: string;
  completion_date: string; // yyyy-mm
  external_link: string;
  is_featured: boolean;
  media: PendingMedia[];
  content_blocks: ContentBlock[];
}

const EMPTY: Draft = {
  slug: '', title: '', description: '', category: '', client: '',
  completion_date: '', external_link: '', is_featured: false, media: [], content_blocks: [],
};

function toDraft(p: PortfolioProject): Draft {
  return {
    id: p.id,
    slug: p.slug || '',
    title: p.title,
    description: p.description || '',
    category: p.category || '',
    client: p.client || '',
    completion_date: p.completion_date ? p.completion_date.slice(0, 7) : '',
    external_link: p.external_link || '',
    is_featured: p.is_featured,
    media: (p.media || []).map(m => ({ id: m.id, url: m.url, caption: m.caption || undefined })),
    content_blocks: p.content_blocks || [],
  };
}

/** Strip client-only fields (id/order) before sending blocks to the API. */
function blocksForApi(blocks: ContentBlock[]) {
  return blocks.map(b => ({
    type: b.type, text: b.text, attribution: b.attribution,
    media_id: b.media_id, before_media_id: b.before_media_id, after_media_id: b.after_media_id,
  }));
}

/** "✨ Improve" — fetches suggestions and lets the user apply one. */
function ImproveButton({ onFetch, onApply }: {
  onFetch: () => Promise<{ suggestions: string[] }>;
  onApply: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const run = async () => {
    if (open) { setOpen(false); return; }
    setBusy(true);
    try {
      const r = await onFetch();
      setSuggestions(r.suggestions || []);
      setOpen(true);
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  return (
    <div>
      <button type="button" onClick={run} disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-800 transition disabled:opacity-50">
        <i className={`fa-solid ${busy ? 'fa-circle-notch animate-spin' : 'fa-wand-magic-sparkles'}`} />
        {open ? 'Hide suggestions' : 'Improve'}
      </button>
      {open && suggestions.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {suggestions.map((s, i) => (
            <button key={i} type="button"
              onClick={() => { onApply(s); setOpen(false); }}
              className="block w-full text-left text-xs text-gray-600 bg-purple-50/60 border border-purple-100 rounded-lg px-3 py-2 hover:border-purple-300 transition whitespace-pre-line">
              {s}
            </button>
          ))}
          <p className="text-[10px] text-gray-300">Tap a suggestion to use it — then tweak in your own voice.</p>
        </div>
      )}
    </div>
  );
}

/** One draggable project row in the list. */
function SortableProjectRow({
  project, compact, onEdit, onDelete,
}: {
  project: PortfolioProject;
  compact: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const cover = projectCover(project);

  return (
    <li ref={setNodeRef} style={style}
      className="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl p-3.5 shadow-sm">
      {!compact && (
        <button type="button" {...attributes} {...listeners} aria-label="Drag to reorder"
          className="w-7 h-7 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing touch-none">
          <i className="fa-solid fa-grip-vertical text-xs" />
        </button>
      )}
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300 flex-shrink-0">
          <i className="fa-regular fa-image text-lg" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-bold text-gray-900 text-sm leading-tight flex items-center gap-2">
          {project.title}
          {project.is_featured && <i className="fa-solid fa-star text-amber-400 text-xs" title="Featured" />}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {[project.category, project.client].filter(Boolean).join(' · ') || '—'}
          {' · '}{project.media.length} media item{project.media.length !== 1 ? 's' : ''}
          {project.view_count > 0 && <> · {project.view_count} view{project.view_count !== 1 ? 's' : ''}</>}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onEdit} aria-label="Edit"
          className="w-8 h-8 rounded-lg text-gray-400 hover:text-cobalt hover:bg-blue-50 flex items-center justify-center transition">
          <i className="fa-solid fa-pen text-xs" />
        </button>
        <button onClick={onDelete} aria-label="Delete"
          className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition">
          <i className="fa-solid fa-trash text-xs" />
        </button>
      </div>
    </li>
  );
}

/**
 * Portfolio project editor — list, reorder, and a full add/edit modal with
 * multi-media upload and smart writing suggestions.
 * `compact` renders a lightweight variant for onboarding.
 */
export default function PortfolioProjectEditor({
  compact = false,
  onSaved,
}: {
  compact?: boolean;
  onSaved?: () => void;
}) {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [maxProjects, setMaxProjects] = useState(12);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await portfolioBuilder.getMyProjects();
      setProjects(r.projects);
      setMaxProjects(r.max_projects);
    } catch { /* ignore */ } finally { setLoaded(true); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (patch: Partial<Draft>) => setDraft(d => (d ? { ...d, ...patch } : d));

  const save = async () => {
    if (!draft || !draft.title.trim()) { setError('Give your project a title.'); return; }
    setSaving(true); setError(null);
    try {
      const base = {
        title: draft.title.trim(),
        slug: draft.slug.trim() || undefined,
        description: draft.description.trim() || undefined,
        category: draft.category || undefined,
        client: draft.client.trim() || undefined,
        completion_date: draft.completion_date ? `${draft.completion_date}-01T00:00:00Z` : undefined,
        external_link: draft.external_link.trim() || undefined,
        is_featured: draft.is_featured,
        content_blocks: blocksForApi(draft.content_blocks),
      };
      if (!draft.id) {
        await portfolioBuilder.createProject({
          ...base,
          media: draft.media.map(m => ({ url: m.url, caption: m.caption, thumbnail: m.thumbnail })),
        });
      } else {
        await portfolioBuilder.updateProject(draft.id, base);
        // Sync media: add the new, remove the deleted, then persist the final
        // order (covers pure reorders of already-existing media too).
        const before = projects.find(p => p.id === draft.id)?.media || [];
        const keptIds = new Set(draft.media.filter(m => m.id).map(m => m.id));
        for (const m of before) {
          if (!keptIds.has(m.id)) await portfolioBuilder.deleteMedia(draft.id, m.id);
        }
        const finalIds: string[] = [];
        for (const m of draft.media) {
          if (m.id) {
            finalIds.push(m.id);
          } else {
            const created = await portfolioBuilder.addMedia(draft.id, { url: m.url, caption: m.caption, thumbnail: m.thumbnail });
            finalIds.push(created.id);
          }
        }
        if (finalIds.length > 1) {
          try { await portfolioBuilder.reorderMedia(draft.id, finalIds); } catch { /* order is best-effort */ }
        }
      }
      setDraft(null);
      await load();
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the project. Please try again.');
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      await portfolioBuilder.deleteProject(id);
      await load();
      onSaved?.();
    } catch { /* ignore */ }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = projects.findIndex(p => p.id === active.id);
    const newIndex = projects.findIndex(p => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(projects, oldIndex, newIndex);
    setProjects(next);
    try { await portfolioBuilder.reorderProjects(next.map(p => p.id)); } catch { load(); }
  };

  if (!loaded) {
    return <div className="py-10 text-center text-gray-400 text-sm">Loading projects…</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{compact ? 'Add your first project' : 'Projects'}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {compact
              ? 'One strong project is enough to start — you can add more later.'
              : `${projects.length} of ${maxProjects} · rich case studies with images, video, and files`}
          </p>
        </div>
        {projects.length < maxProjects && (
          <button
            onClick={() => setDraft({ ...EMPTY })}
            className="inline-flex items-center gap-2 bg-cobalt text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 active:scale-[0.98] transition flex-shrink-0"
          >
            <i className="fa-solid fa-plus" /> Add project
          </button>
        )}
      </div>

      {/* Project list */}
      {projects.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-briefcase text-cobalt text-xl" />
          </div>
          <p className="font-semibold text-gray-700 text-sm">No projects yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-5 max-w-xs mx-auto">
            Show clients what you can do — add your best work with images, video, or a case-study PDF.
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3">
              {projects.map(p => (
                <SortableProjectRow key={p.id} project={p} compact={compact}
                  onEdit={() => setDraft(toDraft(p))} onDelete={() => remove(p.id)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {/* Add/Edit modal */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-6"
          onClick={e => { if (e.target === e.currentTarget && !saving) setDraft(null); }}>
          <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-gray-900">{draft.id ? 'Edit project' : 'New project'}</h3>
              <button onClick={() => !saving && setDraft(null)} aria-label="Close"
                className="w-9 h-9 rounded-xl text-gray-400 hover:bg-gray-100 flex items-center justify-center transition">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Title *</label>
                  <ImproveButton
                    onFetch={() => portfolioBuilder.assistProjectTitle({ current_text: draft.title, category: draft.category })}
                    onApply={s => set({ title: s })}
                  />
                </div>
                <input value={draft.title} onChange={e => set({ title: e.target.value })} maxLength={120}
                  placeholder="e.g. Brand Launch Film for Acme Co"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt" />
              </div>

              {/* Project URL slug — only shown once a project exists (auto-generated on first save) */}
              {draft.id && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Project URL</label>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                    <span className="pl-3.5 pr-1 text-xs text-gray-400 font-mono whitespace-nowrap">/{'{you}'}/</span>
                    <input value={draft.slug} onChange={e => set({ slug: e.target.value })} maxLength={80}
                      className="flex-1 min-w-0 py-2.5 pr-3.5 bg-transparent text-sm font-mono focus:outline-none" />
                  </div>
                </div>
              )}

              {/* Category + client */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Category</label>
                  <select value={draft.category} onChange={e => set({ category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-cobalt">
                    <option value="">Select…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Client <span className="text-gray-300 normal-case">(optional)</span></label>
                  <input value={draft.client} onChange={e => set({ client: e.target.value })} maxLength={100}
                    placeholder="e.g. Acme Co"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt" />
                </div>
              </div>

              {/* Date + link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Completed</label>
                  <input type="month" value={draft.completion_date} onChange={e => set({ completion_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Project link <span className="text-gray-300 normal-case">(optional)</span></label>
                  <input value={draft.external_link} onChange={e => set({ external_link: e.target.value })}
                    placeholder="https://…"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt" />
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Description</label>
                  <ImproveButton
                    onFetch={() => portfolioBuilder.assistProjectDescription({
                      current_text: draft.description, project_title: draft.title,
                      category: draft.category, client: draft.client,
                    })}
                    onApply={s => set({ description: s })}
                  />
                </div>
                <textarea value={draft.description} onChange={e => set({ description: e.target.value })}
                  rows={4} maxLength={2000}
                  placeholder="What was the brief? What did you do? What was the result?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt resize-y" />
              </div>

              {/* Media */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Media</label>
                <ProjectMediaUploader items={draft.media} onChange={media => set({ media })} />
              </div>

              {/* Rich case study */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  Case study <span className="text-gray-300 normal-case">(optional)</span>
                </label>
                <ContentBlockEditor blocks={draft.content_blocks} media={draft.media}
                  onChange={content_blocks => set({ content_blocks })} />
              </div>

              {/* Featured */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={draft.is_featured} onChange={e => set({ is_featured: e.target.checked })}
                  className="w-4 h-4 rounded accent-cobalt" />
                <span className="text-sm text-gray-700">
                  <span className="font-semibold">Feature this project</span>
                  <span className="text-gray-400"> — pinned first on your portfolio</span>
                </span>
              </label>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
              <button onClick={() => !saving && setDraft(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 bg-cobalt text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-60">
                {saving ? <><i className="fa-solid fa-circle-notch animate-spin" /> Saving…</> : 'Save project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
