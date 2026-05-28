'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  profile as profileApi,
  account as accountApi,
  auth,
  type MeResponse,
} from '@/lib/api';

const inp = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-blue-100 text-sm';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-cobalt' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

const notifDefs = [
  { key: 'email_notifications',  label: 'New job matches',       desc: 'Get notified when Smart Connect finds a project for you' },
  { key: 'push_notifications',   label: 'Application updates',   desc: 'Status changes on projects you posted' },
  { key: 'sms_notifications',    label: 'Messages',              desc: 'New messages from creators' },
  { key: 'marketing_emails',     label: 'Weekly digest',         desc: 'A summary of your activity each Monday' },
];

export default function ClientProfilePage() {
  const router = useRouter();

  const [user,      setUser]      = useState<MeResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [authError, setAuthError] = useState(false);
  const [loadError, setLoadError] = useState('');

  // ── Profile fields ───────────────────────────────────────────────────────
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone,       setPhone]       = useState('');
  const [city,        setCity]        = useState('');
  const [country,     setCountry]     = useState('');
  const [website,     setWebsite]     = useState('');
  const [linkedin,    setLinkedin]    = useState('');
  const [bio,         setBio]         = useState('');
  const [avatarUrl,   setAvatarUrl]   = useState('');
  const [coverUrl,    setCoverUrl]    = useState('');
  const avatarRef = useRef<HTMLInputElement>(null);

  // ── Skills ───────────────────────────────────────────────────────────────
  const [skills,    setSkills]    = useState<{ name: string }[]>([]);
  const [newSkill,  setNewSkill]  = useState('');
  const [addingSkill, setAddingSkill] = useState(false);

  // ── Save states ──────────────────────────────────────────────────────────
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg,    setProfileMsg]    = useState('');
  const [phoneSaving,   setPhoneSaving]   = useState(false);
  const [phoneMsg,      setPhoneMsg]      = useState('');
  const [pwSaving,      setPwSaving]      = useState(false);
  const [pwMsg,         setPwMsg]         = useState('');
  const [currentPw,     setCurrentPw]     = useState('');
  const [newPw,         setNewPw]         = useState('');
  const [confirmPw,     setConfirmPw]     = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  // ── Notifications + Privacy ──────────────────────────────────────────────
  const [notifs, setNotifs] = useState<Record<string, boolean>>({
    email_notifications: true, push_notifications: true,
    sms_notifications: false,  marketing_emails: false,
  });
  const [privacy, setPrivacy] = useState({
    profile_visibility: 'public', show_location: true, show_earnings: false,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMsg,    setNotifMsg]    = useState('');

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'settings') {
      setTimeout(() => {
        document.getElementById('settings')?.scrollIntoView({ behavior: 'smooth' });
      }, 400);
    }

    setLoadError('');
    profileApi.getMe().then(u => {
      setUser(u);
      const p = u.profile;
      setFirstName(p?.first_name ?? '');
      setLastName(p?.last_name ?? '');
      setDisplayName(p?.display_name ?? '');
      setPhone(u.phone_number ?? '');
      setCity(p?.location?.city ?? '');
      setCountry(p?.location?.country ?? '');
      setWebsite(p?.website ?? '');
      setLinkedin(p?.social_links?.linkedin ?? '');
      setBio(p?.bio ?? '');
      setAvatarUrl(p?.profile_picture ?? '');
      setCoverUrl(p?.cover_image ?? '');
      setSkills((p?.skills ?? []) as { name: string }[]);
      const s = u.settings;
      if (s) {
        setNotifs({
          email_notifications: s.email_notifications ?? true,
          push_notifications:  s.push_notifications  ?? true,
          sms_notifications:   s.sms_notifications   ?? false,
          marketing_emails:    s.marketing_emails    ?? false,
        });
        setPrivacy({
          profile_visibility: s.profile_visibility ?? 'public',
          show_location:      s.show_location      ?? true,
          show_earnings:      s.show_earnings      ?? false,
        });
      }
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'HTTP_401') setAuthError(true);
      else setLoadError(msg || 'Failed to load profile');
    }).finally(() => setLoading(false));
  }, []);

  // ── Save profile ─────────────────────────────────────────────────────────
  const saveProfile = async () => {
    setProfileSaving(true); setProfileMsg('');
    try {
      await profileApi.updateMe({
        profile: {
          first_name:   firstName  || undefined,
          last_name:    lastName   || undefined,
          display_name: displayName || undefined,
          bio:          bio        || undefined,
          website:      website    || undefined,
          location: { city: city || undefined, country: country || undefined },
          social_links: { linkedin: linkedin || undefined },
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

  // ── Avatar upload ─────────────────────────────────────────────────────────
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

  // ── Skills ────────────────────────────────────────────────────────────────
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

  // ── Phone ─────────────────────────────────────────────────────────────────
  const changePhone = async () => {
    if (!phone.match(/^\+\d{7,15}$/)) { setPhoneMsg('Use E.164: +12025551234'); return; }
    setPhoneSaving(true); setPhoneMsg('');
    try {
      await accountApi.updatePhone(phone);
      setPhoneMsg('Phone updated!');
    } catch (e: unknown) { setPhoneMsg(e instanceof Error ? e.message : 'Failed'); }
    finally { setPhoneSaving(false); setTimeout(() => setPhoneMsg(''), 3500); }
  };

  // ── Password ──────────────────────────────────────────────────────────────
  const changePassword = async () => {
    if (newPw !== confirmPw) { setPwMsg('Passwords do not match'); return; }
    if (newPw.length < 8)   { setPwMsg('Min 8 characters'); return; }
    setPwSaving(true); setPwMsg('');
    try {
      await accountApi.updatePassword(currentPw, newPw);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setPwMsg('Password updated!');
    } catch (e: unknown) { setPwMsg(e instanceof Error ? e.message : 'Failed'); }
    finally { setPwSaving(false); setTimeout(() => setPwMsg(''), 3500); }
  };

  // ── Notifications ─────────────────────────────────────────────────────────
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

  // ── Computed display values ───────────────────────────────────────────────
  const nameDisplay = [firstName, lastName].filter(Boolean).join(' ')
    || user?.profile?.display_name || user?.username || 'Your Profile';
  const avatar = avatarUrl
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(nameDisplay)}&background=195ad7&color=fff&size=128`;

  // ── Loading / error (wrapped in stable div so page-enter animation never restarts) ──
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
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl">🔒</div>
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
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-2xl">⚠️</div>
        <p className="text-gray-800 font-semibold text-lg">Could not load profile</p>
        <p className="text-red-500 text-sm max-w-sm text-center">{loadError}</p>
        <div className="flex gap-3">
          <button onClick={() => window.location.reload()}
            className="px-8 py-2.5 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition">
            Retry
          </button>
          <button onClick={() => router.push('/login')}
            className="px-8 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition">
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid lg:grid-cols-3 gap-6">

      {/* ── Left: profile card ──────────────────────────────────────────── */}
      <div className="lg:col-span-1 space-y-6">

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Cover */}
          <div className="h-28" style={{
            background: coverUrl
              ? `url(${coverUrl}) center/cover`
              : 'linear-gradient(135deg,#195ad7,#8b5cf6)',
          }} />

          <div className="px-6 pb-6 -mt-12">
            {/* Avatar */}
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar} className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg object-cover" alt={nameDisplay} />
              <label className="absolute -bottom-2 -right-2 w-7 h-7 bg-cobalt rounded-full flex items-center justify-center cursor-pointer border-2 border-white shadow hover:bg-blue-700 transition"
                title={avatarUploading ? 'Uploading…' : 'Change photo'}>
                {avatarUploading
                  ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <i className="fa-solid fa-camera text-white text-xs" />}
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{nameDisplay}</h2>
                <p className="text-sm text-gray-600 capitalize">{user?.account_type ?? 'Client'}</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                <i className="fa-solid fa-circle text-[8px] mr-1" />
                {user?.is_verified ? 'Verified' : 'Online'}
              </span>
            </div>

            <p className="text-sm text-gray-400 mt-1">@{user?.username}</p>

            <div className="grid grid-cols-2 gap-2 mt-5 pt-5 border-t border-gray-100">
              <div className="text-center">
                <p className="font-bold text-gray-900 capitalize">{user?.account_type}</p>
                <p className="text-xs text-gray-500">Role</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900">{user?.is_verified ? '✓ Verified' : 'Unverified'}</p>
                <p className="text-xs text-gray-500">Status</p>
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Skills / Interests</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {skills.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-cobalt text-xs font-semibold rounded-full">
                {s.name}
                <button onClick={() => removeSkill(i)} className="text-blue-300 hover:text-red-400 ml-1">&times;</button>
              </span>
            ))}
            {skills.length === 0 && <p className="text-xs text-gray-400">No skills yet</p>}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newSkill} onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSkill()}
              placeholder="Add skill…"
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cobalt" />
            <button onClick={addSkill} disabled={addingSkill || !newSkill.trim()}
              className="px-3 py-1.5 bg-cobalt text-white text-sm rounded-lg disabled:opacity-40">
              {addingSkill ? '…' : '+'}
            </button>
          </div>
        </div>

        {/* Contact / links */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3 text-sm">
          <h3 className="font-bold text-gray-900 mb-2">Contact</h3>
          {user?.email && (
            <div className="flex items-center gap-2 text-gray-600">
              <i className="fa-solid fa-envelope w-4 text-gray-400" />
              {user.email}
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <i className="fa-solid fa-phone w-4 text-gray-400" />
              {phone}
            </div>
          )}
          {(city || country) && (
            <div className="flex items-center gap-2 text-gray-600">
              <i className="fa-solid fa-location-dot w-4 text-gray-400" />
              {[city, country].filter(Boolean).join(', ')}
            </div>
          )}
          {website && (
            <div className="flex items-center gap-2 text-cobalt">
              <i className="fa-solid fa-globe w-4" />
              <a href={website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{website}</a>
            </div>
          )}
          {linkedin && (
            <div className="flex items-center gap-2 text-cobalt">
              <i className="fa-brands fa-linkedin w-4" />
              <a href={linkedin} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">LinkedIn</a>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: settings ─────────────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-6">

        {/* Account Settings */}
        <div id="settings" className="bg-white rounded-2xl border border-gray-200 p-8 scroll-mt-24">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Account Settings</h3>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="First Name">
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inp} />
            </Field>
            <Field label="Last Name">
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inp} />
            </Field>
            <Field label="Email">
              <input type="email" value={user?.email ?? ''} readOnly className={inp + ' bg-gray-50 text-gray-400 cursor-not-allowed'} />
            </Field>
            <Field label="Phone">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+12025551234" className={inp} />
            </Field>
            <Field label="City">
              <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Los Angeles" className={inp} />
            </Field>
            <Field label="Country">
              <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="United States" className={inp} />
            </Field>
            <Field label="Website">
              <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com" className={inp} />
            </Field>
            <Field label="LinkedIn">
              <input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" className={inp} />
            </Field>
          </div>
          <div className="mt-5">
            <Field label="Bio">
              <textarea rows={4} value={bio} onChange={e => setBio(e.target.value)}
                placeholder="Tell creators about your company and production style…" maxLength={500}
                className={inp + ' resize-none'} />
              <div className="text-xs text-gray-400 text-right mt-0.5">{bio.length}/500</div>
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-gray-100">
            <div className="flex items-center gap-3">
              {phoneMsg && <span className={`text-sm ${phoneMsg.includes('updat') ? 'text-green-600' : 'text-red-500'}`}>{phoneMsg}</span>}
              <button onClick={changePhone} disabled={phoneSaving}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
                {phoneSaving ? 'Saving…' : 'Update Phone'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              {profileMsg && <span className={`text-sm ${profileMsg.includes('uccess') ? 'text-green-600' : 'text-red-500'}`}>{profileMsg}</span>}
              <button onClick={() => { }} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveProfile} disabled={profileSaving}
                className="px-6 py-2.5 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">
                {profileSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Change Password</h3>
          <div className="space-y-4 max-w-md">
            <Field label="Current Password">
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className={inp} />
            </Field>
            <Field label="New Password">
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className={inp} />
            </Field>
            <Field label="Confirm New Password">
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={inp} />
            </Field>
            <div className="flex items-center gap-3 pt-2">
              {pwMsg && <span className={`text-sm ${pwMsg.includes('updat') ? 'text-green-600' : 'text-red-500'}`}>{pwMsg}</span>}
              <button onClick={changePassword} disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                className="px-6 py-2.5 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">
                {pwSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Notifications</h3>
          <div className="space-y-1">
            {notifDefs.map(n => (
              <div key={n.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{n.label}</p>
                  <p className="text-xs text-gray-500">{n.desc}</p>
                </div>
                <Toggle on={notifs[n.key]} onToggle={() => setNotifs(p => ({ ...p, [n.key]: !p[n.key] }))} />
              </div>
            ))}
          </div>

          {/* Privacy sub-section */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="font-bold text-gray-900 mb-4">Privacy</h4>
            <div className="space-y-3">
              {[
                { key: 'show_location', label: 'Show location on profile' },
                { key: 'show_earnings', label: 'Show spending on profile' },
              ].map(p => (
                <div key={p.key} className="flex items-center justify-between py-2">
                  <p className="text-sm font-medium text-gray-700">{p.label}</p>
                  <Toggle
                    on={privacy[p.key as keyof typeof privacy] as boolean}
                    onToggle={() => setPrivacy(prev => ({ ...prev, [p.key]: !prev[p.key as keyof typeof privacy] }))} />
                </div>
              ))}
              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Visibility</label>
                <select value={privacy.profile_visibility}
                  onChange={e => setPrivacy(p => ({ ...p, profile_visibility: e.target.value }))}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cobalt w-full sm:w-64">
                  <option value="public">Public — anyone can view</option>
                  <option value="connections">Connections only</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            {notifMsg && <span className="text-sm text-green-600">{notifMsg}</span>}
            <button onClick={saveNotifications} disabled={notifSaving}
              className="px-6 py-2.5 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50">
              {notifSaving ? 'Saving…' : 'Save Preferences'}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border border-rose-200 p-8">
          <h3 className="text-xl font-bold text-rose-700 mb-2">Danger Zone</h3>
          <p className="text-sm text-gray-600 mb-5">
            Deactivating your account will hide your profile from creators. You can reactivate any time.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => accountApi.deactivate().then(() => signOut())}
              className="px-5 py-2.5 border border-rose-200 text-rose-600 rounded-xl font-semibold hover:bg-rose-50 text-sm">
              Deactivate Account
            </button>
            <button onClick={signOut}
              className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black text-sm">
              Sign Out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
