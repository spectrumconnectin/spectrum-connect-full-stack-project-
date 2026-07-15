import type { Metadata } from 'next';
import LottieIcon from '@/components/LottieIcon';

export const metadata: Metadata = {
  title: 'Animated Icons — Preview',
  robots: { index: false, follow: false },
};

// The 14 supplied Lottie icons + where each is proposed to live in the product.
const ICONS: { file: string; name: string; use: string }[] = [
  { file: 'star-medal',   name: 'Star Medal',   use: 'Reviews · verified & top-rated badges' },
  { file: 'party',        name: 'Party',        use: 'Success — project complete / payout sent' },
  { file: 'dollar-up',    name: 'Dollar Up',    use: 'Earnings & payout screens' },
  { file: 'discount',     name: 'Discount',     use: 'Fees / pricing — “12%, half of Fiverr”' },
  { file: 'heart',        name: 'Heart',        use: 'Like / favourite a creator or portfolio' },
  { file: 'add-like',     name: 'Add Like',     use: 'Save creator · add to favourites' },
  { file: 'two-users-ai', name: '2 Users (AI)', use: 'AI matching · build complete teams' },
  { file: 'repeat',       name: 'Repeat',       use: 'Rehire · repeat project' },
  { file: 'right',        name: 'Right',        use: 'Next · carousel forward' },
  { file: 'left',         name: 'Left',         use: 'Back · carousel previous' },
  { file: 'right-up',     name: 'Right Up',     use: 'Trending up · growth' },
  { file: 'right-down',   name: 'Right Down',   use: 'Trending down' },
  { file: 'left-up',      name: 'Left Up',      use: 'Corner / directional' },
  { file: 'left-down',    name: 'Left Down',    use: 'Corner / directional' },
];

export default function IconsPreviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-14 px-5">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">
            <i className="fa-solid fa-wand-magic-sparkles text-cobalt" /> Internal Preview
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Animated Icons</h1>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto">
            All 14 Lottie icons, live. Hover any tile to replay it. The label under each shows the
            product location I’d wire it into — tell me which ones to place and where.
          </p>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {ICONS.map(icon => (
            <div key={icon.file}
              className="group flex flex-col items-center text-center bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-cobalt/40 transition">
              <div className="w-20 h-20 flex items-center justify-center rounded-xl bg-gray-50 group-hover:bg-blue-50 transition mb-4">
                <LottieIcon src={`/animations/${icon.file}.json`} size={56} loop autoplay />
              </div>
              <p className="font-bold text-gray-900 text-sm">{icon.name}</p>
              <p className="text-xs text-gray-400 mt-1 leading-snug">{icon.use}</p>
              <code className="text-[10px] text-gray-300 mt-2">{icon.file}.json</code>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          Tip: hover to preview. In the product they’ll autoplay on the relevant moment (or on scroll into view).
        </p>
      </div>
    </div>
  );
}
