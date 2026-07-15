import type { PublicPortfolio } from '@/lib/api';
import PortfolioHero from './PortfolioHero';
import PortfolioExperience from './PortfolioExperience';
import PortfolioReviews from './PortfolioReviews';
import PortfolioContact from './PortfolioContact';
import VisualTemplate from './templates/VisualTemplate';
import MotionTemplate from './templates/MotionTemplate';
import MinimalTemplate from './templates/MinimalTemplate';
import EditorialTemplate from './templates/EditorialTemplate';
import GridTemplate from './templates/GridTemplate';

/**
 * The full public portfolio page: Hero → Featured Work → Experience →
 * Reviews → Contact. Only Featured Work varies by template — adding a new
 * template later is one file + one switch case.
 */
export default function PortfolioPublicView({ data }: { data: PublicPortfolio }) {
  const template = data.profile?.portfolio_template || 'visual';
  const handle = data.profile?.handle || data.user?.username || '';
  const projects = [...(data.projects || [])].sort(
    (a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0) || a.order - b.order,
  );

  let work: React.ReactNode = null;
  switch (template) {
    case 'motion':
      work = <MotionTemplate projects={projects} handle={handle} />;
      break;
    case 'minimal':
      work = <MinimalTemplate projects={projects} handle={handle} />;
      break;
    case 'editorial':
      work = <EditorialTemplate projects={projects} handle={handle} />;
      break;
    case 'grid':
      work = <GridTemplate projects={projects} handle={handle} />;
      break;
    case 'visual':
    default:
      work = <VisualTemplate projects={projects} handle={handle} />;
  }

  return (
    <div className="portfolio-print-root bg-white min-h-screen">
      <PortfolioHero data={data} />

      {/* Featured work */}
      {projects.length > 0 && (
        <section className="max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-16 border-b border-gray-100">
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-8">Selected Work</p>
          {work}
        </section>
      )}

      <PortfolioExperience
        experience={data.experience || []}
        education={data.education || []}
        certifications={data.certifications || []}
      />

      <PortfolioReviews reviews={data.reviews} />

      <PortfolioContact data={data} />
    </div>
  );
}
