'use client';

import { useState, useEffect } from 'react';
import { services as servicesApi, ServiceItem } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type ServiceCard = {
  id: string;
  title: string;
  description: string;
  department: string;
  tags: string[];
  price: number;
  deliveryDays: number;
  revisions: number;
  features: string[];
  status: 'active' | 'draft' | 'paused';
  orders: number;
  rating: number;
};

const FILM_DEPARTMENTS = [
  'Camera', 'Cinematography', 'Directing', 'Editing', 'Post-Production',
  'Sound', 'Sound Design', 'Music Composition', 'Motion Graphics', 'Animation',
  'VFX', 'Lighting', 'Grip', 'Art Department', 'Production Management',
  'Scripting', 'Storyboarding', '3D Modeling', 'Producing', 'Other',
];

const statusColors: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-gray-100 text-gray-600',
  paused: 'bg-amber-50 text-amber-700',
};

function mapService(s: ServiceItem): ServiceCard {
  const pkg = s.packages?.[0];
  return {
    id: s.id,
    title: s.title,
    description: s.description || '',
    department: s.department,
    tags: s.tags || [],
    price: pkg?.price ?? 0,
    deliveryDays: pkg?.delivery_time ?? 0,
    revisions: pkg?.revisions ?? 1,
    features: pkg?.features || [],
    status: s.status as 'active' | 'draft' | 'paused',
    orders: s.stats?.orders ?? 0,
    rating: s.rating?.overall ?? 0,
  };
}

// ── ServiceCard component ─────────────────────────────────────────────────────

function ServiceCardItem({ service, onEdit, onToggle, onDelete }: {
  service: ServiceCard;
  onEdit: (s: ServiceCard) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[service.status]}`}>
              {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{service.department}</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900">{service.title}</h3>
          {service.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{service.description}</p>
          )}
          {service.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {service.tags.slice(0, 4).map(t => (
                <span key={t} className="text-xs px-2 py-0.5 bg-blue-50 text-cobalt rounded-full">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-gray-900">${service.price.toLocaleString()}</div>
          <div className="text-xs text-gray-500">{service.deliveryDays}d delivery</div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1"><i className="fa-solid fa-bag-shopping text-cobalt"></i>{service.orders} orders</span>
        {service.rating > 0 && (
          <span className="flex items-center gap-1"><i className="fa-solid fa-star text-amber-400"></i>{service.rating.toFixed(1)}</span>
        )}
        {service.revisions >= 0 && (
          <span className="flex items-center gap-1"><i className="fa-solid fa-rotate text-gray-400"></i>
            {service.revisions === -1 ? 'Unlimited revisions' : `${service.revisions} revision${service.revisions !== 1 ? 's' : ''}`}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <button onClick={() => onEdit(service)}
          className="flex-1 px-4 py-2 text-sm font-semibold text-cobalt border border-cobalt rounded-xl hover:bg-blue-50 transition">
          Edit
        </button>
        <button onClick={() => onToggle(service.id)}
          className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
          {service.status === 'active' ? 'Pause' : 'Activate'}
        </button>
        <button onClick={() => onDelete(service.id)}
          className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-100 rounded-xl hover:bg-red-50 transition">
          <i className="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  );
}

// ── ServiceModal ──────────────────────────────────────────────────────────────

function ServiceModal({ initial, loading: modalLoading, onClose, onSave }: {
  initial: ServiceCard | null;
  loading: boolean;
  onClose: () => void;
  onSave: (s: ServiceCard) => void;
}) {
  const isEdit = Boolean(initial?.id);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [department, setDepartment] = useState(initial?.department ?? FILM_DEPARTMENTS[0]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [price, setPrice] = useState(initial?.price?.toString() ?? '');
  const [deliveryDays, setDeliveryDays] = useState(initial?.deliveryDays?.toString() ?? '');
  const [revisions, setRevisions] = useState(initial?.revisions?.toString() ?? '1');
  const [featureInput, setFeatureInput] = useState('');
  const [features, setFeatures] = useState<string[]>(initial?.features ?? []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!initial) return;
    setTitle(initial.title ?? '');
    setDescription(initial.description ?? '');
    setDepartment(initial.department ?? FILM_DEPARTMENTS[0]);
    setTags(initial.tags ?? []);
    setPrice(initial.price?.toString() ?? '');
    setDeliveryDays(initial.deliveryDays?.toString() ?? '');
    setRevisions(initial.revisions?.toString() ?? '1');
    setFeatures(initial.features ?? []);
  }, [initial]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 10) { setTags(p => [...p, t]); setTagInput(''); }
  };
  const removeTag = (t: string) => setTags(p => p.filter(x => x !== t));

  const addFeature = () => {
    const f = featureInput.trim();
    if (f && !features.includes(f)) { setFeatures(p => [...p, f]); setFeatureInput(''); }
  };
  const removeFeature = (f: string) => setFeatures(p => p.filter(x => x !== f));

  const canSubmit =
    title.trim().length >= 10 &&
    description.trim().length >= 100 &&
    tags.length >= 1 &&
    Number(price) > 0 &&
    Number(deliveryDays) > 0 &&
    features.length >= 1;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        department,
        tags,
        packages: [{
          name: 'basic',
          description: `${title.trim()} – Basic Package`,
          price: Number(price),
          delivery_time: Number(deliveryDays),
          revisions: revisions === '-1' ? -1 : Number(revisions),
          features,
        }],
      };
      const result = initial?.id
        ? await servicesApi.update(initial.id, payload)
        : await servicesApi.create(payload);
      onSave(mapService(result));
    } catch (err) {
      setSaveError((err as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-cobalt transition bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2';

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      {/* Dim left side */}
      <div className="flex-1 bg-black/40" />

      {/* Drawer panel */}
      <div
        className="relative w-full max-w-md bg-white flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <i className="fa-solid fa-store text-cobalt text-sm"></i>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 leading-none">
                  {isEdit ? 'Edit service' : 'New service'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Fill in the details below</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Body */}
        {modalLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-[3px] border-cobalt border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto">

              {/* ── Section 1: About ── */}
              <div className="px-6 py-5 space-y-4">
                <p className={labelCls}>About your service</p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Professional Cinematography for Short Films"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                  {title.length > 0 && title.trim().length < 10 && (
                    <p className="text-xs text-amber-600 mt-1.5">
                      {10 - title.trim().length} more characters needed
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={5}
                    className={`${inputCls} resize-none`}
                    placeholder="Describe what clients get, your experience, your process, and what makes your service stand out…"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-xs ${description.trim().length < 100 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {description.trim().length < 100
                        ? `${100 - description.trim().length} more chars needed`
                        : `${description.trim().length} chars — looks good`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mx-6 border-t border-gray-100" />

              {/* ── Section 2: Category ── */}
              <div className="px-6 py-5 space-y-4">
                <p className={labelCls}>Category</p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                  <select
                    className={inputCls}
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                  >
                    {FILM_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tags <span className="text-red-400">*</span>
                  </label>
                  {/* Tag pills */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {tags.map(t => (
                        <span key={t} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-blue-50 text-cobalt text-xs font-medium rounded-lg">
                          {t}
                          <button type="button" onClick={() => removeTag(t)}
                            className="w-4 h-4 flex items-center justify-center rounded hover:bg-blue-200 transition">
                            <i className="fa-solid fa-xmark text-[10px]"></i>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      className={`${inputCls} flex-1`}
                      placeholder="Add a tag and press Enter"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    />
                    <button type="button" onClick={addTag}
                      className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition">
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="mx-6 border-t border-gray-100" />

              {/* ── Section 3: Pricing ── */}
              <div className="px-6 py-5 space-y-4">
                <p className={labelCls}>Pricing & delivery</p>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Price <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input type="number" min="1"
                        className={`${inputCls} pl-6`}
                        placeholder="500"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Days <span className="text-red-400">*</span>
                    </label>
                    <input type="number" min="1"
                      className={inputCls}
                      placeholder="7"
                      value={deliveryDays}
                      onChange={e => setDeliveryDays(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Revisions</label>
                    <select className={inputCls} value={revisions} onChange={e => setRevisions(e.target.value)}>
                      {['0','1','2','3','5','-1'].map(v => (
                        <option key={v} value={v}>{v === '-1' ? '∞' : v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    What&apos;s included <span className="text-red-400">*</span>
                  </label>
                  {/* Feature list */}
                  {features.length > 0 && (
                    <ul className="mb-2 space-y-1.5">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">
                          <span className="flex items-center gap-2 min-w-0">
                            <i className="fa-solid fa-check text-emerald-500 text-[10px] shrink-0"></i>
                            <span className="truncate">{f}</span>
                          </span>
                          <button type="button" onClick={() => removeFeature(f)}
                            className="shrink-0 text-gray-300 hover:text-red-400 transition">
                            <i className="fa-solid fa-xmark text-xs"></i>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <input
                      className={`${inputCls} flex-1`}
                      placeholder="e.g. 8-hour on-location shoot"
                      value={featureInput}
                      onChange={e => setFeatureInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                    />
                    <button type="button" onClick={addFeature}
                      className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition">
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {saveError && (
                <div className="mx-6 mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <i className="fa-solid fa-circle-exclamation text-red-500 text-sm mt-0.5 shrink-0"></i>
                  <p className="text-sm text-red-700">{saveError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex gap-3 bg-white">
              <button type="button" onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit || saving}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                  canSubmit && !saving
                    ? 'bg-cobalt text-white hover:bg-blue-700 shadow-sm shadow-blue-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  isEdit ? 'Save changes' : 'Create service'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const [serviceList, setServiceList] = useState<ServiceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'paused'>('all');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<ServiceCard | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    servicesApi.getMe()
      .then(list => setServiceList(list.map(mapService)))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setModalData(null);
    setShowModal(true);
  };

  const openEdit = async (service: ServiceCard) => {
    setModalData(null);
    setModalLoading(true);
    setShowModal(true);
    try {
      const full = await servicesApi.getById(service.id);
      setModalData(mapService(full));
    } catch {
      setShowModal(false);
      alert('Could not load service details. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    const svc = serviceList.find(s => s.id === id);
    if (!svc) return;
    const newStatus = svc.status === 'active' ? 'paused' : 'active';
    try {
      await servicesApi.updateStatus(id, newStatus);
      setServiceList(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service? This cannot be undone.')) return;
    try {
      await servicesApi.delete(id);
      setServiceList(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleSave = (updated: ServiceCard) => {
    if (modalData?.id) {
      setServiceList(prev => prev.map(s => s.id === updated.id ? updated : s));
    } else {
      setServiceList(prev => [updated, ...prev]);
    }
    setShowModal(false);
    setModalData(null);
  };

  const filtered = filter === 'all' ? serviceList : serviceList.filter(s => s.status === filter);
  const activeCount = serviceList.filter(s => s.status === 'active').length;
  const totalOrders = serviceList.reduce((a, s) => a + s.orders, 0);
  const ratedServices = serviceList.filter(s => s.rating > 0);
  const avgRating = ratedServices.length > 0 ? ratedServices.reduce((a, s) => a + s.rating, 0) / ratedServices.length : 0;

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Services</h1>
          <p className="text-lg text-gray-600">Manage your gigs and offerings for clients.</p>
        </div>
        <button onClick={openCreate} className="px-5 py-3 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-sm">
          <i className="fa-solid fa-plus"></i> New Service
        </button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Active Services', value: activeCount, icon: 'fa-circle-check', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Orders', value: totalOrders, icon: 'fa-bag-shopping', color: 'text-cobalt', bg: 'bg-blue-50' },
          { label: 'Avg Rating', value: avgRating > 0 ? avgRating.toFixed(1) + ' ★' : '—', icon: 'fa-star', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}>
              <i className={`fa-solid ${icon} ${color}`}></i>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'active', 'draft', 'paused'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${filter === f ? 'bg-cobalt text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-2 text-xs opacity-70">{f === 'all' ? serviceList.length : serviceList.filter(s => s.status === f).length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading your services…</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <p className="text-red-500 text-sm mb-4">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-store text-cobalt text-2xl"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {filter === 'all' ? 'No services yet' : `No ${filter} services`}
          </h3>
          <p className="text-gray-500 mb-6">
            {filter === 'all' ? 'Create your first service to start attracting clients.' : `You don't have any ${filter} services.`}
          </p>
          {filter === 'all' && (
            <button onClick={openCreate} className="px-6 py-3 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition">
              Create your first service
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(s => (
            <ServiceCardItem key={s.id} service={s} onEdit={openEdit} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && (
        <ServiceModal
          initial={modalData}
          loading={modalLoading}
          onClose={() => { setShowModal(false); setModalData(null); }}
          onSave={handleSave}
        />
      )}
    </>
  );
}
