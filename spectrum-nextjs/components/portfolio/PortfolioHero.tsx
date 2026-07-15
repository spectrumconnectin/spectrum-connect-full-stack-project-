import type { PublicPortfolio } from '@/lib/api';
import DownloadPdfButton from './DownloadPdfButton';

/**
 * Portfolio hero — photo, name, title, bio, skills, quick facts.
 * Premium/minimal: generous whitespace, restrained type, no clutter.
 * Server component (purely presentational).
 */
export default function PortfolioHero({ data }: { data: PublicPortfolio }) {
  const p = data.profile || {};
  const u = data.user;
  const name = p.display_name || u?.username || 'Creator';
  const title = p.headline || p.tagline;
  const loc = [p.location?.city, p.location?.country].filter(Boolean).join(', ');
  const skills = (p.skills || []).slice(0, 8);
  const rating = data.reviews?.average ?? p.rating;
  const reviewCount = data.reviews?.total ?? p.review_count ?? 0;

  return (
    <header className="relative">
      {/* Cover band */}
      <div
        className="h-40 sm:h-56 bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900"
        style={p.cover_image ? { backgroundImage: `url(${p.cover_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      />

      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        {/* Avatar overlapping the cover */}
        <div className="-mt-14 sm:-mt-16 mb-6">
          {p.profile_picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.profile_picture}
              alt={name}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-white shadow-lg bg-white"
            />
          ) : (
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-cobalt to-blue-500 border-4 border-white shadow-lg flex items-center justify-center text-white text-4xl font-bold">
              {name[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="pb-10 sm:pb-12 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5 flex-wrap">
                {name}
                {u?.is_verified && (
                  <span title="Verified creator" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-cobalt text-xs">
                    <i className="fa-solid fa-check" />
                  </span>
                )}
              </h1>
              {title && <p className="text-lg sm:text-xl text-gray-500 mt-1.5">{title}</p>}

              <div className="flex items-center gap-4 mt-3 text-sm text-gray-400 flex-wrap">
                {loc && <span className="flex items-center gap-1.5"><i className="fa-solid fa-location-dot" />{loc}</span>}
                {rating ? (
                  <span className="flex items-center gap-1.5 text-amber-500 font-semibold">
                    <i className="fa-solid fa-star" />{Number(rating).toFixed(1)}
                    <span className="text-gray-400 font-normal">({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
                  </span>
                ) : null}
                {p.hourly_rate_min ? (
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-money-bill-wave text-gray-300" />
                    from ${p.hourly_rate_min}/hr
                  </span>
                ) : null}
              </div>
            </div>

            {/* CTA */}
            <div data-no-print className="flex-shrink-0 flex items-center gap-2.5 flex-wrap">
              <DownloadPdfButton />
              <a
                href="#contact"
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-black active:scale-[0.98] transition shadow-sm"
              >
                <i className="fa-regular fa-paper-plane" /> Get in touch
              </a>
            </div>
          </div>

          {p.bio && (
            <p className="text-gray-600 leading-relaxed mt-6 max-w-2xl whitespace-pre-line">{p.bio}</p>
          )}

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {skills.map(s => (
                <span key={s.name} className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
