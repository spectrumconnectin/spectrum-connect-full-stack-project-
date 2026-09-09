import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tighten padding for dense lists. */
  compact?: boolean;
  /** Lift the border to cobalt on hover — for cards that are links. */
  interactive?: boolean;
  children?: React.ReactNode;
}

/** The surface everything in the product sits on: white, hairline border, soft shadow. */
export function Card({ compact, interactive, children, className = '', ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={[
        'bg-white rounded-2xl border border-gray-200 shadow-sm',
        compact ? 'p-4' : 'p-4 sm:p-6',
        interactive ? 'hover:border-cobalt transition cursor-pointer' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

export interface SectionHeaderProps {
  /** Font Awesome class, e.g. `fa-solid fa-circle-info`. */
  icon: string;
  title: string;
  subtitle?: string;
  /** Tailwind classes for the icon tile, e.g. `bg-blue-100 text-cobalt`. */
  iconClass?: string;
}

/**
 * The icon + title + subtitle row that opens each section of a form or panel.
 * Scales down a step on mobile so a multi-section form still fits the fold.
 */
export function SectionHeader({ icon, title, subtitle, iconClass = 'bg-blue-100 text-cobalt' }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClass}`}>
        <i className={icon} aria-hidden />
      </div>
      <div className="min-w-0">
        <h2 className="text-base sm:text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}
