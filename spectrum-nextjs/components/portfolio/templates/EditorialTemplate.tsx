import Link from 'next/link';
import type { PortfolioProject } from '@/lib/api';
import { formatMonthYear, projectCover } from '@/lib/portfolio';

/**
 * Editorial template — text-forward, one full-width project at a time with a
 * large headline and a generous reading column. Best for writers, directors,
 * photographers who want a magazine feel rather than a grid.
 */
export default function EditorialTemplate({ projects, handle }: { projects: PortfolioProject[]; handle: string }) {
  return (
    <div className="divide-y divide-gray-100">
      {projects.map((p, idx) => {
        const cover = projectCover(p);
        const meta = [p.category, p.client, formatMonthYear(p.completion_date)].filter(Boolean).join(' · ');
        const href = `/portfolio/${handle}/${p.slug || p.id}`;
        return (
          <article key={p.id} className={`py-12 sm:py-16 ${idx === 0 ? 'pt-0' : ''} group`}>
            {p.is_featured && (
              <p className="text-[11px] font-bold tracking-widest text-amber-600 uppercase mb-3">★ Featured</p>
            )}
            <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-[1.1] max-w-2xl">
              <Link href={href} className="hover:text-cobalt transition-colors">{p.title}</Link>
            </h3>
            {meta && <p className="text-sm text-gray-400 mt-3 font-medium">{meta}</p>}

            {cover && (
              <Link href={href} className="block mt-7 rounded-2xl overflow-hidden bg-gray-100 aspect-[16/9] max-w-3xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt={p.title} loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
              </Link>
            )}

            {p.description && (
              <p className="text-base sm:text-lg text-gray-600 mt-6 leading-relaxed max-w-2xl whitespace-pre-line">
                {p.description}
              </p>
            )}

            <div className="flex items-center gap-5 mt-6">
              <Link href={href} className="text-sm font-bold text-cobalt hover:underline inline-flex items-center gap-2">
                Read the full story <i className="fa-solid fa-arrow-right text-xs" />
              </Link>
              {p.external_link && (
                <a href={p.external_link} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-semibold text-gray-400 hover:text-gray-600 inline-flex items-center gap-2">
                  Live site <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                </a>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
