import type { ProjectMedia } from '@/lib/api';
import { youtubeId, vimeoId } from '@/lib/portfolio';

/** Renders one media item: video embed, image, file chip, or link chip. */
export default function MediaEmbed({ media, className = '' }: { media: ProjectMedia; className?: string }) {
  if (media.type === 'video') {
    if (media.media_type === 'youtube') {
      const id = youtubeId(media.url);
      if (!id) return null;
      return (
        <div className={`relative aspect-video rounded-xl overflow-hidden bg-gray-900 ${className}`}>
          <iframe
            src={`https://www.youtube.com/embed/${id}?rel=0`}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={media.caption || 'Video'}
            loading="lazy"
          />
        </div>
      );
    }
    if (media.media_type === 'vimeo') {
      const id = vimeoId(media.url);
      if (!id) return null;
      return (
        <div className={`relative aspect-video rounded-xl overflow-hidden bg-gray-900 ${className}`}>
          <iframe
            src={`https://player.vimeo.com/video/${id}`}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            title={media.caption || 'Video'}
            loading="lazy"
          />
        </div>
      );
    }
    return (
      <div className={`relative aspect-video rounded-xl overflow-hidden bg-gray-900 ${className}`}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video src={media.url} controls poster={media.thumbnail || undefined} className="absolute inset-0 w-full h-full object-contain" preload="metadata" />
      </div>
    );
  }

  if (media.type === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={media.url} alt={media.caption || ''} loading="lazy" className={`w-full rounded-xl object-cover ${className}`} />
    );
  }

  // file / link — compact chip
  const isFile = media.type === 'file';
  return (
    <a
      href={media.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 hover:border-cobalt hover:text-cobalt transition ${className}`}
    >
      <i className={`fa-solid ${isFile ? 'fa-file-lines' : 'fa-arrow-up-right-from-square'} text-gray-400`} />
      {media.caption || (isFile ? `View ${media.media_type.toUpperCase()}` : 'Visit link')}
    </a>
  );
}
