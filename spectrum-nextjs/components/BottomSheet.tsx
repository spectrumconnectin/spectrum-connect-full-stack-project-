'use client';

import { useEffect } from 'react';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Optional footer pinned below the scrollable body — e.g. a primary CTA button. */
  footer?: React.ReactNode;
}

/**
 * BottomSheet — shared sheet/modal wrapper.
 *
 * Slides up from the bottom edge on mobile (drag-handle affordance, rounded
 * top corners); centers as a compact modal on sm+ screens. Generalizes the
 * ad-hoc `flex items-end sm:items-center` + `rounded-t-2xl sm:rounded-2xl` +
 * `bg-slate-900/50 backdrop-blur-md` pattern that was previously hand-rolled
 * per-instance (ProjectWorkspace.tsx, PortfolioProjectEditor.tsx).
 */
export default function BottomSheet({ open, onClose, title, children, footer }: BottomSheetProps) {
  // Lock page scroll while open; close on Escape.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" onClick={onClose} />
      <div className="sc-sheet-panel relative bg-white rounded-t-[26px] sm:rounded-2xl shadow-2xl w-full sm:max-w-md z-10 flex flex-col max-h-[88vh]">
        {/* Drag handle — mobile only, purely visual affordance */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center flex-shrink-0" aria-hidden="true">
          <div className="w-9 h-1 bg-gray-200 rounded-full" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-5 sm:px-6 pt-2 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-100 flex-shrink-0">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">{title}</h3>
            <button onClick={onClose} aria-label="Close"
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition">
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 sm:py-5">
          {children}
        </div>

        {footer && (
          <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
