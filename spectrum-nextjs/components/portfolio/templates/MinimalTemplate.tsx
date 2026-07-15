import Link from 'next/link';
import type { PortfolioProject } from '@/lib/api';
import { formatMonthYear, projectCover } from '@/lib/portfolio';

/**
 * Minimal / List template — clean, text-forward rows with thin dividers.
 * Best for developers, writers, and anyone who lets the work speak quietly.
 */
export default function MinimalTemplate({ projects, handle }: { projects: PortfolioProject[]; handle: string }) {
  return (
    <div className="divide-y divide-gray-100 border-y border-gray-100">
      {projects.map(p => {
        const cover = projectCover(p);
        const year = p.completion_date ? new Date(p.completion_date).getFullYear() : null;
        const href = `/portfolio/${handle}/${p.slug || p.id}`;
        return (
          <article key={p.id} className="py-7 sm:py-8 group">
            <div className="flex items-start gap-5 sm:gap-8">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                    <Link href={href} className="hover:text-cobalt transition-colors">{p.title}</Link>
                  </h3>
                  {year && <span className="text-sm text-gray-300 font-semibold tabular-nums">{year}</span>}
                </div>
                <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                  {p.category && <span className="text-xs font-bold tracking-wide text-gray-400 uppercase">{p.category}</span>}
                  {p.client && (
                    <>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">for {p.client}</span>
                    </>
                  )}
                  {p.is_featured && <span className="text-[11px] font-bold text-amber-600">★</span>}
                </div>
                {p.description && (
                  <p className="text-sm text-gray-500 mt-2.5 leading-relaxed line-clamp-3 max-w-xl">{p.description}</p>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <Link href={href} className="text-xs font-bold text-cobalt hover:underline inline-flex items-center gap-1.5">
                    Read case study <i className="fa-solid fa-arrow-right text-[10px]" />
                  </Link>
                  {p.external_link && (
                    <a href={p.external_link} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold text-gray-400 hover:text-gray-600 inline-flex items-center gap-1.5">
                      Live site <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                    </a>
                  )}
                  {p.media?.length > 0 && (
                    <span className="text-xs text-gray-300">{p.media.length} item{p.media.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
              {cover && (
                <Link href={href} className="hidden sm:block w-32 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cover} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
