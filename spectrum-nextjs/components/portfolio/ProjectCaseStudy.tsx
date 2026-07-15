import type { PortfolioProject } from '@/lib/api';
import { formatMonthYear } from '@/lib/portfolio';
import MediaEmbed from './templates/MediaEmbed';

function mediaById(project: PortfolioProject, id?: string) {
  if (!id) return undefined;
  return (project.media || []).find(m => m.id === id);
}

/** Renders a project's rich case-study body block by block. Falls back to the
 * simple description + media grid when no blocks were authored — this is the
 * default view for every project created before the block editor shipped. */
export default function ProjectCaseStudy({ project }: { project: PortfolioProject }) {
  const meta = [project.category, project.client, formatMonthYear(project.completion_date)].filter(Boolean).join(' · ');
  const blocks = [...(project.content_blocks || [])].sort((a, b) => a.order - b.order);

  return (
    <article className="max-w-3xl mx-auto px-5 sm:px-6 py-14 sm:py-20">
      {/* Header */}
      <header className="mb-10">
        {project.is_featured && (
          <p className="text-[11px] font-bold tracking-widest text-amber-600 uppercase mb-3">★ Featured</p>
        )}
        <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-[1.08]">{project.title}</h1>
        {meta && <p className="text-sm text-gray-400 mt-4 font-medium">{meta}</p>}
        {project.external_link && (
          <a href={project.external_link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-bold text-cobalt hover:underline mt-4">
            Visit live site <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
          </a>
        )}
      </header>

      {blocks.length > 0 ? (
        <div className="space-y-8">
          {blocks.map(b => {
            switch (b.type) {
              case 'text':
                return b.text ? (
                  <p key={b.id} className="text-base sm:text-lg text-gray-700 leading-relaxed whitespace-pre-line">{b.text}</p>
                ) : null;
              case 'quote':
                return b.text ? (
                  <blockquote key={b.id} className="border-l-4 border-cobalt/30 pl-6 py-1">
                    <p className="text-xl sm:text-2xl font-semibold text-gray-800 leading-snug italic">“{b.text}”</p>
                    {b.attribution && <cite className="block text-sm text-gray-400 mt-3 not-italic">— {b.attribution}</cite>}
                  </blockquote>
                ) : null;
              case 'image':
              case 'video': {
                const m = mediaById(project, b.media_id);
                return m ? <MediaEmbed key={b.id} media={m} className="w-full rounded-2xl shadow-sm" /> : null;
              }
              case 'before_after': {
                const before = mediaById(project, b.before_media_id);
                const after = mediaById(project, b.after_media_id);
                if (!before && !after) return null;
                return (
                  <div key={b.id} className="grid grid-cols-2 gap-3">
                    <div>
                      {before && <MediaEmbed media={before} className="w-full rounded-xl aspect-square object-cover" />}
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-2 text-center">Before</p>
                    </div>
                    <div>
                      {after && <MediaEmbed media={after} className="w-full rounded-xl aspect-square object-cover" />}
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-2 text-center">After</p>
                    </div>
                  </div>
                );
              }
              default:
                return null;
            }
          })}
        </div>
      ) : (
        <div className="space-y-8">
          {project.description && (
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed whitespace-pre-line">{project.description}</p>
          )}
          {[...(project.media || [])].sort((a, b) => a.order - b.order).map(m => (
            <MediaEmbed key={m.id} media={m} className="w-full rounded-2xl shadow-sm" />
          ))}
        </div>
      )}
    </article>
  );
}
