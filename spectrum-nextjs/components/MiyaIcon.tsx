'use client';

import { useId } from 'react';

/**
 * MiyaMark — Spectrum Connect's AI assistant identity.
 *
 * Circular badge with violet→cyan gradient, friendly face,
 * dashed neural ring, and a four-point spark above the eyes.
 *
 * Pure inline SVG: scales crisply at any size, no asset request,
 * unique gradient ids per instance so multiple marks can coexist.
 */
export default function MiyaMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  const uid = useId();
  const grad = `miya-grad-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Miya AI"
    >
      <defs>
        <linearGradient id={grad} x1="64" y1="64" x2="448" y2="448" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6C63FF" />
          <stop offset="100%" stopColor="#00D4FF" />
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle cx="256" cy="256" r="220" fill={`url(#${grad})`} />

      {/* AI face */}
      <circle cx="190" cy="220" r="18" fill="white" />
      <circle cx="322" cy="220" r="18" fill="white" />

      {/* Smile */}
      <path
        d="M180 310C205 340 307 340 332 310"
        stroke="white"
        strokeWidth="18"
        strokeLinecap="round"
      />

      {/* Neural ring */}
      <circle
        cx="256"
        cy="256"
        r="170"
        stroke="white"
        strokeWidth="8"
        strokeDasharray="10 16"
        opacity="0.5"
      />

      {/* Spark */}
      <path
        d="M256 120L272 160L312 176L272 192L256 232L240 192L200 176L240 160L256 120Z"
        fill="white"
      />
    </svg>
  );
}
