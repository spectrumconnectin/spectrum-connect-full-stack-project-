/**
 * Client-intent SEO landing categories — the surface prospective *clients*
 * (people who want to hire) search for: "hire a videographer", "hire a
 * designer", etc. Each entry maps to one of the platform's real project
 * categories (see the client "Create Project" taxonomy) and lists only skills
 * that actually exist in the app's skill suggestions — no invented services.
 *
 * Single source of truth for /hire, /hire/[category], and the sitemap.
 */

export interface HireCategory {
  /** URL slug — role-based for search intent ("designers" not "design"). */
  slug: string;
  /** Singular role noun for headlines: "Hire a {role}". */
  role: string;
  /** Plural role noun for listing copy. */
  rolePlural: string;
  /** The platform's real project category this maps to. */
  platformCategory: string;
  /** FontAwesome icon (matches the site's icon set). */
  icon: string;
  /** One-line value line used on the hub cards + as the meta description lead. */
  blurb: string;
  /** Real, in-app skills clients can brief for in this category. */
  skills: string[];
  /** A few concrete deliverables clients commonly hire for. */
  deliverables: string[];
}

export const HIRE_CATEGORIES: HireCategory[] = [
  {
    slug: 'videographers',
    role: 'Videographer',
    rolePlural: 'videographers',
    platformCategory: 'Film & Video',
    icon: 'fa-video',
    blurb: 'Shoot, edit, and finish video — from brand films to social cutdowns.',
    skills: ['Videography', 'Video Editing', 'Motion Graphics', 'Film Direction', 'VFX', 'Colour Grading'],
    deliverables: ['Brand & promo films', 'Event coverage', 'Social media cutdowns', 'Highlight reels', 'Edited final videos'],
  },
  {
    slug: 'designers',
    role: 'Designer',
    rolePlural: 'designers',
    platformCategory: 'Design',
    icon: 'fa-pen-nib',
    blurb: 'Logos, graphics, and visual systems built by verified designers.',
    skills: ['Graphic Design', 'Creative Direction', 'Illustration', 'Brand Strategy'],
    deliverables: ['Logo design', 'Marketing graphics', 'Pitch decks', 'Packaging', 'Social templates'],
  },
  {
    slug: 'photographers',
    role: 'Photographer',
    rolePlural: 'photographers',
    platformCategory: 'Photography',
    icon: 'fa-camera',
    blurb: 'Product, brand, and event photography with edited final galleries.',
    skills: ['Photography', 'Photo Editing', 'Creative Direction'],
    deliverables: ['Product photography', 'Brand shoots', 'Event photography', 'Headshots', 'Edited galleries'],
  },
  {
    slug: 'brand-designers',
    role: 'Brand Designer',
    rolePlural: 'brand designers',
    platformCategory: 'Branding',
    icon: 'fa-swatchbook',
    blurb: 'Full brand identities — strategy, logo, and guidelines in one place.',
    skills: ['Brand Strategy', 'Graphic Design', 'Creative Direction', 'Illustration'],
    deliverables: ['Brand identity', 'Logo & wordmark', 'Brand guidelines', 'Visual systems', 'Rebrands'],
  },
  {
    slug: 'web-designers',
    role: 'Web & UI/UX Designer',
    rolePlural: 'web and product designers',
    platformCategory: 'Digital & Interactive',
    icon: 'fa-laptop-code',
    blurb: 'Website and product design — UI, UX, and interactive prototypes.',
    skills: ['UI/UX Design', 'Graphic Design', 'Motion Graphics'],
    deliverables: ['Website design', 'App UI/UX', 'Interactive prototypes', 'Design systems', 'Landing pages'],
  },
  {
    slug: 'writers',
    role: 'Writer',
    rolePlural: 'writers',
    platformCategory: 'Writing & Content',
    icon: 'fa-feather-pointed',
    blurb: 'Copy, scripts, and content from writers who match your voice.',
    skills: ['Copywriting', 'Scriptwriting', 'Social Media'],
    deliverables: ['Website copy', 'Video scripts', 'Blog & articles', 'Ad copy', 'Content strategy'],
  },
  {
    slug: 'audio-producers',
    role: 'Music & Audio Producer',
    rolePlural: 'music and audio producers',
    platformCategory: 'Music & Audio',
    icon: 'fa-music',
    blurb: 'Music, sound design, mixing, and voiceover for any project.',
    skills: ['Music Production', 'Sound Design', 'Voice Acting'],
    deliverables: ['Original music', 'Sound design', 'Mixing & mastering', 'Voiceover', 'Podcast editing'],
  },
  {
    slug: 'animators',
    role: 'Animator',
    rolePlural: 'animators',
    platformCategory: 'Film & Video',
    icon: 'fa-clapperboard',
    blurb: '2D, 3D, and motion graphics for explainers, ads, and titles.',
    skills: ['Animation', 'Motion Graphics', '3D Modeling', 'VFX'],
    deliverables: ['Explainer videos', 'Motion graphics', '3D animation', 'Title sequences', 'Animated ads'],
  },
];

export function getHireCategory(slug: string): HireCategory | undefined {
  return HIRE_CATEGORIES.find((c) => c.slug === slug);
}
