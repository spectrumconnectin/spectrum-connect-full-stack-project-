'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { profile as profileApi, PublicProfile, jobs, messaging, proposals, JobPostItem } from '@/lib/api';
import PortfolioSection from '@/components/PortfolioSection';
import EtfBadge from '@/components/EtfBadge';

function formatRate(min?: number, max?: number): string {
  if (!min && !max) return 'Rate TBD';
  if (min && max) return `$${min}–$${max}/hr`;
  if (min) return `$${min}+/hr`;
  return `$${max}/hr`;
}

function displayName(p: PublicProfile): string {
  const pr = p.profile;
  if (!pr) return p.username;
  return pr.display_name || `${pr.first_name || ''} ${pr.last_name || ''}`.trim() || p.username;
}

function locationStr(p: PublicProfile): string {
  const loc = p.profile?.location;
  if (!loc) return '';
  return [loc.city, loc.country].filter(Boolean).join(', ');
}

export default function CollaboratorProfilePage() {
  const { id } = useParams<{ id: string }>();

  const [creator, setCreator] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [myProjects, setMyProjects] = useState<JobPostItem[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  // Hire Directly modal
  const [showHire, setShowHire] = useState(false);
  const [hireProject, setHireProject] = useState('');
  const [hireNote, setHireNote] = useState('');
  const [hiring, setHiring] = useState(false);
  const [hireDone, setHireDone] = useState(false);
  const [hireError, setHireError] = useState('');

  useEffect(() => {
    if (!id) return;
    profileApi.getPublic(id)
      .then(data => setCreator(data))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  const loadProjects = async () => {
    if (myProjects.length > 0) return;
    try {
      const data = await jobs.getMe();
      setMyProjects((data || []).filter((j: JobPostItem) => j.status === 'open'));
    } catch { /* silent */ }
  };

  const openInvite = async () => {
    setShowInvite(true); setInviteSent(false);
    setSelectedProject(''); setInviteNote('');
    await loadProjects();
  };

  const openHire = async () => {
    setShowHire(true); setHireDone(false);
    setHireProject(''); setHireNote(''); setHireError('');
    await loadProjects();
  };

  const doDirectHire = async () => {
    if (!hireProject || !creator) return;
    setHiring(true); setHireError('');
    try {
      await proposals.directHire({
        job_id: hireProject,
        creator_id: creator.id,
        note: hireNote.trim() || undefined,
      });
      setHireDone(true);
    } catch (e) {
      setHireError((e as Error).message);
    } finally {
      setHiring(false);
    }
  };

  const sendInvite = async () => {
    if (!selectedProject || !creator) return;
    setSending(true);
    try {
      const job = myProjects.find(j => j.id === selectedProject);
      const msg = [
        `👋 Hi! I'd like to invite you to apply for my project: **${job?.title || 'My Project'}**`,
        '',
        inviteNote || 'I think your skills would be a great fit. Please take a look and apply if you\'re interested!',
        '',
        `View project: ${typeof window !== 'undefined' ? window.location.origin : ''}/creator/find-projects/${selectedProject}`,
      ].join('\n');
      await messaging.createConversation([creator.id], selectedProject, msg);
      try {
        const { notifications } = await import('@/lib/api');
        await notifications.send?.({
          user_id: creator.id,
          type: 'proposal',
          category: 'info',
          title: `You've been invited to apply for a project`,
          message: `${job?.title || 'A client'} wants to work with you. Check your messages.`,
          action_url: '/creator/messaging',
          action_text: 'View invite',
        });
      } catch { /* best-effort */ }
      setInviteSent(true);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Loading profile…</p>
    </div>
  );

  if (error || !creator) return (
    <div className="text-center py-24">
      <i className="fa-solid fa-circle-exclamation text-5xl text-red-300 mb-4 block"></i>
      <h3 className="font-semibold text-gray-600 text-lg mb-2">Could not load profile</h3>
      <p className="text-gray-400 text-sm mb-4">{error}</p>
      <Link href="/client/collaborators" className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
        Back to Search
      </Link>
    </div>
  );

  const pr = creator.profile;
  const name = displayName(creator);
  const location = locationStr(creator);
  const rate = formatRate(pr?.hourly_rate_min, pr?.hourly_rate_max);
  const skills = pr?.skills || [];
  const experience = pr?.experience || [];
  const education = pr?.education || [];
  const certifications = pr?.certifications || [];
  const stats = creator.stats;
  const completedProjects = stats?.completed_credits ?? stats?.active_projects ?? 0;

  return (
    <>
      {/* Back */}
      <div className="mb-6">
        <Link href="/client/collaborators"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm transition">
          <i className="fa-solid fa-arrow-left text-xs"></i>Back to Search
        </Link>
      </div>

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-cobalt to-blue-500 rounded-3xl p-8 text-white mb-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        {pr?.cover_image && (
          <div className="absolute inset-0 opacity-20 rounded-3xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pr.cover_image} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="relative z-10 flex items-start gap-6 flex-wrap">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {pr?.profile_picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pr.profile_picture} alt={name}
                className="w-24 h-24 rounded-2xl border-4 border-white/30 shadow-lg object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-2xl border-4 border-white/30 shadow-lg bg-white/20 flex items-center justify-center text-white font-bold text-4xl">
                {name[0]?.toUpperCase()}
              </div>
            )}
            {/* Availability dot */}
            {creator.availability_status && (
              <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow ${
                creator.availability_status === 'available' ? 'bg-green-500' :
                creator.availability_status === 'busy' ? 'bg-amber-400' : 'bg-gray-400'
              }`} title={creator.availability_status === 'available' ? 'Available now' : creator.availability_status === 'busy' ? 'Busy' : 'Unavailable'} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-3xl font-bold">{name}</h1>
              {creator.is_verified && (
                <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/30">
                  <i className="fa-solid fa-circle-check mr-1"></i>Verified
                </span>
              )}
            </div>
            {pr?.headline && <p className="text-blue-100 text-lg mb-1">{pr.headline}</p>}
            {location && (
              <p className="text-blue-200 text-sm mb-3">
                <i className="fa-solid fa-location-dot mr-1"></i>{location}
              </p>
            )}
            <div className="flex items-center gap-4 flex-wrap text-sm">
              {(pr?.hourly_rate_min || pr?.hourly_rate_max) && (
                <span><i className="fa-solid fa-wallet mr-1"></i>{rate}</span>
              )}
              {creator.availability_status && (
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  creator.availability_status === 'available' ? 'bg-green-500/20 text-green-100' :
                  creator.availability_status === 'busy' ? 'bg-amber-500/20 text-amber-100' :
                  'bg-white/10 text-white/60'
                }`}>
                  {creator.availability_status === 'available' ? 'Available now' :
                   creator.availability_status === 'busy' ? 'Busy' : 'Unavailable'}
                </span>
              )}
              {creator.rating != null && creator.rating > 0 && (
                <span><i className="fa-solid fa-star text-yellow-300 mr-1"></i>{creator.rating.toFixed(1)} ({creator.review_count ?? 0} reviews)</span>
              )}
              {stats?.response_time != null && stats.response_time > 0 && (
                <span><i className="fa-solid fa-clock mr-1"></i>~{stats.response_time}h response</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 flex-shrink-0">
            <Link href={`/client/messaging?userId=${id}`}
              className="bg-white text-cobalt px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition shadow-md text-sm text-center">
              <i className="fa-solid fa-comment mr-2"></i>Message
            </Link>
            <button onClick={openInvite}
              className="bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition border border-white/30 text-sm">
              <i className="fa-solid fa-user-plus mr-2"></i>Invite to Project
            </button>
            <button onClick={openHire}
              className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-600 transition shadow-md text-sm">
              <i className="fa-solid fa-handshake mr-2"></i>Hire Directly
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">

        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Bio & Skills */}
          {(pr?.bio || pr?.tagline || skills.length > 0) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
              {pr?.tagline && <p className="text-cobalt font-semibold mb-3 text-base">{pr.tagline}</p>}
              {pr?.bio && <p className="text-gray-600 leading-relaxed whitespace-pre-line">{pr.bio}</p>}
              {skills.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map(s => (
                      <span key={s.name} className="text-sm px-3 py-1.5 bg-blue-50 text-cobalt rounded-full font-medium">{s.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Portfolio — the most important section for decision-making */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Portfolio</h2>
            <p className="text-sm text-gray-500 mb-5">Up to 2 videos and 3 images</p>
            <PortfolioSection editable={false} userId={id as string} />
          </div>

          {/* Experience */}
          {experience.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Experience</h2>
              <div className="space-y-5">
                {experience.map((exp, i) => (
                  <div key={i} className="flex gap-4 pb-5 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="fa-solid fa-briefcase text-cobalt text-sm"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{exp.title}</h3>
                      {exp.company && <p className="text-cobalt font-medium text-sm">{exp.company}</p>}
                      {exp.location && <p className="text-gray-400 text-xs">{exp.location}</p>}
                      {(exp.start_date || exp.end_date) && (
                        <p className="text-gray-400 text-xs mt-1">
                          {exp.start_date?.slice(0, 7)} — {exp.current ? 'Present' : exp.end_date?.slice(0, 7) || ''}
                        </p>
                      )}
                      {exp.description && <p className="text-gray-600 text-sm mt-2 leading-relaxed">{exp.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Education</h2>
              <div className="space-y-5">
                {education.map((edu, i) => (
                  <div key={i} className="flex gap-4 pb-5 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="fa-solid fa-graduation-cap text-purple-600 text-sm"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{edu.degree}</h3>
                      <p className="text-purple-600 font-medium text-sm">{edu.institution}</p>
                      {edu.field_of_study && <p className="text-gray-500 text-sm">{edu.field_of_study}</p>}
                      {(edu.start_date || edu.end_date) && (
                        <p className="text-gray-400 text-xs mt-1">{edu.start_date?.slice(0, 4)} — {edu.end_date?.slice(0, 4) || 'Present'}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Certifications</h2>
              <div className="space-y-4">
                {certifications.map((cert, i) => (
                  <div key={i} className="flex gap-4 items-start pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-medal text-amber-600 text-sm"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{cert.name}</h3>
                      <p className="text-gray-500 text-sm">{cert.issuing_organization}</p>
                      {cert.issue_date && <p className="text-gray-400 text-xs mt-0.5">{cert.issue_date?.slice(0, 7)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!pr?.bio && skills.length === 0 && experience.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <i className="fa-solid fa-user text-4xl text-gray-300 mb-4 block"></i>
              <p className="text-gray-500">This creator hasn&apos;t filled out their profile yet.</p>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">

          {/* Contact CTA */}
          <div className="bg-cobalt text-white rounded-2xl p-6 text-center shadow-lg">
            {(pr?.hourly_rate_min || pr?.hourly_rate_max) ? (
              <>
                <div className="text-3xl font-bold mb-0.5">{rate}</div>
                <p className="text-blue-200 text-xs mb-4">Hourly rate</p>
              </>
            ) : (
              <p className="text-blue-200 text-sm mb-4">Rate negotiable</p>
            )}
            <Link href={`/client/messaging?userId=${id}`}
              className="block bg-white text-cobalt px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition mb-3 text-sm text-center">
              <i className="fa-solid fa-comment mr-2"></i>Message {name.split(' ')[0]}
            </Link>
            <button onClick={openHire}
              className="block w-full bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-600 transition mb-2 text-sm">
              <i className="fa-solid fa-handshake mr-2"></i>Hire Directly
            </button>
            <button onClick={openInvite}
              className="block w-full bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition border border-white/30 text-sm">
              <i className="fa-solid fa-user-plus mr-2"></i>Invite to Project
            </button>
          </div>

          {/* ETF Level & Trust */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">ETF — Earn Trust Framework</h3>
            <div className="flex items-center gap-3 mb-4">
              <EtfBadge userId={id as string} size="md" />
              <div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  ETF level reflects this creator&apos;s track record, reliability, and platform activity.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
              {[
                { label: 'Completed', value: completedProjects > 0 ? `${completedProjects} projects` : '—', icon: 'fa-check-circle', color: 'text-emerald-600' },
                { label: 'Success rate', value: stats?.success_rate ? `${stats.success_rate.toFixed(0)}%` : '—', icon: 'fa-chart-line', color: 'text-cobalt' },
                { label: 'Response', value: stats?.response_time ? `~${stats.response_time}h` : '—', icon: 'fa-clock', color: 'text-amber-600' },
                { label: 'Active now', value: stats?.active_projects != null ? `${stats.active_projects}` : '—', icon: 'fa-briefcase', color: 'text-purple-600' },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="text-center p-2.5 bg-gray-50 rounded-xl">
                  <i className={`fa-solid ${icon} ${color} text-lg mb-1 block`}></i>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-bold text-gray-900 text-sm">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Previous Work — Platform track record */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Previous Work</h3>
            {(completedProjects > 0 || (creator.rating != null && creator.rating > 0)) ? (
              <div className="space-y-3">
                {completedProjects > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                    <i className="fa-solid fa-circle-check text-emerald-600 text-lg flex-shrink-0"></i>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{completedProjects} project{completedProjects !== 1 ? 's' : ''} completed</p>
                      <p className="text-xs text-gray-500">on Spectrum Connect</p>
                    </div>
                  </div>
                )}
                {creator.rating != null && creator.rating > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                    <i className="fa-solid fa-star text-amber-500 text-lg flex-shrink-0"></i>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{creator.rating.toFixed(1)} / 5.0 average rating</p>
                      <p className="text-xs text-gray-500">{creator.review_count ?? 0} client review{(creator.review_count ?? 0) !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                )}
                {stats?.success_rate != null && stats.success_rate > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <i className="fa-solid fa-chart-line text-cobalt text-lg flex-shrink-0"></i>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{stats.success_rate.toFixed(0)}% success rate</p>
                      <p className="text-xs text-gray-500">clients satisfied</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-3">
                No completed projects yet — this may be a new creator.
              </p>
            )}
          </div>

          {/* Reviews */}
          {(creator.rating != null && creator.rating > 0) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Reviews</h3>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900">{creator.rating.toFixed(1)}</div>
                  <div className="flex items-center justify-center gap-0.5 mt-1">
                    {[1,2,3,4,5].map(star => (
                      <i key={star} className={`fa-solid fa-star text-sm ${star <= Math.round(creator.rating!) ? 'text-yellow-400' : 'text-gray-200'}`}></i>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {creator.review_count ?? 0} review{(creator.review_count ?? 0) !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Links */}
          {pr?.social_links && Object.values(pr.social_links).some(Boolean) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Links</h3>
              <div className="space-y-3">
                {pr.social_links.linkedin && (
                  <a href={pr.social_links.linkedin} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-cobalt transition">
                    <i className="fa-brands fa-linkedin text-blue-600 w-5"></i>LinkedIn
                  </a>
                )}
                {pr.social_links.imdb && (
                  <a href={pr.social_links.imdb} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-cobalt transition">
                    <i className="fa-brands fa-imdb text-yellow-500 w-5"></i>IMDb
                  </a>
                )}
                {pr.social_links.vimeo && (
                  <a href={pr.social_links.vimeo} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-cobalt transition">
                    <i className="fa-brands fa-vimeo text-sky-500 w-5"></i>Vimeo
                  </a>
                )}
                {pr.social_links.portfolio && (
                  <a href={pr.social_links.portfolio} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-cobalt transition">
                    <i className="fa-solid fa-globe text-cobalt w-5"></i>Portfolio site
                  </a>
                )}
                {pr?.website && (
                  <a href={pr.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-cobalt transition">
                    <i className="fa-solid fa-link text-gray-400 w-5"></i>Website
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Hire Directly Modal ── */}
      {showHire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowHire(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            {hireDone ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fa-solid fa-handshake text-emerald-600 text-2xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Hired!</h3>
                <p className="text-gray-500 text-sm mb-2">
                  {name} has been added to your project. They&apos;ll receive a notification and a welcome message.
                </p>
                <p className="text-xs text-gray-400 mb-5">Next: fund escrow so they can start work.</p>
                <div className="flex gap-3">
                  <Link href="/client/payments"
                    className="flex-1 text-center px-4 py-2.5 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition text-sm">
                    Fund Escrow
                  </Link>
                  <button onClick={() => setShowHire(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition text-sm">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Hire Directly</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Skip the proposal process and hire now</p>
                  </div>
                  <button onClick={() => setShowHire(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 rounded-xl">
                  {pr?.profile_picture
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={pr.profile_picture} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    : <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">{name[0]}</div>
                  }
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{name}</p>
                    <p className="text-gray-500 text-xs">{pr?.headline || 'Creator'}</p>
                  </div>
                </div>

                {hireError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <i className="fa-solid fa-circle-exclamation mr-2"></i>{hireError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Project <span className="text-red-500">*</span></label>
                    {myProjects.length === 0 ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                        <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                        No open projects. <Link href="/client/projects/create" className="font-semibold underline">Create one first</Link>.
                      </div>
                    ) : (
                      <select value={hireProject} onChange={e => setHireProject(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-cobalt">
                        <option value="">Choose a project…</option>
                        {myProjects.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Welcome message <span className="text-gray-400 font-normal">(optional)</span></label>
                    <textarea value={hireNote} onChange={e => setHireNote(e.target.value)}
                      placeholder={`e.g. "Excited to work with you on this project!"`}
                      rows={3}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-cobalt resize-none" />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4 text-xs text-amber-700">
                  <i className="fa-solid fa-circle-info mr-2"></i>
                  The creator will be hired immediately and notified. You&apos;ll need to fund escrow before work begins.
                </div>

                <div className="flex gap-3 mt-5">
                  <button onClick={() => setShowHire(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition text-sm">Cancel</button>
                  <button onClick={doDirectHire} disabled={!hireProject || hiring}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition text-sm">
                    {hiring ? <><i className="fa-solid fa-spinner animate-spin mr-2"></i>Hiring…</> : <><i className="fa-solid fa-handshake mr-2"></i>Confirm Hire</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Invite Modal ── */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowInvite(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            {inviteSent ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fa-solid fa-check text-emerald-600 text-2xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Invite Sent!</h3>
                <p className="text-gray-500 text-sm mb-5">{name} will receive your invitation in their messages.</p>
                <button onClick={() => setShowInvite(false)}
                  className="px-6 py-2.5 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition text-sm">Done</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold text-gray-900">Invite to Project</h3>
                  <button onClick={() => setShowInvite(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 rounded-xl">
                  {pr?.profile_picture
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={pr.profile_picture} alt={name} className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                    : <div className="w-10 h-10 rounded-full bg-cobalt flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{name[0]}</div>
                  }
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{name}</p>
                    <p className="text-gray-500 text-xs">{pr?.headline || 'Creator'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Project <span className="text-red-500">*</span></label>
                    {myProjects.length === 0 ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                        <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                        No open projects. <Link href="/client/projects/create" className="font-semibold underline">Create one first</Link>.
                      </div>
                    ) : (
                      <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-cobalt">
                        <option value="">Choose a project…</option>
                        {myProjects.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Personal note <span className="text-gray-400 font-normal">(optional)</span></label>
                    <textarea value={inviteNote} onChange={e => setInviteNote(e.target.value)}
                      placeholder={`Tell ${name.split(' ')[0]} why you think they'd be a great fit…`}
                      rows={3}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-cobalt resize-none" />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setShowInvite(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition text-sm">Cancel</button>
                  <button onClick={sendInvite} disabled={!selectedProject || sending}
                    className="flex-1 px-4 py-2.5 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition text-sm">
                    {sending ? <><i className="fa-solid fa-spinner animate-spin mr-2"></i>Sending…</> : <><i className="fa-solid fa-paper-plane mr-2"></i>Send Invite</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
