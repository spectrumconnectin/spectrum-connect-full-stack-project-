'use client';

import { useState } from 'react';
import { profile as profileApi } from '@/lib/api';

const TEMPLATES = [
  {
    key: 'visual',
    name: 'Visual',
    desc: 'Image-forward masonry — designers & photographers',
    icon: 'fa-table-cells-large',
    preview: (
      <div className="grid grid-cols-3 gap-1 h-full grid-rows-2">
        <div className="bg-blue-200 rounded row-span-2" />
        <div className="bg-blue-300 rounded" />
        <div className="bg-blue-100 rounded row-span-2" />
        <div className="bg-blue-200 rounded" />
      </div>
    ),
  },
  {
    key: 'motion',
    name: 'Motion',
    desc: 'Big video-first showcases — editors & animators',
    icon: 'fa-clapperboard',
    preview: (
      <div className="flex flex-col gap-1 h-full">
        <div className="bg-purple-300 rounded flex-[2] flex items-center justify-center">
          <i className="fa-solid fa-play text-white text-[8px]" />
        </div>
        <div className="bg-purple-100 rounded flex-1" />
      </div>
    ),
  },
  {
    key: 'minimal',
    name: 'Minimal',
    desc: 'Clean text-forward list — developers & writers',
    icon: 'fa-list',
    preview: (
      <div className="flex flex-col gap-1.5 h-full justify-center px-1">
        <div className="bg-gray-300 rounded h-1.5 w-4/5" />
        <div className="bg-gray-200 rounded h-1 w-3/5" />
        <div className="bg-gray-300 rounded h-1.5 w-4/5 mt-1.5" />
        <div className="bg-gray-200 rounded h-1 w-2/5" />
      </div>
    ),
  },
  {
    key: 'editorial',
    name: 'Editorial',
    desc: 'Magazine-style, one story at a time — writers & directors',
    icon: 'fa-newspaper',
    preview: (
      <div className="flex flex-col gap-1 h-full justify-center px-1">
        <div className="bg-gray-300 rounded h-2.5 w-full" />
        <div className="bg-gray-300 rounded h-2.5 w-3/4" />
        <div className="bg-blue-100 rounded h-3 w-full mt-1" />
      </div>
    ),
  },
  {
    key: 'grid',
    name: 'Grid',
    desc: 'Dense square grid — illustrators & social creators',
    icon: 'fa-border-all',
    preview: (
      <div className="grid grid-cols-3 gap-1 h-full">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`rounded ${i % 2 === 0 ? 'bg-emerald-200' : 'bg-emerald-100'}`} />
        ))}
      </div>
    ),
  },
];

/** Template picker — switch the public portfolio layout instantly. */
export default function TemplatePicker({
  initial = 'visual',
  onChanged,
}: {
  initial?: string;
  onChanged?: (template: string) => void;
}) {
  const [active, setActive] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);

  const choose = async (key: string) => {
    if (key === active || saving) return;
    setSaving(key);
    try {
      await profileApi.updateMe({ profile: { portfolio_template: key } });
      setActive(key);
      onChanged?.(key);
    } catch { /* keep previous */ } finally {
      setSaving(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-1">Portfolio template</h3>
      <p className="text-xs text-gray-400 mb-4">Switch instantly — your public page updates right away.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TEMPLATES.map(t => {
          const selected = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => choose(t.key)}
              disabled={!!saving}
              className={`text-left rounded-xl border-2 p-3 transition ${
                selected ? 'border-cobalt bg-blue-50/40' : 'border-gray-200 hover:border-gray-300 bg-white'
              } ${saving && saving !== t.key ? 'opacity-60' : ''}`}
            >
              <div className="h-16 rounded-lg bg-gray-50 border border-gray-100 p-1.5 mb-2.5 overflow-hidden">
                {t.preview}
              </div>
              <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <i className={`fa-solid ${t.icon} text-xs ${selected ? 'text-cobalt' : 'text-gray-300'}`} />
                {t.name}
                {selected && <i className="fa-solid fa-circle-check text-cobalt text-xs ml-auto" />}
                {saving === t.key && <i className="fa-solid fa-circle-notch animate-spin text-cobalt text-xs ml-auto" />}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{t.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
