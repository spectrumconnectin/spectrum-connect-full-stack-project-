/**
 * Shared loading visuals used by route-level loading.tsx files.
 *
 * Server-renderable (no hooks) so Next.js can stream them instantly
 * while the route chunk + data load. Uses the existing .sc-skeleton
 * shimmer utility from globals.css.
 */

/** Full-screen branded loader — initial site load / auth transitions. */
export function BrandedLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      <div className="relative flex items-center justify-center">
        {/* Pulsing halo */}
        <span className="absolute w-24 h-24 rounded-3xl bg-cobalt/10 animate-ping" style={{ animationDuration: '1.6s' }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/spectrum-logo.svg"
          alt="Spectrum Connect"
          className="w-16 h-16 rounded-2xl shadow-lg relative"
        />
      </div>
      <p className="mt-6 text-sm font-semibold text-gray-700">Spectrum Connect</p>
      <div className="mt-4 w-40 h-1 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-cobalt loading-bar" />
      </div>
      <style>{`
        .loading-bar { animation: loadbar 1.1s ease-in-out infinite; }
        @keyframes loadbar { 0% { transform: translateX(-120%) } 100% { transform: translateX(420%) } }
      `}</style>
    </div>
  );
}

/** Dashboard-style skeleton — hero band, stat cards, list rows. */
export function DashboardSkeleton() {
  return (
    <div className="animate-in fade-in">
      {/* Hero band */}
      <div className="sc-skeleton h-44 rounded-3xl mb-8" />
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="sc-skeleton h-3 w-1/2 mb-3" />
            <div className="sc-skeleton h-7 w-2/3" />
          </div>
        ))}
      </div>
      {/* Content rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="sc-skeleton h-4 w-1/3 mb-3" />
              <div className="sc-skeleton h-3 w-2/3 mb-2" />
              <div className="sc-skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[0, 1].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="sc-skeleton h-4 w-1/2 mb-3" />
              <div className="sc-skeleton h-3 w-full mb-2" />
              <div className="sc-skeleton h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Centered minimal spinner — auth pages and small flows. */
export function CenteredSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 text-sm">Loading…</p>
    </div>
  );
}
