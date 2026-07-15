import type { PublicPortfolio } from '@/lib/api';

function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber-400 text-sm tracking-tight">
      {Array.from({ length: 5 }).map((_, i) => (
        <i key={i} className={`fa-${i < Math.round(n) ? 'solid' : 'regular'} fa-star`} />
      ))}
    </span>
  );
}

/** Client reviews — social proof. Hidden entirely when there are none. */
export default function PortfolioReviews({ reviews }: { reviews: PublicPortfolio['reviews'] }) {
  const items = reviews?.reviews || [];
  if (!items.length) return null;

  return (
    <section className="max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-16 border-b border-gray-100">
      <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Client Reviews</p>
        {reviews?.average ? (
          <p className="text-sm text-gray-500">
            <span className="text-2xl font-extrabold text-gray-900">{reviews.average.toFixed(1)}</span>
            <span className="text-gray-300 mx-1.5">/</span>5 · {reviews.total} review{reviews.total !== 1 ? 's' : ''}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {items.slice(0, 6).map((r, i) => (
          <figure key={i} className="bg-gray-50 rounded-2xl p-5">
            <Stars n={r.overall || 0} />
            {r.review && (
              <blockquote className="text-sm text-gray-600 leading-relaxed mt-3 line-clamp-4">
                “{r.review}”
              </blockquote>
            )}
            {r.tags && r.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {r.tags.slice(0, 3).map(t => (
                  <span key={t} className="text-[11px] font-semibold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-md">{t}</span>
                ))}
              </div>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
