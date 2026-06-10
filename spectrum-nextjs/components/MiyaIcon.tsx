'use client';

import { useId } from 'react';

/**
 * MiyaMark — Spectrum Connect's AI assistant identity.
 *
 * A rounded-square badge with the Spectrum violet→cobalt→sky gradient,
 * a friendly face (two soft eyes + smile) and a four-point spark —
 * the "intelligence" accent used across Miya surfaces.
 *
 * Pure inline SVG: scales crisply at any size, no asset request,
 * unique gradient ids per instance so multiple marks can coexist.
 */
export default function MiyaMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  const uid = useId();
  const bg = `miya-bg-${uid}`;
  const sheen = `miya-sheen-${uid}`;
  const spark = `miya-spark-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Miya AI"
    >
      <defs>
        <linearGradient id={bg} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C3AED" />
          <stop offset="0.52" stopColor="#195AD7" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
        <radialGradient id={sheen} cx="0.28" cy="0.18" r="0.9">
          <stop stopColor="#FFFFFF" stopOpacity="0.38" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={spark} x1="33" y1="7" x2="42" y2="17" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE68A" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>

      {/* Badge */}
      <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${bg})`} />
      <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${sheen})`} />

      {/* Eyes — soft vertical pills, slightly tilted inward for warmth */}
      <rect x="14.6" y="19" width="4.8" height="9.4" rx="2.4" fill="#FFFFFF" />
      <rect x="28.6" y="19" width="4.8" height="9.4" rx="2.4" fill="#FFFFFF" />

      {/* Smile */}
      <path
        d="M17.4 32.6c1.9 2.5 4.1 3.7 6.6 3.7s4.7-1.2 6.6-3.7"
        stroke="#FFFFFF"
        strokeWidth="2.7"
        strokeLinecap="round"
        fill="none"
      />

      {/* Spark — the "AI" accent */}
      <path
        d="M37.2 7.4c.62 2.9 2 4.28 4.9 4.9-2.9.62-4.28 2-4.9 4.9-.62-2.9-2-4.28-4.9-4.9 2.9-.62 4.28-2 4.9-4.9z"
        fill={`url(#${spark})`}
      />
      {/* Tiny companion spark */}
      <circle cx="33" cy="14.6" r="1.1" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
}
