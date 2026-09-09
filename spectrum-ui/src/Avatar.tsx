import * as React from 'react';

// Ported verbatim from the app's components/Avatar.tsx so a generated design
// and the shipping app pick the same gradient for the same name.
const GRADS: [string, string][] = [
  ['#f97316', '#ec4899'],
  ['#06b6d4', '#3b82f6'],
  ['#10b981', '#06b6d4'],
  ['#8b5cf6', '#ec4899'],
  ['#f59e0b', '#ef4444'],
  ['#3b82f6', '#8b5cf6'],
];

function gradFor(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 31) % GRADS.length;
  return GRADS[h];
}

export interface AvatarProps {
  /** Full name. Initials and the gradient are both derived from it. */
  name?: string;
  /** Pixel diameter. */
  size?: number;
  /** Photo URL. Falls back to initials when absent or broken. */
  src?: string;
}

/**
 * A person, as initials on a gradient — or their photo when there is one.
 *
 * The gradient is chosen by hashing the name, so the same person is always the
 * same colour without any colour being stored.
 */
export function Avatar({ name = 'A', size = 32, src }: AvatarProps) {
  const [c1, c2] = gradFor(name);
  const init = name.split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flex: 'none' }}
      />
    );
  }

  return (
    <div
      aria-label={name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg,${c1},${c2})`,
        color: '#fff',
        fontWeight: 600,
        fontSize: Math.round(size * 0.38),
        display: 'grid',
        placeItems: 'center',
        flex: 'none',
      }}
    >
      {init}
    </div>
  );
}

export interface PresenceDotProps {
  online?: boolean;
  /** Shown next to the dot when given, e.g. "Last seen 2 days ago". */
  label?: string;
}

/** Online / offline, as the talent cards and profile header show it. */
export function PresenceDot({ online, label }: PresenceDotProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
      <span
        className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-gray-300'}`}
        aria-hidden
      />
      {label ?? (online ? 'Online' : 'Offline')}
    </span>
  );
}
