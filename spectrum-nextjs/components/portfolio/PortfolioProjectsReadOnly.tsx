'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { portfolioBuilder, type PublicPortfolio } from '@/lib/api';
import VisualTemplate from './templates/VisualTemplate';
import MotionTemplate from './templates/MotionTemplate';
import MinimalTemplate from './templates/MinimalTemplate';
import EditorialTemplate from './templates/EditorialTemplate';
import GridTemplate from './templates/GridTemplate';

/**
 * Read-only rich projects view (client-side fetch) — used on the client-facing
 * collaborator page. Renders the creator's chosen template + a link to their
 * full public portfolio.
 */
export default function PortfolioProjectsReadOnly({ username }: { username: string }) {
  const [data, setData] = useState<PublicPortfolio | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!username) return;
    portfolioBuilder.getPublic(username)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [username]);

  if (!loaded) return <div className="py-8 text-center text-gray-400 text-sm">Loading portfolio…</div>;

  const projects = [...(data?.projects || [])].sort(
    (a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0) || a.order - b.order,
  );

  if (data?.locked) {
    return (
      <div className="py-10 text-center">
        <i className="fa-solid fa-lock text-2xl text-gray-200 mb-2 block" />
        <p className="text-sm text-gray-400">This portfolio is private.</p>
      </div>
    );
  }

  if (!data?.published || projects.length === 0) {
    return (
      <div className="py-10 text-center">
        <i className="fa-regular fa-folder-open text-2xl text-gray-200 mb-2 block" />
        <p className="text-sm text-gray-400">No portfolio projects yet.</p>
      </div>
    );
  }

  const template = data.profile?.portfolio_template || 'visual';
  const handle = data.profile?.handle || username;

  return (
    <div>
      {template === 'motion' ? (
        <MotionTemplate projects={projects} handle={handle} />
      ) : template === 'minimal' ? (
        <MinimalTemplate projects={projects} handle={handle} />
      ) : template === 'editorial' ? (
        <EditorialTemplate projects={projects} handle={handle} />
      ) : template === 'grid' ? (
        <GridTemplate projects={projects} handle={handle} />
      ) : (
        <VisualTemplate projects={projects} handle={handle} />
      )}
      <div className="mt-6 text-center">
        <Link
          href={`/portfolio/${encodeURIComponent(username)}`}
          target="_blank"
          className="inline-flex items-center gap-2 text-sm font-bold text-cobalt hover:underline"
        >
          View full portfolio <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
        </Link>
      </div>
    </div>
  );
}
