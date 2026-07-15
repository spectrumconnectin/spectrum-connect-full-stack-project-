import Link from 'next/link';
import type { PortfolioProject } from '@/lib/api';
import { formatMonthYear, projectCover } from '@/lib/portfolio';

/**
 * Visual / Creative template — image-forward masonry grid.
 * Best for designers, photographers, illustrators.
 * CSS-columns masonry works fully server-side (no JS).
 */
export default function VisualTemplate({ projects, handle }: { projects: PortfolioProject[]; handle: string }) {
  return (
    <div className="columns-1 sm:columns-2 gap-6 [&>*]:break-inside-avoid">
      {projects.map((p, idx) => {
        const cover = projectCover(p);
        const meta = [p.category, p.client, formatMonthYear(p.completion_date)].filter(Boolean).join(' · ');
        // Vary image aspect for a natural masonry rhythm
        const aspect = idx % 3 === 0 ? 'aspect-[4/3]' : idx % 3 === 1 ? 'aspect-square' : 'aspect-[3/4]';
        const href = `/portfolio/${handle}/${p.slug || p.id}`;
        return (
          <article key={p.id} className="mb-6 group">
            <Link href={href} className={`relative ${aspect} rounded-2xl overflow-hidden bg-gray-100 block`}>
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt={p.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <i className="fa-regular fa-image text-3xl text-gray-300" />
                </div>
              )}
              {p.is_featured && (
                <span className="absolute top-3 left-3 text-[11px] font-bold bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg text-gray-800 shadow-sm">
                  ★ Featured
                </span>
              )}
            </Link>
            <div className="pt-3 px-0.5">
              <h3 className="font-bold text-gray-900 leading-snug">
                <Link href={href} className="hover:text-cobalt transition-colors">{p.title}</Link>
              </h3>
              {meta && <p className="text-xs text-gray-400 mt-0.5">{meta}</p>}
              {p.description && (
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{p.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2">
                <Link href={href} className="inline-flex items-center gap-1.5 text-xs font-bold text-cobalt hover:underline">
                  View case study <i className="fa-solid fa-arrow-right text-[10px]" />
                </Link>
                {p.external_link && (
                  <a href={p.external_link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600">
                    Live site <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                  </a>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
