import { formatMonthYear } from '@/lib/portfolio';

type Entry = Record<string, unknown>;

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);

/**
 * Experience / credentials — work history, education, certifications.
 * Renders nothing if the creator has none (keeps the page clean).
 */
export default function PortfolioExperience({
  experience = [],
  education = [],
  certifications = [],
}: {
  experience?: Entry[];
  education?: Entry[];
  certifications?: Entry[];
}) {
  if (!experience.length && !education.length && !certifications.length) return null;

  return (
    <section className="max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-16 border-b border-gray-100">
      <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-8">Experience</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Work history */}
        {experience.length > 0 && (
          <div className="space-y-6">
            {experience.map((e, i) => {
              const title = str(e.title) || str(e.position) || str(e.role);
              const company = str(e.company) || str(e.organization);
              const start = str(e.start_date); const end = str(e.end_date);
              const desc = str(e.description);
              return (
                <div key={i} className="relative pl-6">
                  <span className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-gray-900" />
                  <span className="absolute left-[4px] top-5 bottom-[-14px] w-px bg-gray-200 last:hidden" />
                  <h3 className="font-bold text-gray-900 leading-tight">{title || 'Role'}</h3>
                  {company && <p className="text-sm text-gray-500 mt-0.5">{company}</p>}
                  {(start || end) && (
                    <p className="text-xs text-gray-400 mt-1">
                      {formatMonthYear(start)} — {end ? formatMonthYear(end) : 'Present'}
                    </p>
                  )}
                  {desc && <p className="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-3">{desc}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* Education + certifications */}
        {(education.length > 0 || certifications.length > 0) && (
          <div className="space-y-8">
            {education.length > 0 && (
              <div>
                <p className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-graduation-cap text-gray-300" /> Education
                </p>
                <div className="space-y-4">
                  {education.map((e, i) => (
                    <div key={i}>
                      <p className="font-semibold text-gray-800 text-sm">{str(e.degree) || str(e.field_of_study) || 'Degree'}</p>
                      <p className="text-sm text-gray-400">{str(e.institution) || str(e.school)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {certifications.length > 0 && (
              <div>
                <p className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-certificate text-gray-300" /> Certifications
                </p>
                <div className="space-y-3">
                  {certifications.map((c, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <i className="fa-solid fa-check text-emerald-500 text-xs" />
                      <div>
                        <p className="font-semibold text-gray-800 text-sm leading-tight">{str(c.name) || str(c.title) || 'Certification'}</p>
                        {str(c.issuer) && <p className="text-xs text-gray-400">{str(c.issuer)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
