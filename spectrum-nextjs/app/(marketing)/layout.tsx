import MarketingEffects from '@/components/MarketingEffects';
import PageTransition from '@/components/PageTransition';

// Shared layout for all marketing pages.
// MarketingEffects replaces marketing.js:
//   scroll-reveal, navbar elevation, smooth anchor scroll.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingEffects />
      <PageTransition>{children}</PageTransition>
    </>
  );
}
