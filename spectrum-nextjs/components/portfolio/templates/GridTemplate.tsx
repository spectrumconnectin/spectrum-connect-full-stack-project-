'use client';

import { useRef } from 'react';
import Link from 'next/link';
import type { PortfolioProject } from '@/lib/api';
import { projectCover } from '@/lib/portfolio';

/** One grid cell. Direct-uploaded MP4 covers autoplay (muted, looped) on
 * hover — YouTube/Vimeo covers stay a static thumbnail (reliably autoplaying
 * many embedded iframes in a dense grid is a real perf/cross-browser cost
 * that isn't worth it here). */
function GridCell({ project, href }: { project: PortfolioProject; href: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const media = [...(project.media || [])].sort((a, b) => a.order - b.order);
  const coverMedia = media.find(m => m.id === project.cover_media_id) || media[0];
  const isDirectVideo = coverMedia?.type === 'video' && coverMedia.media_type === 'mp4';
  const staticCover = projectCover(project);

  return (
    <Link
      href={href}
      className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 block"
      onMouseEnter={() => { if (isDirectVideo) videoRef.current?.play().catch(() => {}); }}
      onMouseLeave={() => { if (isDirectVideo) { videoRef.current?.pause(); if (videoRef.current) videoRef.current.currentTime = 0; } }}
    >
      {isDirectVideo ? (
        <video
          ref={videoRef}
          src={coverMedia.url}
          poster={coverMedia.thumbnail || undefined}
          muted loop playsInline preload="none"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : staticCover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={staticCover} alt={project.title} loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <i className="fa-regular fa-image text-2xl text-gray-300" />
        </div>
      )}

      {isDirectVideo && (
        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white text-[10px] group-hover:opacity-0 transition-opacity">
          <i className="fa-solid fa-play" />
        </span>
      )}
      {/* Hover overlay with title */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
        <div>
          <p className="text-white text-xs font-bold leading-tight line-clamp-2">{project.title}</p>
          {project.category && <p className="text-white/70 text-[10px] mt-0.5">{project.category}</p>}
        </div>
      </div>
      {project.is_featured && (
        <span className="absolute top-2 left-2 text-[10px] font-bold bg-white/90 backdrop-blur px-2 py-0.5 rounded-md text-gray-800 shadow-sm">★</span>
      )}
    </Link>
  );
}

/**
 * Grid template — dense Instagram-style uniform square grid, image-forward.
 * Best for illustrators, social/short-form creators.
 */
export default function GridTemplate({ projects, handle }: { projects: PortfolioProject[]; handle: string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
      {projects.map(p => (
        <GridCell key={p.id} project={p} href={`/portfolio/${handle}/${p.slug || p.id}`} />
      ))}
    </div>
  );
}
