'use client';

import { useEffect, useRef, useState } from 'react';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';

/** #rrggbb / #rgb → normalized [r,g,b] (0–1), or null if unparseable. */
function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  if (full.length !== 6) return null;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return null;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Recolor every dark (near-black) stroke/fill to `rgb`; leaves whites/others. */
function recolor(node: unknown, rgb: [number, number, number]): void {
  if (Array.isArray(node)) { node.forEach(n => recolor(n, rgb)); return; }
  if (node && typeof node === 'object') {
    const o = node as Record<string, any>;
    if ((o.ty === 'st' || o.ty === 'fl') && o.c && o.c.a === 0 && Array.isArray(o.c.k)) {
      const [r, g, b] = o.c.k;
      if (r < 0.16 && g < 0.16 && b < 0.16) o.c.k = [rgb[0], rgb[1], rgb[2], o.c.k[3] ?? 1];
    }
    for (const k in o) recolor(o[k], rgb);
  }
}

/**
 * Renders a Lottie animation from /public/animations. Lazy-fetches the JSON so
 * the (often large) animation data never ships in the page bundle.
 *
 * playOnView:  play once when scrolled into view (great for icon grids — a
 *              single delightful pass, then it rests). Also replays on hover.
 * playOnHover: stay at rest until hovered.
 * Otherwise it autoplays and loops.
 */
export default function LottieIcon({
  src,
  size = 64,
  loop = true,
  autoplay = true,
  playOnHover = false,
  playOnView = false,
  color,
  className = '',
}: {
  src: string;
  size?: number;
  loop?: boolean;
  autoplay?: boolean;
  playOnHover?: boolean;
  playOnView?: boolean;
  color?: string;
  className?: string;
}) {
  const [data, setData] = useState<object | null>(null);
  const ref = useRef<LottieRefCurrentProps>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const played = useRef(false);

  useEffect(() => {
    let active = true;
    fetch(src)
      .then(r => r.json())
      .then(d => {
        if (!active) return;
        const rgb = color ? hexToRgb(color) : null;
        if (rgb) recolor(d, rgb);
        setData(d);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [src, color]);

  // Play once when the icon scrolls into view.
  useEffect(() => {
    if (!playOnView || !data) return;
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !played.current) {
          played.current = true;
          ref.current?.goToAndPlay(0);
        }
      });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [playOnView, data]);

  const dim = { width: size, height: size };
  const gated = playOnHover || playOnView;

  if (!data) return <div style={dim} className={className} aria-hidden />;

  return (
    <div
      ref={boxRef}
      style={dim}
      className={className}
      onMouseEnter={gated ? () => { ref.current?.goToAndPlay(0); } : undefined}
    >
      <Lottie
        lottieRef={ref}
        animationData={data}
        loop={gated ? false : loop}
        autoplay={gated ? false : autoplay}
        style={dim}
      />
    </div>
  );
}
