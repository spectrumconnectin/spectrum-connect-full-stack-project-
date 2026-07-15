import type { PublicPortfolio } from '@/lib/api';

const LINK_META: Record<string, { icon: string; label: string }> = {
  linkedin: { icon: 'fa-brands fa-linkedin-in', label: 'LinkedIn' },
  imdb: { icon: 'fa-brands fa-imdb', label: 'IMDb' },
  vimeo: { icon: 'fa-brands fa-vimeo-v', label: 'Vimeo' },
  portfolio: { icon: 'fa-solid fa-globe', label: 'Portfolio' },
};

/** Contact — the closing CTA. Message on Spectrum + external links. */
export default function PortfolioContact({ data }: { data: PublicPortfolio }) {
  const p = data.profile || {};
  const name = (p.display_name || data.user?.username || 'this creator').split(' ')[0];
  const links = Object.entries(p.social_links || {}).filter(([, v]) => v) as [string, string][];

  return (
    <section id="contact" className="max-w-4xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
      <div className="text-center">
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">Contact</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Let’s work together.
        </h2>
        <p className="text-gray-500 mt-3 max-w-md mx-auto">
          Hire {name} through Spectrum Connect — verified profiles, milestone escrow, and secure payments built in.
        </p>

        <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
          <a
            href={data.user?.id ? `/client/collaborators/${data.user.id}` : '/signup'}
            className="inline-flex items-center gap-2 bg-cobalt text-white px-7 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 active:scale-[0.98] transition shadow-sm"
          >
            <i className="fa-regular fa-paper-plane" /> Message on Spectrum
          </a>
          {p.website && (
            <a
              href={p.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-7 py-3 rounded-xl font-semibold text-sm hover:border-gray-400 transition"
            >
              <i className="fa-solid fa-globe" /> Website
            </a>
          )}
        </div>

        {links.length > 0 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            {links.map(([key, url]) => {
              const meta = LINK_META[key] || { icon: 'fa-solid fa-link', label: key };
              return (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={meta.label}
                  title={meta.label}
                  className="w-11 h-11 rounded-full border border-gray-200 text-gray-500 hover:text-cobalt hover:border-cobalt flex items-center justify-center transition"
                >
                  <i className={meta.icon} />
                </a>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-300 mt-12">
          Portfolio powered by{' '}
          <a href="/" className="font-semibold text-gray-400 hover:text-cobalt transition">Spectrum Connect</a>
        </p>
      </div>
    </section>
  );
}
