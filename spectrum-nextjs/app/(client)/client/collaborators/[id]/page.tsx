'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { profile as profileApi, PublicProfile } from '../../../../lib/api';

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

  useEffect(() => {
    if (!id) return;
    profileApi.getPublic(id)
      .then(data => setCreator(data))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading profile…</p>
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="text-center py-24">
        <i className="fa-solid fa-circle-exclamation text-5xl text-red-300 mb-4 block"></i>
        <h3 className="font-semibold text-gray-600 text-lg mb-2">Could not load profile</h3>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <Link href="/client/collaborators" className="px-5 py-2.5 bg-cobalt text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          Back to Search
        </Link>
      </div>
    );
  }

  const pr = creator.profile;
  const name = displayName(creator);
  const location = locationStr(creator);
  const rate = formatRate(pr?.hourly_rate_min, pr?.hourly_rate_max);
  const skills = pr?.skills || [];
  const experience = pr?.experience || [];
  const education = pr?.education || [];
  const certifications = pr?.certifications || [];
  const stats = creator.stats;

  return (
    <>
      {/* Back */}
      <div className="mb-6">
        <Link href="/client/collaborators"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm transition">
          <i className="fa-solid fa-arrow-left"></i>Back to Search
        </Link>
      </div>

      {/* Profile hero */}
      <div className="bg-gradient-to-br from-cobalt to-blue-500 rounded-3xl p-8 text-white mb-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Cover image strip */}
        {pr?.cover_image && (
          <div className="absolute inset-0 opacity-20 rounded-3xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pr.cover_image} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="relative z-10 flex items-start gap-6 flex-wrap">
          {/* Avatar */}
          {pr?.profile_picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pr.profile_picture} alt={name}
              className="w-24 h-24 rounded-2xl border-4 border-white/30 shadow-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-24 h-24 rounded-2xl border-4 border-white/30 shadow-lg bg-white/20 flex items-center justify-center text-white font-bold text-4xl flex-shrink-0">
              {name[0]?.toUpperCase()}
            </div>
          )}

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
            <div className="flex items-center gap-5 flex-wrap text-sm">
              {(pr?.hourly_rate_min || pr?.hourly_rate_max) && (
                <span><i className="fa-solid fa-wallet mr-1"></i>{rate}</span>
              )}
              {stats?.active_projects != null && (
                <span><i className="fa-solid fa-briefcase mr-1"></i>{stats.active_projects} active projects</span>
              )}
              {stats?.success_rate != null && stats.success_rate > 0 && (
                <span><i className="fa-solid fa-star text-yellow-300 mr-1"></i>{stats.success_rate.toFixed(0)}% success</span>
              )}
              {stats?.response_time != null && (
                <span><i className="fa-solid fa-clock mr-1"></i>~{stats.response_time}h response</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 flex-shrink-0">
            <Link href="/client/messaging"
              className="bg-white text-cobalt px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition shadow-md text-sm text-center">
              <i className="fa-solid fa-comment mr-2"></i>Message
            </Link>
            <Link href="/client/projects/create"
              className="bg-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/30 transition border border-white/30 text-sm text-center">
              <i className="fa-solid fa-user-plus mr-2"></i>Invite to Project
            </Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── Main ── */}
        <div className="lg:col-span-2 space-y-8">

          {/* About */}
          {(pr?.bio || pr?.tagline || skills.length > 0) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
              {pr?.tagline && <p className="text-cobalt font-semibold mb-3">{pr.tagline}</p>}
              {pr?.bio && <p className="text-gray-600 leading-relaxed whitespace-pre-line">{pr.bio}</p>}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-5">
                  {skills.map(s => (
                    <span key={s.name} className="text-sm px-3 py-1.5 bg-blue-50 text-cobalt rounded-full font-medium">{s.name}</span>
                  ))}
                </div>
              )}
            </div>
          )}

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

          {/* Empty state when no content */}
          {!pr?.bio && skills.length === 0 && experience.length === 0 && education.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
              <i className="fa-solid fa-user text-4xl text-gray-300 mb-4 block"></i>
              <p className="text-gray-500">This creator hasn&apos;t filled out their profile yet.</p>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          {/* Stats */}
          {stats && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Quick Stats</h3>
              {[
                { label: 'Active Projects',  value: stats.active_projects ?? '—' },
                { label: 'Success Rate',     value: stats.success_rate ? `${stats.success_rate.toFixed(0)}%` : '—' },
                { label: 'Response Time',    value: stats.response_time ? `~${stats.response_time}h` : '—' },
                { label: 'Profile Views',    value: stats.profile_views?.toLocaleString() ?? '—' },
                { label: 'Connections',      value: stats.total_connections?.toLocaleString() ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-600">{label}</span>
                  <span className="font-bold text-gray-900 text-sm">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Social links */}
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
                    <i className="fa-solid fa-globe text-cobalt w-5"></i>Portfolio
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

          {/* Rate + hire CTA */}
          <div className="bg-cobalt text-white rounded-2xl p-6 text-center shadow-lg">
            {(pr?.hourly_rate_min || pr?.hourly_rate_max) ? (
              <>
                <div className="text-3xl font-bold mb-1">
                  {rate}
                </div>
                <p className="text-blue-200 text-sm mb-5">Hourly rate</p>
              </>
            ) : (
              <p className="text-blue-200 text-sm mb-5">Rate negotiable</p>
            )}
            <Link href="/client/messaging"
              className="block bg-white text-cobalt px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition mb-3 text-sm">
              Message {name.split(' ')[0]}
            </Link>
            <Link href="/client/projects/create"
              className="block bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition border border-white/30 text-sm">
              Invite to Project
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
