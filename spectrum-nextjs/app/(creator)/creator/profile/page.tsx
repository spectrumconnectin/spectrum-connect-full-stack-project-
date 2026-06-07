'use client';
import OnlineStatusBadge from '@/components/OnlineStatusBadge';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  profile as profileApi,
  account as accountApi,
  auth,
  type MeResponse,
  type ExperienceCreate,
  type EducationCreate,
  type CertificationCreate,
} from '@/lib/api';
import PortfolioSection from '@/components/PortfolioSection';

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(date?: string) {
  if (!date) return '';
  try { return new Date(date).toISOString().split('T')[0]; } catch { return ''; }
}

type Tab = 'profile' | 'experience' | 'education' | 'portfolio' | 'security' | 'notifications';

interface ExpEntry { title: string; company?: string; location?: string; start_date: string; end_date?: string; current: boolean; description?: string; }
interface EduEntry { degree: string; institution: string; field_of_study?: string; start_date: string; end_date?: string; description?: string; }
interface CertEntry { name: string; issuing_organization: string; issue_date: string; expiry_date?: string; credential_id?: string; credential_url?: string; }

const notifDefs = [
  { key: 'email_notifications', label: 'Email notifications', desc: 'Receive updates via email' },
  { key: 'push_notifications', label: 'Push notifications', desc: 'In-app alerts for matches and messages' },
  { key: 'sms_notifications', label: 'SMS notifications', desc: 'Text alerts for critical activity' },
  { key: 'marketing_emails', label: 'Marketing emails', desc: 'News, tips, and announcements' },
];

const privacyDefs = [
  { key: 'show_location', label: 'Show location', desc: 'Display your city/country on public profile' },
  { key: 'show_earnings', label: 'Show earnings', desc: 'Display total earnings on profile' },
];

const emptyExp: ExpEntry = { title: '', company: '', location: '', start_date: '', end_date: '', current: false, description: '' };
const emptyEdu: EduEntry = { degree: '', institution: '', field_of_study: '', start_date: '', end_date: '', description: '' };
const emptyCert: CertEntry = { name: '', issuing_organization: '', issue_date: '', expiry_date: '', credential_id: '', credential_url: '' };

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-cobalt' : 'bg-gray-200'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inp = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-blue-100 text-sm';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<Tab>('profile');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [imdb, setImdb] = useState('');
  const [vimeo, setVimeo] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [hourlyMin, setHourlyMin] = useState('');
  const [hourlyMax, setHourlyMax] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const [availabilityStatus, setAvailabilityStatus] = useState<string>('available');
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [skills, setSkills] = useState<{ name: string; level?: string }[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);

  const [experiences, setExperiences] = useState<ExpEntry[]>([]);
  const [showExpForm, setShowExpForm] = useState(false);
  const [expForm, setExpForm] = useState<ExpEntry>(emptyExp);
  const [editExpIdx, setEditExpIdx] = useState<number | null>(null);
  const [expSaving, setExpSaving] = useState(false);

  const [educations, setEducations] = useState<EduEntry[]>([]);
  const [showEduForm, setShowEduForm] = useState(false);
  const [eduForm, setEduForm] = useState<EduEntry>(emptyEdu);
  const [editEduIdx, setEditEduIdx] = useState<number | null>(null);
  const [eduSaving, setEduSaving] = useState(false);

  const [certifications, setCertifications] = useState<CertEntry[]>([]);
  const [showCertForm, setShowCertForm] = useState(false);
  const [certForm, setCertForm] = useState<CertEntry>(emptyCert);
  const [editCertIdx, setEditCertIdx] = useState<number | null>(null);
  const [certSaving, setCertSaving] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState('');

  const [notifs, setNotifs] = useState<Record<string, boolean>>({
    email_notifications: true, push_notifications: true,
    sms_notifications: false, marketing_emails: false,
  });
  const [privacy, setPrivacy] = useState({
    profile_visibility: 'public', show_location: true, show_earnings: false,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'settings' || hash === 'security') setTab('security');
    else if (hash === 'notifications') setTab('notifications');
    else if (hash === 'experience') setTab('experience');
    else if (hash === 'education') setTab('education');

    setLoadError('');
    profileApi.getMe().then(u => {
      setUser(u);
      const p = u.profile;
      setFirstName(p?.first_name ?? '');
      setLastName(p?.last_name ?? '');
      setDisplayName(p?.display_name ?? '');
      setTagline(p?.tagline ?? p?.headline ?? '');
      setBio(p?.bio ?? '');
      setCity(p?.location?.city ?? '');
      setCountry(p?.location?.country ?? '');
      setWebsite(p?.website ?? '');
      setLinkedin(p?.social_links?.linkedin ?? '');
      setImdb(p?.social_links?.imdb ?? '');
      setVimeo(p?.social_links?.vimeo ?? '');
      setPortfolio(p?.social_links?.portfolio ?? '');
      setHourlyMin(p?.hourly_rate_min != null ? String(p.hourly_rate_min) : '');
      setHourlyMax(p?.hourly_rate_max != null ? String(p.hourly_rate_max) : '');
      setPhone(u.phone_number ?? '');
      setSkills(p?.skills ?? []);
      setAvatarUrl(p?.profile_picture ?? '');
      setCoverUrl(p?.cover_image ?? '');
      setExperiences(((p?.experience ?? []) as ExpEntry[]).map(e => ({
        ...e, start_date: fmt(e.start_date), end_date: fmt(e.end_date),
      })));
      setEducations(((p?.education ?? []) as EduEntry[]).map(e => ({
        ...e, start_date: fmt(e.start_date), end_date: fmt(e.end_date),
      })));
      setCertifications(((p?.certifications ?? []) as CertEntry[]).map(c => ({
        ...c, issue_date: fmt(c.issue_date), expiry_date: fmt(c.expiry_date),
      })));
      const s = u.settings;
      if (s) {
        setNotifs({
          email_notifications: s.email_notifications ?? true,
          push_notifications: s.push_notifications ?? true,
          sms_notifications: s.sms_notifications ?? false,
          marketing_emails: s.marketing_emails ?? false,
        });
        setPrivacy({
          profile_visibility: s.profile_visibility ?? 'public',
          show_location: s.show_location ?? true,
          show_earnings: s.show_earnings ?? false,
        });
        setAvailabilityStatus(s.availability_status ?? 'available');
      }
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'HTTP_401') setAuthError(true);
      else setLoadError(msg || 'Failed to load profile');
    }).finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    setProfileSaving(true); setProfileMsg('');
    try {
      await profileApi.updateMe({
        profile: {
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          display_name: displayName || undefined,
          tagline: tagline || undefined,
          bio: bio || undefined,
          website: website || undefined,
          location: { city: city || undefined, country: country || undefined },
          social_links: {
            linkedin: linkedin || undefined,
            imdb: imdb || undefined,
            vimeo: vimeo || undefined,
            portfolio: portfolio || undefined,
          },
          hourly_rate_min: hourlyMin ? parseFloat(hourlyMin) : undefined,
          hourly_rate_max: hourlyMax ? parseFloat(hourlyMax) : undefined,
        },
      });
      setProfileMsg('Saved successfully!');
    } catch (e: unknown) {
      setProfileMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMsg(''), 3500);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const { url } = await profileApi.uploadAvatar(file);
      await profileApi.updateProfilePicture(url);
      setAvatarUrl(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally { setAvatarUploading(false); }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const { url } = await profileApi.uploadCover(file);
      await profileApi.updateCoverImage(url);
      setCoverUrl(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally { setCoverUploading(false); }
  };

  const addSkill = async () => {
    const name = newSkill.trim(); if (!name) return;
    setAddingSkill(true);
    try {
      await profileApi.addSkill({ name });
      setSkills(s => [...s, { name }]); setNewSkill('');
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setAddingSkill(false); }
  };

  const removeSkill = async (i: number) => {
    try {
      await profileApi.deleteSkill(i);
      setSkills(s => s.filter((_, idx) => idx !== i));
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
  };

  const openExpForm = (i?: number) => {
    setEditExpIdx(i ?? null);
    setExpForm(i !== undefined ? { ...experiences[i] } : emptyExp);
    setShowExpForm(true);
  };

  const saveExp = async () => {
    if (!expForm.title || !expForm.start_date) return;
    setExpSaving(true);
    try {
      const payload: ExperienceCreate = {
        ...expForm,
        start_date: new Date(expForm.start_date).toISOString(),
        end_date: expForm.current ? undefined : (expForm.end_date ? new Date(expForm.end_date).toISOString() : undefined),
      };
      if (editExpIdx !== null) {
        await profileApi.updateExperience(editExpIdx, payload);
        setExperiences(prev => prev.map((e, i) => i === editExpIdx ? expForm : e));
      } else {
        await profileApi.addExperience(payload);
        setExperiences(prev => [...prev, expForm]);
      }
      setShowExpForm(false);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setExpSaving(false); }
  };

  const deleteExp = async (i: number) => {
    if (!confirm('Delete this experience?')) return;
    try {
      await profileApi.deleteExperience(i);
      setExperiences(prev => prev.filter((_, idx) => idx !== i));
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
  };

  const openEduForm = (i?: number) => {
    setEditEduIdx(i ?? null);
    setEduForm(i !== undefined ? { ...educations[i] } : emptyEdu);
    setShowEduForm(true);
  };

  const saveEdu = async () => {
    if (!eduForm.degree || !eduForm.institution || !eduForm.start_date) return;
    setEduSaving(true);
    try {
      const payload: EducationCreate = {
        ...eduForm,
        start_date: new Date(eduForm.start_date).toISOString(),
        end_date: eduForm.end_date ? new Date(eduForm.end_date).toISOString() : undefined,
      };
      if (editEduIdx !== null) {
        await profileApi.updateEducation(editEduIdx, payload);
        setEducations(prev => prev.map((e, i) => i === editEduIdx ? eduForm : e));
      } else {
        await profileApi.addEducation(payload);
        setEducations(prev => [...prev, eduForm]);
      }
      setShowEduForm(false);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setEduSaving(false); }
  };

  const deleteEdu = async (i: number) => {
    if (!confirm('Delete this education entry?')) return;
    try {
      await profileApi.deleteEducation(i);
      setEducations(prev => prev.filter((_, idx) => idx !== i));
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
  };

  const openCertForm = (i?: number) => {
    setEditCertIdx(i ?? null);
    setCertForm(i !== undefined ? { ...certifications[i] } : emptyCert);
    setShowCertForm(true);
  };

  const saveCert = async () => {
    if (!certForm.name || !certForm.issuing_organization || !certForm.issue_date) return;
    setCertSaving(true);
    try {
      const payload: CertificationCreate = {
        ...certForm,
        issue_date: new Date(certForm.issue_date).toISOString(),
        expiry_date: certForm.expiry_date ? new Date(certForm.expiry_date).toISOString() : undefined,
      };
      if (editCertIdx !== null) {
        await profileApi.updateCertification(editCertIdx, payload);
        setCertifications(prev => prev.map((c, i) => i === editCertIdx ? certForm : c));
      } else {
        await profileApi.addCertification(payload);
        setCertifications(prev => [...prev, certForm]);
      }
      setShowCertForm(false);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setCertSaving(false); }
  };

  const deleteCert = async (i: number) => {
    if (!confirm('Delete this certification?')) return;
    try {
      await profileApi.deleteCertification(i);
      setCertifications(prev => prev.filter((_, idx) => idx !== i));
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
  };

  const changePassword = async () => {
    if (newPw !== confirmPw) { setPwMsg('Passwords do not match'); return; }
    if (newPw.length < 8) { setPwMsg('Min 8 characters'); return; }
    setPwSaving(true); setPwMsg('');
    try {
      await accountApi.updatePassword(currentPw, newPw);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setPwMsg('Password updated!');
    } catch (e: unknown) { setPwMsg(e instanceof Error ? e.message : 'Failed'); }
    finally { setPwSaving(false); setTimeout(() => setPwMsg(''), 3500); }
  };

  const changePhone = async () => {
    if (!phone.match(/^\+\d{7,15}$/)) { setPhoneMsg('Use E.164 format: +12025551234'); return; }
    setPhoneSaving(true); setPhoneMsg('');
    try {
      await accountApi.updatePhone(phone);
      setPhoneMsg('Phone updated!');
    } catch (e: unknown) { setPhoneMsg(e instanceof Error ? e.message : 'Failed'); }
    finally { setPhoneSaving(false); setTimeout(() => setPhoneMsg(''), 3500); }
  };

  const saveNotifications = async () => {
    setNotifSaving(true); setNotifMsg('');
    try {
      await profileApi.updateSettings({ ...notifs });
      await accountApi.updatePrivacy({
        profile_visibility: privacy.profile_visibility,
        show_location: privacy.show_location,
        show_earnings: privacy.show_earnings,
      });
      setNotifMsg('Saved!');
    } catch (e: unknown) { setNotifMsg(e instanceof Error ? e.message : 'Save failed'); }
    finally { setNotifSaving(false); setTimeout(() => setNotifMsg(''), 3500); }
  };

  const signOut = () => { auth.logout(); window.location.href = '/login'; };

  const nameDisplay = [firstName, lastName].filter(Boolean).join(' ') || user?.profile?.display_name || user?.username || 'Your Profile';
  const avatar = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(nameDisplay)}&background=195ad7&color=fff&size=128`;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'experience', label: 'Experience' },
    { key: 'education', label: 'Education' },
    { key: 'portfolio', label: 'Portfolio' },
    { key: 'security', label: 'Security' },
    { key: 'notifications', label: 'Notifications' },
  ];

  if (loading) return (
    <div className="min-h-[70vh]">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm font-medium">Loading your profile…</p>
      </div>
    </div>
  );

  if (authError) return (
    <div className="min-h-[70vh]">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>
        <p className="text-gray-800 font-semibold text-lg">Session expired</p>
        <p className="text-gray-500 text-sm">Please log in again to view your profile.</p>
        <button onClick={() => router.push('/login')}
          className="px-8 py-2.5 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition">
          Go to Login
        </button>
      </div>
    </div>
  );

  if (loadError) return (
    <div className="min-h-[70vh]">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>
        <p className="text-gray-800 font-semibold text-lg">Could not load profile</p>
        <p className="text-red-500 text-sm max-w-sm text-center">{loadError}</p>
        <div className="flex gap-3">
          <button onClick={() => window.location.reload()}
            className="px-8 py-2.5 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition">Retry</button>
          <button onClick={() => router.push('/login')}
            className="px-8 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition">Login</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid lg:grid-cols-3 gap-6">

      {/* ── Left: advanced profile card ── */}
      <div className="lg:col-span-1 space-y-5">

        {/* ── Hero card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Cover */}
          <div className="relative h-36 group" style={{
            background: coverUrl ? `url(${coverUrl}) center/cover` : 'linear-gradient(135deg,#195ad7 0%,#7c3aed 100%)',
          }}>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
            <button onClick={() => coverRef.current?.click()} disabled={coverUploading}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 text-white text-xs font-semibold px-3 py-1.5 rounded-xl backdrop-blur-sm transition">
              <i className="fa-solid fa-camera text-[10px]"></i>
              {coverUploading ? 'Uploading…' : 'Edit cover'}
            </button>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />

            {/* Online badge */}
            <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${
              user?.is_online ? 'bg-emerald-500/90 text-white' : 'bg-black/40 text-gray-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${user?.is_online ? 'bg-white animate-pulse' : 'bg-gray-400'}`}></span>
              {user?.is_online ? 'Online' : 'Offline'}
            </div>
          </div>

          <div className="px-5 pb-5">
            {/* Avatar row */}
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatar} className="w-20 h-20 rounded-2xl border-4 border-white shadow-xl object-cover" alt={nameDisplay} />
                <button onClick={() => avatarRef.current?.click()} disabled={avatarUploading}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-cobalt hover:bg-blue-700 text-white text-xs rounded-lg shadow-md flex items-center justify-center transition">
                  {avatarUploading ? <i className="fa-solid fa-spinner animate-spin text-[10px]"></i> : <i className="fa-solid fa-pen text-[10px]"></i>}
                </button>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>

              {/* Verified + ETF badge */}
              <div className="flex items-center gap-2 mb-1">
                {user?.is_verified && (
                  <span className="flex items-center gap-1 bg-blue-50 text-cobalt text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200">
                    <i className="fa-solid fa-circle-check text-[10px]"></i> Verified
                  </span>
                )}
              </div>
            </div>

            {/* Name + tagline */}
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{nameDisplay}</h2>
            {tagline ? (
              <p className="text-sm text-cobalt font-medium mt-0.5">{tagline}</p>
            ) : (
              <p className="text-sm text-gray-400 italic mt-0.5">Add a tagline to your profile</p>
            )}
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <i className="fa-solid fa-at text-[10px]"></i>{user?.username}
            </p>

            {/* Location + rate */}
            <div className="flex flex-wrap gap-2 mt-3">
              {(city || country) && (
                <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
                  <i className="fa-solid fa-location-dot text-gray-400 text-[10px]"></i>
                  {[city, country].filter(Boolean).join(', ')}
                </span>
              )}
              {(hourlyMin || hourlyMax) && (
                <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold">
                  <i className="fa-solid fa-dollar-sign text-[10px]"></i>
                  {hourlyMin}{hourlyMax && hourlyMax !== hourlyMin ? `–${hourlyMax}` : ''}/hr
                </span>
              )}
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center py-2 bg-gray-50 rounded-xl">
                <p className="text-base font-bold text-gray-900">
                  {user?.stats?.projects_completed ?? user?.stats?.completed_credits ?? 0}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">Completed</p>
              </div>
              <div className="text-center py-2 bg-gray-50 rounded-xl">
                <p className="text-base font-bold text-gray-900">
                  {user?.profile?.rating ? `${user.profile.rating.toFixed(1)}★` : '—'}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">Rating</p>
              </div>
            </div>

            {/* Response Time card */}
            {(() => {
              const rt = user?.stats?.response_time;
              if (!rt || rt === 0) return (
                <div className="mt-2 flex items-center gap-3 p-3 bg-sky-50 border border-sky-100 rounded-xl">
                  <div className="w-9 h-9 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fa-regular fa-clock text-sky-500 text-sm" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-700">Response Time</p>
                    <p className="text-[11px] text-gray-400">Send messages to track</p>
                  </div>
                </div>
              );
              const timeStr = rt < 1    ? 'under 1 hour'
                            : rt < 24   ? `~${Math.round(rt)} hour${Math.round(rt) !== 1 ? 's' : ''}`
                            : `~${Math.round(rt / 24)} day${Math.round(rt / 24) !== 1 ? 's' : ''}`;
              const isFast   = rt <= 2;
              const isNormal = rt > 2 && rt < 12;
              const isSlow   = rt >= 12 && rt < 24;
              const badge    = isFast ? 'Fast' : isNormal ? 'Responsive' : isSlow ? 'Normal' : 'Moderate';
              const badgeCls = isFast   ? 'bg-emerald-100 text-emerald-700'
                             : isNormal ? 'bg-blue-100 text-blue-700'
                             : isSlow   ? 'bg-amber-100 text-amber-700'
                             : 'bg-gray-100 text-gray-600';
              const bgCls    = isFast   ? 'bg-emerald-50 border-emerald-100'
                             : isNormal ? 'bg-blue-50 border-blue-100'
                             : isSlow   ? 'bg-amber-50 border-amber-100'
                             : 'bg-gray-50 border-gray-100';
              const iconCls  = isFast   ? 'bg-emerald-100 text-emerald-600'
                             : isNormal ? 'bg-blue-100 text-cobalt'
                             : isSlow   ? 'bg-amber-100 text-amber-600'
                             : 'bg-gray-100 text-gray-500';
              return (
                <div className={`mt-2 flex items-center gap-3 p-3 ${bgCls} rounded-xl border`}>
                  <div className={`w-9 h-9 ${iconCls} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <i className="fa-solid fa-clock text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-500">Response Time</p>
                    <p className="text-sm font-semibold text-gray-900">Avg. reply in {timeStr}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeCls} flex-shrink-0`}>{badge}</span>
                </div>
              );
            })()}

            {/* Profile completion bar */}
            {(() => {
              const fields = [nameDisplay, tagline, bio, city, hourlyMin, website, skills.length > 0];
              const done = fields.filter(Boolean).length;
              const pct = Math.round((done / fields.length) * 100);
              return pct < 100 ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-gray-600">Profile strength</p>
                    <p className="text-xs font-bold text-cobalt">{pct}%</p>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-cobalt'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {pct < 50 ? 'Add your tagline, bio and location to stand out' :
                     pct < 80 ? 'Almost there — add skills and a rate' :
                     'Great profile! Add a few more details'}
                  </p>
                </div>
              ) : null;
            })()}

            {/* Social links */}
            {(linkedin || imdb || vimeo || website) && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-cobalt bg-gray-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">
                    <i className="fa-solid fa-globe text-[11px]"></i> Website
                  </a>
                )}
                {linkedin && (
                  <a href={linkedin} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-700 bg-gray-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">
                    <i className="fa-brands fa-linkedin text-[11px]"></i> LinkedIn
                  </a>
                )}
                {imdb && (
                  <a href={imdb} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-600 bg-gray-50 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition">
                    <i className="fa-brands fa-imdb text-[11px]"></i> IMDb
                  </a>
                )}
                {vimeo && (
                  <a href={vimeo} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-sky-600 bg-gray-50 hover:bg-sky-50 px-3 py-1.5 rounded-lg transition">
                    <i className="fa-brands fa-vimeo text-[11px]"></i> Vimeo
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Skills card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <i className="fa-solid fa-code text-cobalt text-sm"></i>Skills
              <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{skills.length}</span>
            </h3>
          </div>

          {/* Skill chips with level badge */}
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map((s, i) => (
              <div key={i} className="group flex items-center gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                <span className="text-xs font-semibold text-cobalt">{s.name}</span>
                {s.level && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1 ${
                    s.level === 'expert'       ? 'bg-purple-100 text-purple-700' :
                    s.level === 'intermediate' ? 'bg-blue-100 text-blue-700' :
                                                 'bg-gray-100 text-gray-500'
                  }`}>{s.level}</span>
                )}
                <button onClick={() => removeSkill(i)}
                  className="text-blue-200 hover:text-red-400 transition ml-0.5 opacity-0 group-hover:opacity-100 text-xs">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            ))}
            {skills.length === 0 && (
              <div className="w-full py-6 flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-screwdriver-wrench text-cobalt"></i>
                </div>
                <p className="text-sm text-gray-500 font-medium">No skills yet</p>
                <p className="text-xs text-gray-400">Add your skills to get matched with the right projects</p>
              </div>
            )}
          </div>

          {/* Add skill with level selector */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                <input type="text" value={newSkill} onChange={e => setNewSkill(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSkill()}
                  placeholder="Add a skill…"
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-blue-100" />
              </div>
              <select
                id="skill-level-select"
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-600 focus:outline-none focus:border-cobalt bg-white">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
              <button
                onClick={() => {
                  const sel = document.getElementById('skill-level-select') as HTMLSelectElement;
                  if (newSkill.trim()) {
                    const s = newSkill.trim();
                    setNewSkill('');
                    setAddingSkill(true);
                    profileApi.addSkill(s, sel?.value || 'intermediate')
                      .then(() => setSkills(prev => [...prev, { name: s, level: sel?.value || 'intermediate' }]))
                      .catch(() => setSkills(prev => [...prev, { name: s, level: sel?.value || 'intermediate' }]))
                      .finally(() => setAddingSkill(false));
                  }
                }}
                disabled={addingSkill || !newSkill.trim()}
                className="w-10 h-10 bg-cobalt hover:bg-blue-700 text-white rounded-xl disabled:opacity-40 transition flex items-center justify-center flex-shrink-0">
                {addingSkill ? <i className="fa-solid fa-spinner animate-spin text-xs"></i> : <i className="fa-solid fa-plus text-xs"></i>}
              </button>
            </div>

            {/* Quick-add suggestions */}
            {skills.length < 8 && (
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Quick add</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Video Editing','Motion Graphics','Color Grading','Cinematography','Sound Design','Scriptwriting','Photography','VFX','Animation','3D Modeling']
                    .filter(s => !skills.some(sk => sk.name.toLowerCase() === s.toLowerCase()))
                    .slice(0, 6)
                    .map(s => (
                      <button key={s} onClick={() => {
                        setAddingSkill(true);
                        profileApi.addSkill(s, 'intermediate')
                          .then(() => setSkills(prev => [...prev, { name: s, level: 'intermediate' }]))
                          .catch(() => setSkills(prev => [...prev, { name: s, level: 'intermediate' }]))
                          .finally(() => setAddingSkill(false));
                      }}
                        className="text-[11px] px-2.5 py-1 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-cobalt border border-gray-200 hover:border-blue-300 rounded-lg transition">
                        + {s}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Availability card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <i className="fa-solid fa-calendar-check text-emerald-500 text-sm"></i>Availability
          </h3>
          <div className="space-y-3">
            {[
              { val: 'available',     label: 'Available now',       desc: 'Actively looking for projects', color: 'bg-emerald-500' },
              { val: 'busy',          label: 'Busy',                desc: 'Working on current projects',   color: 'bg-amber-400' },
              { val: 'not_available', label: 'Not available',       desc: 'Not taking new work right now', color: 'bg-gray-400' },
            ].map(opt => {
              const isSelected = availabilityStatus === opt.val;
              return (
                <button key={opt.val}
                  onClick={async () => {
                    const prev = availabilityStatus;
                    setAvailabilityStatus(opt.val); // optimistic update — UI responds instantly
                    try {
                      await profileApi.updateSettings({ availability_status: opt.val });
                    } catch {
                      setAvailabilityStatus(prev); // revert on failure
                    }
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition ${
                    isSelected ? 'border-cobalt bg-blue-50' : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${opt.color}`}></div>
                  <div>
                    <p className={`text-sm font-semibold ${isSelected ? 'text-cobalt' : 'text-gray-700'}`}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-gray-400">{opt.desc}</p>
                  </div>
                  {isSelected && (
                    <i className="fa-solid fa-circle-check text-cobalt text-sm ml-auto"></i>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Right: tabs ── */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${tab === t.key ? 'bg-white text-cobalt shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {tab === 'profile' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 md:p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Account Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="First Name"><input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inp} /></Field>
              <Field label="Last Name"><input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inp} /></Field>
              <Field label="Email"><input type="email" value={user?.email ?? ''} readOnly className={inp + ' bg-gray-50 text-gray-400 cursor-not-allowed'} /></Field>
              <Field label="Phone"><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+12025551234" className={inp} /></Field>
              <Field label="City"><input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Los Angeles" className={inp} /></Field>
              <Field label="Country"><input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="United States" className={inp} /></Field>
              <Field label="Hourly Rate Min ($)"><input type="number" value={hourlyMin} onChange={e => setHourlyMin(e.target.value)} placeholder="50" min="0" className={inp} /></Field>
              <Field label="Hourly Rate Max ($)"><input type="number" value={hourlyMax} onChange={e => setHourlyMax(e.target.value)} placeholder="150" min="0" className={inp} /></Field>
              <Field label="Tagline"><input type="text" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Senior Cinematographer · Available" className={inp} /></Field>
              <Field label="Website"><input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com" className={inp} /></Field>
              <Field label="LinkedIn"><input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" className={inp} /></Field>
              <Field label="IMDb"><input type="url" value={imdb} onChange={e => setImdb(e.target.value)} placeholder="https://imdb.com/name/…" className={inp} /></Field>
              <Field label="Vimeo"><input type="url" value={vimeo} onChange={e => setVimeo(e.target.value)} placeholder="https://vimeo.com/…" className={inp} /></Field>
              <Field label="Portfolio"><input type="url" value={portfolio} onChange={e => setPortfolio(e.target.value)} placeholder="https://portfolio.com" className={inp} /></Field>
            </div>
            <div className="mt-5">
              <Field label="Bio">
                <textarea rows={4} value={bio} onChange={e => setBio(e.target.value)}
                  placeholder="Tell clients about your experience…" maxLength={500}
                  className={inp + ' resize-none'} />
                <div className="text-xs text-gray-400 text-right mt-0.5">{bio.length}/500</div>
              </Field>
            </div>
            <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {phoneMsg && <span className={`text-sm ${phoneMsg.includes('updat') ? 'text-green-600' : 'text-red-500'}`}>{phoneMsg}</span>}
                <button onClick={changePhone} disabled={phoneSaving}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
                  {phoneSaving ? 'Saving…' : 'Update Phone'}
                </button>
              </div>
              <div className="flex items-center gap-3">
                {profileMsg && <span className={`text-sm ${profileMsg.includes('uccess') ? 'text-green-600' : 'text-red-500'}`}>{profileMsg}</span>}
                <button onClick={saveProfile} disabled={profileSaving}
                  className="px-6 py-2.5 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {profileSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Experience tab */}
        {tab === 'experience' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Work Experience</h3>
              <button onClick={() => openExpForm()} className="px-4 py-2 bg-cobalt text-white text-sm rounded-xl font-semibold hover:bg-blue-700">+ Add</button>
            </div>
            {experiences.length === 0 && !showExpForm && (
              <div className="text-center py-12 text-gray-400">
                <i className="fa-solid fa-briefcase text-3xl mb-3 block text-gray-200" />No experience added yet.
              </div>
            )}
            <div className="space-y-4 mb-6">
              {experiences.map((e, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{e.title}</p>
                      {e.company && <p className="text-sm text-gray-500">{e.company}{e.location ? ` · ${e.location}` : ''}</p>}
                      <p className="text-xs text-gray-400 mt-1">{e.start_date} — {e.current ? 'Present' : (e.end_date || '—')}</p>
                      {e.description && <p className="text-sm text-gray-600 mt-2">{e.description}</p>}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button onClick={() => openExpForm(i)} className="text-xs text-cobalt hover:underline">Edit</button>
                      <button onClick={() => deleteExp(i)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {showExpForm && (
              <div className="border-2 border-cobalt rounded-2xl p-6">
                <h4 className="font-bold text-gray-900 mb-5">{editExpIdx !== null ? 'Edit' : 'Add'} Experience</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Job Title *"><input type="text" value={expForm.title} onChange={e => setExpForm(f => ({ ...f, title: e.target.value }))} className={inp} /></Field>
                  <Field label="Company"><input type="text" value={expForm.company ?? ''} onChange={e => setExpForm(f => ({ ...f, company: e.target.value }))} className={inp} /></Field>
                  <Field label="Location"><input type="text" value={expForm.location ?? ''} onChange={e => setExpForm(f => ({ ...f, location: e.target.value }))} placeholder="City, Country" className={inp} /></Field>
                  <Field label="Start Date *"><input type="date" value={expForm.start_date} onChange={e => setExpForm(f => ({ ...f, start_date: e.target.value }))} className={inp} /></Field>
                  <Field label="End Date"><input type="date" value={expForm.end_date ?? ''} onChange={e => setExpForm(f => ({ ...f, end_date: e.target.value }))} disabled={expForm.current} className={inp + (expForm.current ? ' opacity-40' : '')} /></Field>
                  <div className="flex items-center gap-3 pt-6">
                    <input type="checkbox" id="expCurrent" checked={expForm.current} onChange={e => setExpForm(f => ({ ...f, current: e.target.checked, end_date: '' }))} className="w-4 h-4" />
                    <label htmlFor="expCurrent" className="text-sm font-medium text-gray-700">Currently working here</label>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Description"><textarea rows={3} value={expForm.description ?? ''} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your role…" className={inp + ' resize-none'} /></Field>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-5">
                  <button onClick={saveExp} disabled={expSaving || !expForm.title || !expForm.start_date}
                    className="px-6 py-2.5 bg-cobalt text-white rounded-xl font-semibold disabled:opacity-50">{expSaving ? 'Saving…' : 'Save'}</button>
                  <button onClick={() => setShowExpForm(false)} className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Education tab */}
        {tab === 'education' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Education & Certifications</h3>
              <button onClick={() => openEduForm()} className="px-4 py-2 bg-cobalt text-white text-sm rounded-xl font-semibold hover:bg-blue-700">+ Add Education</button>
            </div>
            {educations.length === 0 && !showEduForm && <div className="text-center py-8 text-gray-400 text-sm">No education added.</div>}
            <div className="space-y-4 mb-6">
              {educations.map((e, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{e.degree}</p>
                      <p className="text-sm text-gray-500">{e.institution}{e.field_of_study ? ` · ${e.field_of_study}` : ''}</p>
                      <p className="text-xs text-gray-400 mt-1">{e.start_date} — {e.end_date || 'Present'}</p>
                      {e.description && <p className="text-sm text-gray-600 mt-2">{e.description}</p>}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button onClick={() => openEduForm(i)} className="text-xs text-cobalt hover:underline">Edit</button>
                      <button onClick={() => deleteEdu(i)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {showEduForm && (
              <div className="border-2 border-cobalt rounded-2xl p-6 mb-8">
                <h4 className="font-bold text-gray-900 mb-5">{editEduIdx !== null ? 'Edit' : 'Add'} Education</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Degree *"><input type="text" value={eduForm.degree} onChange={e => setEduForm(f => ({ ...f, degree: e.target.value }))} placeholder="Bachelor of Arts" className={inp} /></Field>
                  <Field label="Institution *"><input type="text" value={eduForm.institution} onChange={e => setEduForm(f => ({ ...f, institution: e.target.value }))} placeholder="UCLA" className={inp} /></Field>
                  <Field label="Field of Study"><input type="text" value={eduForm.field_of_study ?? ''} onChange={e => setEduForm(f => ({ ...f, field_of_study: e.target.value }))} placeholder="Film Production" className={inp} /></Field>
                  <Field label="Start Date *"><input type="date" value={eduForm.start_date} onChange={e => setEduForm(f => ({ ...f, start_date: e.target.value }))} className={inp} /></Field>
                  <Field label="End Date"><input type="date" value={eduForm.end_date ?? ''} onChange={e => setEduForm(f => ({ ...f, end_date: e.target.value }))} className={inp} /></Field>
                  <div className="sm:col-span-2"><Field label="Description"><textarea rows={2} value={eduForm.description ?? ''} onChange={e => setEduForm(f => ({ ...f, description: e.target.value }))} className={inp + ' resize-none'} /></Field></div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={saveEdu} disabled={eduSaving || !eduForm.degree || !eduForm.institution || !eduForm.start_date}
                    className="px-6 py-2.5 bg-cobalt text-white rounded-xl font-semibold disabled:opacity-50">{eduSaving ? 'Saving…' : 'Save'}</button>
                  <button onClick={() => setShowEduForm(false)} className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            )}
            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-900">Certifications</h4>
                <button onClick={() => openCertForm()} className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-xl font-semibold hover:bg-gray-200">+ Add Cert</button>
              </div>
              {certifications.length === 0 && !showCertForm && <p className="text-sm text-gray-400">No certifications yet.</p>}
              <div className="space-y-3 mb-4">
                {certifications.map((c, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4 flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.issuing_organization} · {c.issue_date}</p>
                      {c.credential_id && <p className="text-xs text-gray-400">ID: {c.credential_id}</p>}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button onClick={() => openCertForm(i)} className="text-xs text-cobalt hover:underline">Edit</button>
                      <button onClick={() => deleteCert(i)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
              {showCertForm && (
                <div className="border-2 border-cobalt rounded-2xl p-6">
                  <h4 className="font-bold text-gray-900 mb-4">{editCertIdx !== null ? 'Edit' : 'Add'} Certification</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Name *"><input type="text" value={certForm.name} onChange={e => setCertForm(f => ({ ...f, name: e.target.value }))} className={inp} /></Field>
                    <Field label="Issuing Organization *"><input type="text" value={certForm.issuing_organization} onChange={e => setCertForm(f => ({ ...f, issuing_organization: e.target.value }))} className={inp} /></Field>
                    <Field label="Issue Date *"><input type="date" value={certForm.issue_date} onChange={e => setCertForm(f => ({ ...f, issue_date: e.target.value }))} className={inp} /></Field>
                    <Field label="Expiry Date"><input type="date" value={certForm.expiry_date ?? ''} onChange={e => setCertForm(f => ({ ...f, expiry_date: e.target.value }))} className={inp} /></Field>
                    <Field label="Credential ID"><input type="text" value={certForm.credential_id ?? ''} onChange={e => setCertForm(f => ({ ...f, credential_id: e.target.value }))} className={inp} /></Field>
                    <Field label="Credential URL"><input type="url" value={certForm.credential_url ?? ''} onChange={e => setCertForm(f => ({ ...f, credential_url: e.target.value }))} className={inp} /></Field>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={saveCert} disabled={certSaving || !certForm.name || !certForm.issuing_organization || !certForm.issue_date}
                      className="px-6 py-2.5 bg-cobalt text-white rounded-xl font-semibold disabled:opacity-50">{certSaving ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => setShowCertForm(false)} className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Portfolio tab */}
        {tab === 'portfolio' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <PortfolioSection editable={true} />
          </div>
        )}

        {/* Security tab */}
        {tab === 'security' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8" id="settings">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Change Password</h3>
            <div className="space-y-4 max-w-md">
              <Field label="Current Password"><input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className={inp} /></Field>
              <Field label="New Password"><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className={inp} /></Field>
              <Field label="Confirm New Password"><input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={inp} /></Field>
              <div className="flex items-center gap-3 pt-2">
                {pwMsg && <span className={`text-sm ${pwMsg.includes('updat') ? 'text-green-600' : 'text-red-500'}`}>{pwMsg}</span>}
                <button onClick={changePassword} disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                  className="px-6 py-2.5 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {pwSaving ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </div>
            <hr className="my-8 border-gray-100" />
            <div className="border border-rose-200 rounded-xl p-6">
              <h4 className="font-bold text-rose-700 mb-1">Danger Zone</h4>
              <p className="text-sm text-gray-500 mb-4">Deactivating hides your profile. You can reactivate anytime.</p>
              <div className="flex gap-3">
                <button onClick={() => accountApi.deactivate().then(() => signOut())}
                  className="px-5 py-2.5 border border-rose-200 text-rose-600 rounded-xl font-semibold hover:bg-rose-50 text-sm">
                  Deactivate Account
                </button>
                <button onClick={signOut} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black text-sm">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications tab */}
        {tab === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h3>
              <div className="space-y-4">
                {notifDefs.map(n => (
                  <div key={n.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{n.label}</p>
                      <p className="text-xs text-gray-400">{n.desc}</p>
                    </div>
                    <Toggle on={notifs[n.key]} onToggle={() => setNotifs(p => ({ ...p, [n.key]: !p[n.key] }))} />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Privacy Settings</h3>
              <div className="space-y-4 mb-5">
                {privacyDefs.map(p => (
                  <div key={p.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.label}</p>
                      <p className="text-xs text-gray-400">{p.desc}</p>
                    </div>
                    <Toggle on={privacy[p.key as keyof typeof privacy] as boolean}
                      onToggle={() => setPrivacy(prev => ({ ...prev, [p.key]: !prev[p.key as keyof typeof privacy] }))} />
                  </div>
                ))}
                <div className="py-3">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Profile Visibility</label>
                  <select value={privacy.profile_visibility}
                    onChange={e => setPrivacy(p => ({ ...p, profile_visibility: e.target.value }))}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cobalt w-full sm:w-64">
                    <option value="public">Public — anyone can view</option>
                    <option value="connections">Connections only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-2">
                {notifMsg && <span className="text-sm text-green-600">{notifMsg}</span>}
                <button onClick={saveNotifications} disabled={notifSaving}
                  className="px-6 py-2.5 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {notifSaving ? 'Saving…' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
