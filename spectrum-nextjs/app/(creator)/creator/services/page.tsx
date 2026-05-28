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
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [department, setDepartment] = useState(initial?.department ?? FILM_DEPARTMENTS[0]);
  const [tags, setTags] = useState(initial?.tags?.join(', ') ?? '');
  const [price, setPrice] = useState(initial?.price?.toString() ?? '');
  const [deliveryDays, setDeliveryDays] = useState(initial?.deliveryDays?.toString() ?? '');
  const [revisions, setRevisions] = useState(initial?.revisions?.toString() ?? '1');
  const [features, setFeatures] = useState(initial?.features?.join(', ') ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Populate fields once the fetched service data arrives (initial changes null → real data)
  useEffect(() => {
    if (!initial) return;
    setTitle(initial.title ?? '');
    setDescription(initial.description ?? '');
    setDepartment(initial.department ?? FILM_DEPARTMENTS[0]);
    setTags(initial.tags?.join(', ') ?? '');
    setPrice(initial.price?.toString() ?? '');
    setDeliveryDays(initial.deliveryDays?.toString() ?? '');
    setRevisions(initial.revisions?.toString() ?? '1');
    setFeatures(initial.features?.join(', ') ?? '');
  }, [initial]);

  const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
  const featureList = features.split(',').map(f => f.trim()).filter(Boolean);

  const valid =
    title.trim().length >= 10 &&
    description.trim().length >= 100 &&
    tagList.length >= 1 &&
    price !== '' && Number(price) > 0 &&
    deliveryDays !== '' && Number(deliveryDays) > 0 &&
    featureList.length >= 1;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        department,
        tags: tagList,
        packages: [{
          name: 'basic',
          description: `${title.trim()} · Basic Package`,
          price: Number(price),
          delivery_time: Number(deliveryDays),
          revisions: revisions === '-1' ? -1 : Number(revisions),
          features: featureList,
        }],
      };

      let result: ServiceItem;
      if (initial?.id) {
        result = await servicesApi.update(initial.id, payload);
      } else {
        result = await servicesApi.create(payload);
      }
      onSave(mapService(result));
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{initial?.id ? 'Edit Service' : 'Create Service'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {modalLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={onSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Service title <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-gray-400 ml-1">(min 10 chars)</span>
              </label>
              <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt"
                placeholder="e.g. Professional Cinematography for Short Films"
                value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-gray-400 ml-1">(min 100 chars)</span>
              </label>
              <textarea rows={4} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt resize-none"
                placeholder="Describe your service, what clients get, your experience and approach…"
                value={description} onChange={e => setDescription(e.target.value)} />
              <p className={`text-xs mt-1 ${description.length < 100 ? 'text-orange-500' : 'text-gray-400'}`}>
                {description.length}/5000 {description.length < 100 ? `(${100 - description.length} more needed)` : '✓'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt bg-white"
                  value={department} onChange={e => setDepartment(e.target.value)}>
                  {FILM_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tags <span className="text-red-500">*</span>
                </label>
                <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt"
                  placeholder="e.g. ARRI, short film, doc"
                  value={tags} onChange={e => setTags(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Comma-separated</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Price ($) <span className="text-red-500">*</span></label>
                <input type="number" min="1" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt"
                  placeholder="500" value={price} onChange={e => setPrice(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Delivery (days) <span className="text-red-500">*</span></label>
                <input type="number" min="1" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt"
                  placeholder="7" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Revisions</label>
                <input type="number" min="-1" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt"
                  placeholder="1 (-1 = ∞)" value={revisions} onChange={e => setRevisions(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                What's included <span className="text-red-500">*</span>
              </label>
              <textarea rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt resize-none"
                placeholder="e.g. 8-hour shoot, raw footage, colour grade, 1 round of revisions"
                value={features} onChange={e => setFeatures(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Comma-separated bullet points ({featureList.length} item{featureList.length !== 1 ? 's' : ''})</p>
            </div>

            {saveError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{saveError}</div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="submit" disabled={!valid || saving}
                className={`flex-1 px-4 py-3 rounded-xl bg-cobalt text-white text-sm font-semibold transition ${!valid || saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}>
                {saving ? 'Saving…' : initial?.id ? 'Save changes' : 'Create service'}
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
