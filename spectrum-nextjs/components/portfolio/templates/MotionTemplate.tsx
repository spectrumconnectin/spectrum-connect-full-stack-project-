import Link from 'next/link';
import type { PortfolioProject } from '@/lib/api';
import { formatMonthYear } from '@/lib/portfolio';
import MediaEmbed from './MediaEmbed';

/**
 * Motion / Video template — large video-first rows, one project at a time.
 * Best for video editors, cinematographers, animators.
 */
export default function MotionTemplate({ projects, handle }: { projects: PortfolioProject[]; handle: string }) {
  return (
    <div className="space-y-14 sm:space-y-16">
      {projects.map(p => {
        const media = [...(p.media || [])].sort((a, b) => a.order - b.order);
        const lead = media.find(m => m.type === 'video') || media[0];
        const rest = media.filter(m => m !== lead).slice(0, 3);
        const meta = [p.category, p.client, formatMonthYear(p.completion_date)].filter(Boolean).join(' · ');
        const href = `/portfolio/${handle}/${p.slug || p.id}`;
        return (
          <article key={p.id}>
            {/* Kept interactive (not link-wrapped) so video controls / iframes
                stay usable — the title and "Full case study" link below are the nav targets. */}
            {lead && <MediaEmbed media={lead} className="shadow-sm" />}
            <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-snug flex items-center gap-2">
                  <Link href={href} className="hover:text-cobalt transition-colors">{p.title}</Link>
                  {p.is_featured && <span className="text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-md">Featured</span>}
                </h3>
                {meta && <p className="text-xs text-gray-400 mt-1">{meta}</p>}
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 mt-1">
                <Link href={href} className="text-xs font-bold text-cobalt hover:underline inline-flex items-center gap-1.5">
                  Full case study <i className="fa-solid fa-arrow-right text-[10px]" />
                </Link>
                {p.external_link && (
                  <a href={p.external_link} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold text-gray-400 hover:text-gray-600 inline-flex items-center gap-1.5">
                    Live site <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                  </a>
                )}
              </div>
            </div>
            {p.description && (
              <p className="text-sm sm:text-[15px] text-gray-500 mt-2.5 leading-relaxed max-w-2xl whitespace-pre-line">{p.description}</p>
            )}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                {rest.map(m => <MediaEmbed key={m.id} media={m} className="h-full" />)}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
