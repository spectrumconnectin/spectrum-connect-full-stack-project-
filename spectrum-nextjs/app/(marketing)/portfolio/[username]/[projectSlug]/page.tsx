import Link from 'next/link';
import type { Metadata } from 'next';
import { getPublicProject, projectCover, decodeParam } from '@/lib/portfolio';
import ProjectCaseStudy from '@/components/portfolio/ProjectCaseStudy';
import ViewBeacon from '@/components/portfolio/ViewBeacon';

const BASE = 'https://spectrumconect.com';

export const revalidate = 60;

export async function generateMetadata(
  { params }: { params: { username: string; projectSlug: string } },
): Promise<Metadata> {
  const data = await getPublicProject(params.username, params.projectSlug);
  if (!data || !data.published || !data.project || !data.owner) {
    return { title: 'Project — Spectrum Connect', robots: { index: false } };
  }
  const { project, owner } = data;
  const title = `${project.title} — ${owner.display_name}`;
  const description = (project.description || `A case study by ${owner.display_name} on Spectrum Connect.`).slice(0, 160);
  const url = `${BASE}/portfolio/${encodeURIComponent(owner.handle)}/${encodeURIComponent(project.slug || project.id)}`;
  const image = projectCover(project) || owner.profile_picture;
  return {
    title,
    description,
    openGraph: {
      title, description, url, type: 'article', siteName: 'Spectrum Connect',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
    alternates: { canonical: url },
  };
}

export default async function PublicProjectPage(
  { params }: { params: { username: string; projectSlug: string } },
) {
  const data = await getPublicProject(params.username, params.projectSlug);

  if (data?.locked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <i className="fa-solid fa-lock text-2xl text-gray-300" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">This portfolio is private</h1>
          <p className="text-sm text-gray-500 mb-6">Ask the creator to share access, or view the portfolio to unlock it.</p>
          <Link href={`/portfolio/${encodeURIComponent(decodeParam(params.username))}`}
            className="inline-flex items-center gap-2 bg-cobalt text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition">
            Go to portfolio
          </Link>
        </div>
      </div>
    );
  }

  if (!data || !data.published || !data.project || !data.owner) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <i className="fa-regular fa-folder-open text-2xl text-gray-300" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Project not found</h1>
          <p className="text-sm text-gray-500 mb-6">This case study doesn’t exist or may have moved.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-cobalt text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition">
            Explore Spectrum Connect
          </Link>
        </div>
      </div>
    );
  }

  const { project, owner } = data;
  const portfolioUrl = `/portfolio/${encodeURIComponent(owner.handle)}`;

  const creativeWorkJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    description: project.description || undefined,
    url: `${BASE}/portfolio/${encodeURIComponent(owner.handle)}/${encodeURIComponent(project.slug || project.id)}`,
    image: projectCover(project) || undefined,
    dateCreated: project.completion_date || undefined,
    author: {
      '@type': 'Person',
      name: owner.display_name,
      url: `${BASE}${portfolioUrl}`,
      image: owner.profile_picture || undefined,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(creativeWorkJsonLd) }} />
      <ViewBeacon username={params.username} projectSlug={params.projectSlug} />
      <div className="bg-white min-h-screen">
        {/* Back to portfolio */}
        <div className="border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-5 sm:px-6 py-4">
            <Link href={portfolioUrl} className="inline-flex items-center gap-2.5 text-sm font-semibold text-gray-500 hover:text-cobalt transition">
              {owner.profile_picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={owner.profile_picture} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                  <i className="fa-solid fa-arrow-left" />
                </span>
              )}
              {owner.display_name}’s portfolio
            </Link>
          </div>
        </div>

        <ProjectCaseStudy project={project} />
      </div>
    </>
  );
}
